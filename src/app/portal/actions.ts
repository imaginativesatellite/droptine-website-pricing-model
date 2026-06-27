"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canUseClientPortal, readMarkup, computeClientPrice } from "@/lib/portal";
import { isPresentationMode } from "@/lib/presentation";
import { generateAccessCode, generatePublicCode } from "@/lib/code";
import type { PricingAnswers } from "@/lib/pricing";

export type SaveResult = { ok: true } | { error: string };

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const c = generateAccessCode();
    if (!(await prisma.quote.findUnique({ where: { code: c } }))) return c;
  }
  return generateAccessCode() + Date.now().toString(36).slice(-2).toUpperCase();
}
async function uniquePublicCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const c = generatePublicCode();
    if (!(await prisma.quote.findUnique({ where: { publicCode: c } }))) return c;
  }
  return generatePublicCode();
}

/**
 * "Save and Close" from the client portal. Persists a CLIENT-origin quote -
 * priced server-side from the same inputs the browser showed (never trusting a
 * client-sent total) - then the portal resets for the next client. No PDF/email:
 * these are instant, in-person quotes. A custom-quote answer set is saved as
 * CUSTOM_PENDING so it can later be "Requested from Luna Creative".
 */
export async function saveClientQuote(input: {
  answers: Record<string, unknown>;
  increments: number;
  discount: number;
}): Promise<SaveResult> {
  const user = await requireUser();
  if (!canUseClientPortal(user)) return { error: "This isn't available for your account." };
  if (!(await isPresentationMode())) return { error: "Presentation Mode is no longer active." };

  const proposalName = String(input.answers.proposalName ?? "").trim();
  if (!proposalName) return { error: "A business name is required." };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { markupWebsite: true, markupWebsiteIsPercent: true, markupMonthly: true, markupIncrement: true },
  });
  const markup = readMarkup({
    website: dbUser?.markupWebsite,
    websiteIsPercent: dbUser?.markupWebsiteIsPercent,
    monthly: dbUser?.markupMonthly,
    increment: dbUser?.markupIncrement,
  });
  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  const increments = Math.max(0, Math.min(20, Math.round(input.increments || 0)));
  const price = computeClientPrice(input.answers as PricingAnswers, markup, settings?.adjustmentPct ?? 0, increments);

  const build = price.requiresFollowUp ? 0 : price.build;
  // The discount is a dollar amount and can never push the price below zero.
  const discount = price.requiresFollowUp ? 0 : Math.max(0, Math.min(build, Math.round(input.discount || 0)));
  const monthly = price.requiresFollowUp ? 0 : price.monthly;

  try {
    let client = await prisma.client.findFirst({ where: { ownerId: user.id, name: proposalName } });
    if (!client) client = await prisma.client.create({ data: { name: proposalName, ownerId: user.id } });

    const answersJson = JSON.parse(JSON.stringify(input.answers)) as Prisma.InputJsonValue;
    const clientPricingJson = {
      lunaBase: price.lunaBuild,
      markup: markup.website,
      markupIsPercent: markup.websiteIsPercent,
      markupApplied: price.markupApplied,
      increments,
      incrementAmount: price.incrementAmount,
      monthlyMarkup: markup.monthly,
      discount,
    } as unknown as Prisma.InputJsonValue;

    await prisma.quote.create({
      data: {
        code: await uniqueCode(),
        publicCode: await uniquePublicCode(),
        clientId: client.id,
        createdById: user.id,
        proposalName,
        origin: "CLIENT",
        answers: answersJson,
        clientPricing: clientPricingJson,
        status: price.requiresFollowUp ? "CUSTOM_PENDING" : "PROPOSAL",
        computedTotal: build,
        discount,
        monthly,
        customReasons: price.requiresFollowUp ? price.reasons : [],
        shared: false,
      },
    });
  } catch (e) {
    console.error("saveClientQuote failed", e);
    return { error: "Couldn't save - check your connection and try again." };
  }

  return { ok: true };
}
