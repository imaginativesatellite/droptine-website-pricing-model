"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canUseClientPortal } from "@/lib/portal";
import { priceQuote, type PricingAnswers } from "@/lib/pricing";
import { generateScopeSummary } from "@/lib/anthropic";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";
import { notifyAdmins, sendProposalToMember } from "@/lib/email";
import { appUrl, proposalUrl } from "@/lib/quote";

export type PromoteResult = { error: string } | void;

/**
 * "Request Quote from Luna Creative" - promote a client-portal quote into a
 * normal Luna request. Re-runs the deterministic Luna price (dropping the
 * Droptine markup / increments / discount), moves it to the Luna Creative tab,
 * and notifies admins / emails the member exactly like a freshly requested
 * quote. convertedToLunaAt is stamped so the row keeps a "from client" marker.
 */
export async function requestQuoteFromLuna(quoteId: string): Promise<PromoteResult> {
  const user = await requireUser();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { createdBy: true, client: true },
  });
  if (!quote) return { error: "Quote not found." };

  // Only the creator or an admin can promote, and only client-origin quotes.
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && quote.createdById !== user.id) return { error: "You can't change this quote." };
  if (!canUseClientPortal(user)) return { error: "This isn't available for your account." };
  if (quote.origin !== "CLIENT") return { error: "This quote is already a Luna Creative request." };

  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  const answers = quote.answers as unknown as PricingAnswers;
  const result = priceQuote(answers, settings?.adjustmentPct ?? 0);

  // Re-draft the scope prose so the promoted quote reads like a normal request.
  const scopeSummary = await generateScopeSummary({ proposalName: quote.proposalName, answers });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      origin: "LUNA_REQUEST",
      convertedToLunaAt: new Date(),
      status: result.requiresCustomQuote ? "CUSTOM_PENDING" : "PROPOSAL",
      computedTotal: result.total,
      overrideTotal: null,
      discount: 0,
      monthly: result.monthly,
      rushDays: result.rushDays ?? null,
      customReasons: result.reasons,
      lineItems: result.lineItems as unknown as Prisma.InputJsonValue,
      // It's a Luna quote now - drop the client markup snapshot.
      clientPricing: Prisma.JsonNull,
      scopeSummary,
      // A promoted quote begins a fresh proposal life - clear prior send state.
      emailStatus: null,
      emailError: null,
    },
  });

  // Notifications mirror createQuote: best-effort, never block the promotion.
  const manageUrl = `${appUrl()}/quote/${quote.id}`;
  const memberEmail = quote.createdBy.email;
  try {
    if (result.requiresCustomQuote) {
      await notifyAdmins({
        proposalName: quote.proposalName, memberEmail, isCustom: true, code: quote.code,
        reasons: result.reasons, manageUrl,
      });
    } else {
      const full = await prisma.quote.findUniqueOrThrow({
        where: { id: quote.id },
        include: { createdBy: true, client: true },
      });
      const pdf = await renderProposalPdf(buildProposalData(full));
      await sendProposalToMember({
        memberEmail, proposalName: quote.proposalName, total: result.total, monthly: result.monthly,
        code: quote.publicCode, proposalUrl: proposalUrl(quote.publicCode), pdf,
      });
      await notifyAdmins({
        proposalName: quote.proposalName, memberEmail, isCustom: false, total: result.total,
        code: quote.code, manageUrl,
      });
      await prisma.quote.update({ where: { id: quote.id }, data: { emailStatus: "SENT", emailError: null } });
    }
  } catch (e) {
    console.error("requestQuoteFromLuna: notification failed", e);
    await prisma.quote.update({
      where: { id: quote.id },
      data: { emailStatus: "FAILED", emailError: e instanceof Error ? e.message : String(e) },
    });
  }

  revalidatePath("/dashboard");
}
