"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { computeQuote, type PricingAnswers } from "@/lib/pricing";
import { generateScopeSummary } from "@/lib/anthropic";
import { generateAccessCode } from "@/lib/code";
import { renderProposalPdf } from "@/lib/pdf";
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

  const clientEmail = answers.clientEmail ? String(answers.clientEmail).trim() : null;
  const clientPhone = answers.clientPhone ? String(answers.clientPhone).trim() : null;

  const pricing = answers as PricingAnswers;
  const result = computeQuote(pricing);

  // Group quotes under a client (business) owned by this user.
  let client = await prisma.client.findFirst({
    where: { ownerId: user.id, name: proposalName },
  });
  if (!client) {
    client = await prisma.client.create({
      data: { name: proposalName, email: clientEmail, phone: clientPhone, ownerId: user.id },
    });
  }

  const code = await uniqueCode();
  const scopeSummary = await generateScopeSummary({
    proposalName,
    industry: answers.industry ? String(answers.industry) : undefined,
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
    // Generate the PDF, email the requester, and notify admins.
    const pdf = await renderProposalPdf({
      proposalName,
      clientName: answers.clientName ? String(answers.clientName) : null,
      clientEmail,
      clientPhone,
      code,
      scopeSummary,
      lineItems: result.lineItems,
      subtotal: result.total,
      discount: 0,
      total: result.total,
      monthly: result.monthly,
    });

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
