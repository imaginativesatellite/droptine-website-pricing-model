/**
 * Droptine pricing engine.
 *
 * Page count sets the base build price directly. Round UP to the nearest $250,
 * clamp to $4,000–$15,000. Some selections route to a custom quote.
 *
 * Pricing is fully deterministic here — the Anthropic model only drafts prose.
 * This config is data-driven so it can later be edited from an admin UI.
 */

export const PRICING_RULES = {
  // Standard base used for e-commerce sites (which are priced by store cost,
  // not page count).
  base: 5000,

  // Hard guardrails — every computed price is clamped into this band.
  min: 4000,
  // Lower floor when Droptine supplies the page structure & content.
  minContentProvided: 3500,
  max: 15000,

  // All prices are rounded UP to the nearest $250.
  roundUpTo: 250,

  // Flat managed hosting / security / maintenance.
  monthlyBase: 169,
  // Added to the monthly for e-commerce / property-listings / MLS / complex sites.
  monthlySurcharge: 50,

  // Page count → absolute base build price (non-e-commerce sites).
  // Do NOT count individual animal/pedigree pages here. "30+" → custom.
  pageBase: {
    "1-4": 4000,
    "5-9": 5000,
    "10-14": 7000,
    "15-19": 8000,
    "20-24": 9000,
    "25-29": 10000,
  } as Record<string, number>,

  // E-commerce: $1,000 flat for being a store, plus an item-count fee on top.
  // Item fee: $1,000 for the first 25 items, then +$250 per additional 25.
  ecommerceBaseFee: 1000,
  ecommerceItemTiers: {
    "1-25": 1000,
    "26-50": 1250,
    "51-75": 1500,
    "76-100": 1750,
    "101-125": 2000,
    "126-150": 2250,
    // "150+" -> custom quote
  } as Record<string, number>,
  ecommerceShopifySurcharge: 1000,

  // Animals / pedigrees: $250 for the listing page, then if each gets an
  // individual page, +$250 per group of 10.
  listingPageFee: 250,
  individualPageTiers: {
    "1-10": 500,
    "11-20": 1000,
    "21-30": 1500,
    "31-40": 2000,
    "41-50": 2500,
    "51-60": 3000,
    // "60+" -> custom quote
  } as Record<string, number>,

  // Property/land listings.
  propertyListings: 1000,
  // Team/agent logins (members-only area for a listing team).
  teamLogins: 1500,

  // Standalone content sections, each.
  contentPage: 500, // blog / news / events (asked separately)

  // Reduction when Droptine organizes & provides the page structure and content.
  contentProvidedReduction: 500,
  // Social media feed integration add-on.
  socialFeedFee: 100,
  // Animations.
  animationTiers: {
    "none": 0,
    "entrance": 150,
    "entrance-interactive": 950,
  } as Record<string, number>,
  // MLS/IDX integration: one-time build add (3rd-party IDX fees billed to client).
  mlsBuildAdd: 930,
} as const;

export type PricingAnswers = {
  pageTier?: keyof typeof PRICING_RULES.pageBase;
  pageCountExact?: string; // exact count, only asked when pageTier === "30+"

  ecommerce?: boolean;
  ecommerceItems?: string; // tier key, or "150+"
  ecommerceShopify?: boolean;

  animalPages?: boolean;
  animalIndividualPages?: boolean;
  animalCount?: string; // tier key, or "60+"

  pedigreePages?: boolean;
  pedigreeIndividualPages?: boolean;
  pedigreeCount?: string; // tier key, or "60+"

  realEstate?: boolean; // Property/land listings (+$1,000)
  teamLogins?: boolean; // team/agent logins (+$1,500), only with listings

  blog?: boolean;
  news?: boolean;
  events?: boolean;

  contentProvided?: boolean; // Droptine provides page structure & content (−$500)
  socialFeed?: boolean; // social media feed integration (+$100)
  animations?: string; // "none" | "entrance" (+$150) | "entrance-interactive" (+$950)

  mlsIdx?: boolean; // MLS/IDX real-estate syncing (+$930 build, +$50/mo)
  additionalFunctionality?: string; // free-text custom request (complex → custom)
};

export type PricingResult = {
  requiresCustomQuote: boolean;
  reasons: string[];
  total: number;
  monthly: number;
  lineItems: { label: string; amount: number }[];
};

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeQuote(answers: PricingAnswers): PricingResult {
  const R = PRICING_RULES;
  const reasons: string[] = [];

  if (answers.additionalFunctionality && answers.additionalFunctionality.trim())
    reasons.push("Custom functionality was requested.");
  if (!answers.ecommerce && answers.pageTier === "30+")
    reasons.push("30+ pages needs a custom quote.");
  if (answers.ecommerce && answers.ecommerceItems === "150+")
    reasons.push("Store catalog of 150+ items needs a custom quote.");
  if (answers.animalPages && answers.animalIndividualPages && answers.animalCount === "60+")
    reasons.push("60+ animals with individual pages needs a custom quote.");
  if (answers.pedigreePages && answers.pedigreeIndividualPages && answers.pedigreeCount === "60+")
    reasons.push("60+ pedigrees with individual pages needs a custom quote.");

  const lineItems: { label: string; amount: number }[] = [];

  // Base build
  if (answers.ecommerce) {
    lineItems.push({ label: "Website", amount: R.base });
  } else {
    const tier = answers.pageTier ?? "5-9";
    const baseAmt = R.pageBase[tier] ?? R.base;
    const pageLabel = tier === "30+" && answers.pageCountExact?.trim() ? answers.pageCountExact.trim() : tier;
    lineItems.push({ label: `Website (${pageLabel} pages)`, amount: baseAmt });
  }

  // E-commerce store
  if (answers.ecommerce) {
    lineItems.push({ label: "E-commerce store", amount: R.ecommerceBaseFee });
    const itemsTier = answers.ecommerceItems ?? "1-25";
    const ecomAmount = R.ecommerceItemTiers[itemsTier] ?? R.ecommerceItemTiers["1-25"];
    lineItems.push({ label: `Store catalog (${itemsTier} items)`, amount: ecomAmount });
    if (answers.ecommerceShopify)
      lineItems.push({ label: "Built on Shopify", amount: R.ecommerceShopifySurcharge });
  }

  // Animal pages
  if (answers.animalPages) {
    lineItems.push({ label: "Animal listing page", amount: R.listingPageFee });
    if (answers.animalIndividualPages && answers.animalCount) {
      const add = R.individualPageTiers[answers.animalCount] ?? 0;
      if (add > 0) lineItems.push({ label: `Individual animal pages (${answers.animalCount})`, amount: add });
    }
  }

  // Pedigree pages
  if (answers.pedigreePages) {
    lineItems.push({ label: "Pedigree page", amount: R.listingPageFee });
    if (answers.pedigreeIndividualPages && answers.pedigreeCount) {
      const add = R.individualPageTiers[answers.pedigreeCount] ?? 0;
      if (add > 0) lineItems.push({ label: `Individual pedigree pages (${answers.pedigreeCount})`, amount: add });
    }
  }

  if (answers.realEstate)
    lineItems.push({ label: "Property/land listings", amount: R.propertyListings });
  // Team/agent logins is a listings sub-feature, so it's only charged when
  // listings are selected (guards against a stale answer if listings is later
  // turned off in the questionnaire).
  if (answers.realEstate && answers.teamLogins)
    lineItems.push({ label: "Team/agent logins", amount: R.teamLogins });

  if (answers.blog) lineItems.push({ label: "Blog", amount: R.contentPage });
  if (answers.news) lineItems.push({ label: "News", amount: R.contentPage });
  if (answers.events) lineItems.push({ label: "Events", amount: R.contentPage });

  if (answers.socialFeed)
    lineItems.push({ label: "Social media feed integration", amount: R.socialFeedFee });

  if (answers.animations && answers.animations !== "none") {
    const animAmt = R.animationTiers[answers.animations] ?? 0;
    if (animAmt > 0)
      lineItems.push({
        label: answers.animations === "entrance-interactive" ? "Entrance & interactive animations" : "Entrance animations",
        amount: animAmt,
      });
  }

  // MLS/IDX is only offered with property/land listings, so it's only charged
  // when listings are selected (guards against a stale answer if listings are
  // later turned off in the questionnaire).
  if (answers.realEstate && answers.mlsIdx)
    lineItems.push({ label: "MLS/IDX integration", amount: R.mlsBuildAdd });

  if (answers.contentProvided)
    lineItems.push({ label: "Structure & content provided by Droptine", amount: -R.contentProvidedReduction });

  const min = answers.contentProvided ? R.minContentProvided : R.min;
  const sub = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = clamp(roundUp(sub, R.roundUpTo), min, R.max);

  // Property listings already covers the MLS/IDX case (MLS/IDX requires listings).
  const surcharge = answers.ecommerce || answers.realEstate ? R.monthlySurcharge : 0;
  return { requiresCustomQuote: reasons.length > 0, reasons, total, monthly: R.monthlyBase + surcharge, lineItems };
}

/** Admin-controlled global nudge on demand (busy → raise prices, slow → lower
 *  them). Applied after computeQuote, as a line item appended to the
 *  internal-only breakdown — never shown to the member (see ProposalView /
 *  pdf.tsx, which only render subtotal/discount/total, not lineItems). */
export function applyDemandAdjustment(result: PricingResult, pct: number): PricingResult {
  if (!pct) return result;
  const amount = Math.round((result.total * pct) / 100);
  const total = Math.max(0, result.total + amount);
  const label = `Demand adjustment (${pct > 0 ? "+" : ""}${pct}%)`;
  return { ...result, total, lineItems: [...result.lineItems, { label, amount }] };
}

/** Estimated lead time (business days) based on the final price. */
export function leadTimeDays(total: number): number {
  if (total <= 5000) return 45;
  if (total <= 7500) return 50;
  if (total <= 10000) return 55;
  if (total <= 12500) return 60;
  return 65;
}
