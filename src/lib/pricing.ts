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
  monthlyMlsIdxSurcharge: 400, // midpoint of the observed $300–$500/mo

  // Page count → absolute base build price (non-e-commerce sites).
  // Do NOT count individual animal/pedigree pages here. "30+" → custom.
  pageBase: {
    "1-4": 4000,
    "5-9": 5000,
    "10-14": 6000,
    "15-19": 7000,
    "20-24": 8000,
    "25-29": 9000,
  } as Record<string, number>,

  // E-commerce: $1,000 covers the first 25 items, then +$250 per additional 25.
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
    "1-10": 250,
    "11-20": 500,
    "21-30": 750,
    "31-40": 1000,
    "41-50": 1250,
    "51-60": 1500,
    // "60+" -> custom quote
  } as Record<string, number>,

  // Bundled real-estate package: property listings + team/agent logins +
  // interactive property/acreage map.
  realEstatePackage: 2500,

  // Standalone content sections, each.
  contentPage: 500, // blog / news / events (asked separately)

  // Reduction when Droptine organizes & provides the page structure and content.
  contentProvidedReduction: 500,
} as const;

export type PricingAnswers = {
  pageTier?: keyof typeof PRICING_RULES.pageBase;

  ecommerce?: boolean;
  ecommerceItems?: string; // tier key, or "150+"
  ecommerceShopify?: boolean;

  animalPages?: boolean;
  animalIndividualPages?: boolean;
  animalCount?: string; // tier key, or "60+"

  pedigreePages?: boolean;
  pedigreeIndividualPages?: boolean;
  pedigreeCount?: string; // tier key, or "60+"

  realEstate?: boolean;

  blog?: boolean;
  news?: boolean;
  events?: boolean;

  contentProvided?: boolean; // Droptine provides page structure & content (−$500)

  mlsIdx?: boolean; // MLS/IDX real-estate syncing (complex → custom)
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
  if (answers.mlsIdx)
    reasons.push("MLS/IDX syncing requires a custom build and monthly surcharge.");
  if (answers.ecommerce && answers.ecommerceItems === "150+")
    reasons.push("Store catalog of 150+ items needs a custom quote.");
  if (answers.animalPages && answers.animalIndividualPages && answers.animalCount === "60+")
    reasons.push("60+ animals with individual pages needs a custom quote.");
  if (answers.pedigreePages && answers.pedigreeIndividualPages && answers.pedigreeCount === "60+")
    reasons.push("60+ pedigrees with individual pages needs a custom quote.");

  if (reasons.length > 0) {
    return {
      requiresCustomQuote: true,
      reasons,
      total: 0,
      monthly: answers.mlsIdx ? R.monthlyBase + R.monthlyMlsIdxSurcharge : R.monthlyBase,
      lineItems: [],
    };
  }

  const lineItems: { label: string; amount: number }[] = [];

  // Base build
  if (answers.ecommerce) {
    lineItems.push({ label: "Website", amount: R.base });
  } else {
    const tier = answers.pageTier ?? "5-9";
    const baseAmt = R.pageBase[tier] ?? R.base;
    lineItems.push({ label: `Website (${tier} pages)`, amount: baseAmt });
  }

  // E-commerce store
  if (answers.ecommerce) {
    const itemsTier = answers.ecommerceItems ?? "1-25";
    const ecomAmount = R.ecommerceItemTiers[itemsTier] ?? R.ecommerceItemTiers["1-25"];
    lineItems.push({ label: `E-commerce store (${itemsTier} items)`, amount: ecomAmount });
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
    lineItems.push({ label: "Pedigree / bloodline page", amount: R.listingPageFee });
    if (answers.pedigreeIndividualPages && answers.pedigreeCount) {
      const add = R.individualPageTiers[answers.pedigreeCount] ?? 0;
      if (add > 0) lineItems.push({ label: `Individual pedigree pages (${answers.pedigreeCount})`, amount: add });
    }
  }

  if (answers.realEstate)
    lineItems.push({ label: "Real-estate package (listings, agent logins, property map)", amount: R.realEstatePackage });

  if (answers.blog) lineItems.push({ label: "Blog", amount: R.contentPage });
  if (answers.news) lineItems.push({ label: "News", amount: R.contentPage });
  if (answers.events) lineItems.push({ label: "Events", amount: R.contentPage });

  if (answers.contentProvided)
    lineItems.push({ label: "Structure & content provided by Droptine", amount: -R.contentProvidedReduction });

  const min = answers.contentProvided ? R.minContentProvided : R.min;
  const sub = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = clamp(roundUp(sub, R.roundUpTo), min, R.max);

  return { requiresCustomQuote: false, reasons, total, monthly: R.monthlyBase, lineItems };
}
