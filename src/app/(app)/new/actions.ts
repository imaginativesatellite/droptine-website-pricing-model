"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { computeQuote, type PricingAnswers } from "@/lib/pricing";
import { generateScopeSummary } from "@/lib/anthropic";
import { generateAccessCode } from "@/lib/code";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";
import { notifyAdmins, sendProposalToStaff } from "@/lib/email";
import { appUrl, proposalUrl } from "@/lib/quote";

type RawAnswers = Record<string, string | boolean | string[] | undefined>;

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const c = generateAccessCode();
    const existing = await prisma.quote.findUnique({ where: { code: c } });
    if (!existing) return c;
  }
  return generateAccessCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

export async function createQuote(answers: RawAnswers): Promise<void> {
  const user = await requireUser();

  const proposalName = String(answers.proposalName ?? "").trim();
  if (!proposalName) throw new Error("A project / business name is required.");

  const pricing = answers as PricingAnswers;
  const result = computeQuote(pricing);

  // Group quotes under the end client owned by this user.
  let client = await prisma.client.findFirst({
    where: { ownerId: user.id, name: proposalName },
  });
  if (!client) {
    client = await prisma.client.create({
      data: { name: proposalName, ownerId: user.id },
    });
  }

  const code = await uniqueCode();
  const scopeSummary = await generateScopeSummary({
    proposalName,
    answers: pricing,
  });

  const answersJson = JSON.parse(JSON.stringify(pricing)) as Prisma.InputJsonValue;

  const quote = await prisma.quote.create({
    data: {
      code,
      clientId: client.id,
      createdById: user.id,
      proposalName,
      answers: answersJson,
      status: result.requiresCustomQuote ? "CUSTOM_PENDING" : "PROPOSAL",
      computedTotal: result.total,
      monthly: result.monthly,
      customReasons: result.reasons,
      scopeSummary,
    },
  });

  const manageUrl = `${appUrl()}/quote/${quote.id}`;

  if (result.requiresCustomQuote) {
    // No auto proposal — notify admins to review & approve.
    await notifyAdmins({
      proposalName,
      staffEmail: user.email ?? "",
      isCustom: true,
      code,
      reasons: result.reasons,
      manageUrl,
    });
  } else {
    // Generate the PDF (contact pulled from the rep), email the requester, notify admins.
    const full = await prisma.quote.findUniqueOrThrow({
      where: { id: quote.id },
      include: { createdBy: true, client: true },
    });
    const pdf = await renderProposalPdf(buildProposalData(full));

    await sendProposalToStaff({
      staffEmail: user.email ?? "",
      proposalName,
      total: result.total,
      code,
      proposalUrl: proposalUrl(code),
      pdf,
    });
    await notifyAdmins({
      proposalName,
      staffEmail: user.email ?? "",
      isCustom: false,
      total: result.total,
      code,
      manageUrl,
    });
  }

  redirect(`/quote/${quote.id}`);
}
