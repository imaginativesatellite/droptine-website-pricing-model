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

export type CreateResult = { error: string } | void;

export async function createQuote(answers: RawAnswers, assigneeId?: string): Promise<CreateResult> {
  const user = await requireUser();

  const proposalName = String(answers.proposalName ?? "").trim();
  if (!proposalName) return { error: "A client name is required." };

  // Admins may create a quote on behalf of (and assigned to) another user.
  let creatorId = user.id;
  let creatorEmail = user.email ?? "";
  if (assigneeId && user.role === "ADMIN" && assigneeId !== user.id) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (assignee) {
      creatorId = assignee.id;
      creatorEmail = assignee.email;
    }
  }

  const pricing = answers as PricingAnswers;
  const result = computeQuote(pricing);

  // 1) Persist the quote first — it's the source of truth. If this fails we
  //    return an inline error so the user can retry without losing their answers.
  let quote;
  try {
    let client = await prisma.client.findFirst({ where: { ownerId: creatorId, name: proposalName } });
    if (!client) {
      client = await prisma.client.create({ data: { name: proposalName, ownerId: creatorId } });
    }

    const code = await uniqueCode();
    const scopeSummary = await generateScopeSummary({ proposalName, answers: pricing });
    const answersJson = JSON.parse(JSON.stringify(pricing)) as Prisma.InputJsonValue;
    const lineItemsJson = result.lineItems as unknown as Prisma.InputJsonValue;

    quote = await prisma.quote.create({
      data: {
        code,
        clientId: client.id,
        createdById: creatorId,
        proposalName,
        answers: answersJson,
        lineItems: lineItemsJson,
        status: result.requiresCustomQuote ? "CUSTOM_PENDING" : "PROPOSAL",
        computedTotal: result.total,
        monthly: result.monthly,
        customReasons: result.reasons,
        scopeSummary,
      },
    });
  } catch (e) {
    console.error("createQuote: failed to save", e);
    return { error: "Couldn't save the quote — check your connection and try again." };
  }

  // 2) PDF + email are best-effort: a failure here never loses the saved quote.
  const manageUrl = `${appUrl()}/quote/${quote.id}`;
  try {
    if (result.requiresCustomQuote) {
      await notifyAdmins({
        proposalName, staffEmail: creatorEmail, isCustom: true, code: quote.code,
        reasons: result.reasons, manageUrl,
      });
    } else {
      const full = await prisma.quote.findUniqueOrThrow({
        where: { id: quote.id },
        include: { createdBy: true, client: true },
      });
      const pdf = await renderProposalPdf(buildProposalData(full));
      await sendProposalToStaff({
        staffEmail: creatorEmail, proposalName, total: result.total,
        code: quote.code, proposalUrl: proposalUrl(quote.code), pdf,
      });
      await notifyAdmins({
        proposalName, staffEmail: creatorEmail, isCustom: false, total: result.total,
        code: quote.code, manageUrl,
      });
      await prisma.quote.update({ where: { id: quote.id }, data: { emailStatus: "SENT", emailError: null } });
    }
  } catch (e) {
    console.error("createQuote: notification failed", e);
    await prisma.quote.update({
      where: { id: quote.id },
      data: { emailStatus: "FAILED", emailError: e instanceof Error ? e.message : String(e) },
    });
  }

  redirect(`/quote/${quote.id}`);
}
