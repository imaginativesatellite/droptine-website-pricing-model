/**
 * Droptine pricing engine.
 *
 * Derived from Luna Creative's past Webflow quotes and refined with David's rules.
 * Start at $5,000 (5–9 page standard build), round UP to the nearest $250, and
 * clamp to $4,000–$15,000. Certain selections route to a custom quote instead of
 * an auto price.
 *
 * IMPORTANT: pricing is fully deterministic here. The Anthropic model is only
 * used to draft proposal prose — it never computes the number.
 *
 * This config is intentionally data-driven so it can later be edited from the
 * admin UI without code changes.
 */

export const PRICING_RULES = {
  // Standard Webflow build, 5–9 pages, with the standard feature set:
  // mobile optimization, interactive location map, cross-browser, basic SEO,
  // fillable contact form, photo & video gallery.
  base: 5000,

  // A small/basic 3–4 page brochure site sets the floor instead of the base.
  basicSiteTotal: 4000,

  // Hard guardrails — every computed price is clamped into this band.
  min: 4000,
  max: 15000,

  // All prices are rounded UP to the nearest $250.
  roundUpTo: 250,

  // Flat managed hosting / security / maintenance.
  monthlyBase: 169,
  // MLS/IDX syncing adds a monthly surcharge (we generally recommend against it).
  monthlyMlsIdxSurcharge: 400, // midpoint of the observed $300–$500/mo

  // Page-count add-ons (base covers 5–9 pages; do NOT count individual
  // animal/pedigree pages here). Not charged on e-commerce sites — those are
  // priced by the store cost instead. "30+" routes to a custom quote.
  pageTiers: {
    "5-9": 0,
    "10-14": 1000,
    "15-19": 2000,
    "20-24": 3000,
    "25-29": 4000,
    // "30+" -> custom quote
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

  // Animals / pedigrees: $250 just to have the listing page, then if each gets an
  // individual page, +$250 per group of 10 animals.
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

  // Standalone content pages, each.
  contentPage: 500, // blog / news / events (asked separately)
} as const;

export type PricingAnswers = {
  basicSite?: boolean;
  pageTier?: keyof typeof PRICING_RULES.pageTiers;

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

  mlsIdx?: boolean; // MLS/IDX real-estate syncing (complex → custom)
  additionalFunctionality?: string; // free-text custom request (complex → custom)
};

export type PricingResult = {
  /** True when the request needs a manual/custom quote (no auto proposal). */
  requiresCustomQuote: boolean;
  reasons: string[];
  /** One-time build total in whole USD (only meaningful when !requiresCustomQuote). */
  total: number;
  monthly: number;
  /** Transparent itemization for display / audit. */
  lineItems: { label: string; amount: number }[];
};

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute a quote from questionnaire answers.
 *
 * Complex / out-of-scope selections route to a custom follow-up instead of an
 * auto price: free-text "additional functionality", MLS/IDX syncing, 150+ store
 * items, or 60+ animals/pedigrees.
 */
export function computeQuote(answers: PricingAnswers): PricingResult {
  const R = PRICING_RULES;
  const reasons: string[] = [];

  if (answers.additionalFunctionality && answers.additionalFunctionality.trim())
    reasons.push("Custom functionality was requested.");
  if (!answers.ecommerce && !answers.basicSite && answers.pageTier === "30+")
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

  // Base
  if (answers.basicSite) {
    lineItems.push({ label: "Basic Webflow site (3–4 pages)", amount: R.basicSiteTotal });
  } else {
    lineItems.push({ label: "Standard Webflow website (5–9 pages)", amount: R.base });
    // E-commerce sites are priced by store cost, not page count.
    if (!answers.ecommerce) {
      const tier = answers.pageTier ?? "5-9";
      const pageAdd = R.pageTiers[tier] ?? 0;
      if (pageAdd > 0) lineItems.push({ label: `Additional pages (${tier})`, amount: pageAdd });
    }
  }

  // E-commerce
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
      if (add > 0)
        lineItems.push({ label: `Individual animal pages (${answers.animalCount})`, amount: add });
    }
  }

  // Pedigree pages (identical pricing to animals)
  if (answers.pedigreePages) {
    lineItems.push({ label: "Pedigree / bloodline page", amount: R.listingPageFee });
    if (answers.pedigreeIndividualPages && answers.pedigreeCount) {
      const add = R.individualPageTiers[answers.pedigreeCount] ?? 0;
      if (add > 0)
        lineItems.push({ label: `Individual pedigree pages (${answers.pedigreeCount})`, amount: add });
    }
  }

  // Real-estate bundle
  if (answers.realEstate)
    lineItems.push({ label: "Real-estate package (listings, agent logins, property map)", amount: R.realEstatePackage });

  // Standalone content pages
  if (answers.blog) lineItems.push({ label: "Blog page", amount: R.contentPage });
  if (answers.news) lineItems.push({ label: "News page", amount: R.contentPage });
  if (answers.events) lineItems.push({ label: "Events page", amount: R.contentPage });

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = clamp(roundUp(subtotal, R.roundUpTo), R.min, R.max);

  return {
    requiresCustomQuote: false,
    reasons,
    total,
    monthly: R.monthlyBase,
    lineItems,
  };
}
