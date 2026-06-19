import type { Quote, Client, User } from "@prisma/client";
import { computeQuote, leadTimeDays, type PricingAnswers } from "./pricing";
import { subtotal, finalPrice } from "./quote";
import type { ProposalPdfData } from "./pdf";

/**
 * Builds the display/PDF data for a quote. Line items are recomputed
 * deterministically from the saved answers. When an admin has set an override
 * (or it's an approved custom quote), we show a single "Website build" line at
 * the override price instead of the itemized breakdown. The "prepared by"
 * contact is pulled from the rep (createdBy).
 */
export function buildProposalData(
  quote: Quote & { client?: Client | null; createdBy?: User | null },
): ProposalPdfData {
  const answers = quote.answers as unknown as PricingAnswers;
  const hasOverride = quote.overrideTotal != null;
  const snapshot = Array.isArray(quote.lineItems)
    ? (quote.lineItems as unknown as { label: string; amount: number }[])
    : null;

  let lineItems: { label: string; amount: number }[];
  if (hasOverride) {
    lineItems = [{ label: "Website build", amount: subtotal(quote) }];
  } else if (snapshot && snapshot.length) {
    // Prefer the price snapshot captured at creation time.
    lineItems = snapshot;
  } else {
    // Fallback: recompute from saved answers (older quotes without a snapshot).
    const result = computeQuote(quote.answers as unknown as PricingAnswers);
    lineItems = result.lineItems.length ? result.lineItems : [{ label: "Website build", amount: subtotal(quote) }];
  }

  return {
    proposalName: quote.proposalName,
    preparedByName: quote.createdBy?.name ?? null,
    preparedByEmail: quote.createdBy?.email ?? null,
    preparedByPhone: quote.createdBy?.phone ?? null,
    code: quote.code,
    publicCode: quote.publicCode,
    leadDays: quote.leadDaysOverride ?? leadTimeDays(finalPrice(quote)),
    scopeSummary: quote.scopeSummary,
    lineItems,
    subtotal: subtotal(quote),
    discount: quote.discount,
    total: finalPrice(quote),
    monthly: quote.monthly,
    ecommerce: answers.ecommerce === true,
    mlsIdx: answers.mlsIdx === true,
    customDisclaimer: quote.customDisclaimer,
    customDisclaimerPlacement: quote.customDisclaimerPlacement,
  };
}
