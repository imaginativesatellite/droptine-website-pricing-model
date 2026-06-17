import type { Quote, Client } from "@prisma/client";
import { computeQuote, type PricingAnswers } from "./pricing";
import { subtotal, finalPrice } from "./quote";
import type { ProposalPdfData } from "./pdf";

/**
 * Builds the display/PDF data for a quote. Line items are recomputed
 * deterministically from the saved answers. When an admin has set an override
 * (or it's an approved custom quote), we show a single "Website build" line at
 * the override price instead of the itemized breakdown.
 */
export function buildProposalData(quote: Quote & { client?: Client | null }): ProposalPdfData {
  const answers = quote.answers as unknown as PricingAnswers;
  const result = computeQuote(answers);
  const raw = quote.answers as Record<string, unknown>;
  const hasOverride = quote.overrideTotal != null;

  const lineItems =
    !hasOverride && result.lineItems.length
      ? result.lineItems
      : [{ label: "Website build", amount: subtotal(quote) }];

  return {
    proposalName: quote.proposalName,
    clientName: typeof raw.clientName === "string" ? raw.clientName : null,
    clientEmail: quote.client?.email ?? (typeof raw.clientEmail === "string" ? raw.clientEmail : null),
    clientPhone: quote.client?.phone ?? (typeof raw.clientPhone === "string" ? raw.clientPhone : null),
    code: quote.code,
    scopeSummary: quote.scopeSummary,
    lineItems,
    subtotal: subtotal(quote),
    discount: quote.discount,
    total: finalPrice(quote),
    monthly: quote.monthly,
  };
}
