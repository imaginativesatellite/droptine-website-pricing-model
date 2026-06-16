/**
 * Droptine pricing engine.
 *
 * Derived from Luna Creative's ~40 past Webflow quotes (see PRICING_NOTES below).
 * Goal: keep every auto-generated price inside the historical range
 * ($4,000–$10,000), starting at $5,000, rounded to the nearest $500.
 *
 * IMPORTANT: pricing is fully deterministic here. The Anthropic model is only
 * used to draft proposal prose — it never computes the number.
 *
 * This config is intentionally data-driven so it can later be edited from the
 * admin UI without code changes.
 */

export const PRICING_RULES = {
  // Standard Webflow build, up to 5 pages, with the standard feature set:
  // mobile optimization, interactive location map, cross-browser, basic SEO,
  // fillable contact form, photo & video gallery.
  base: 5000,

  // Hard guardrails — every computed price is clamped into this band.
  min: 4000,
  max: 10000,

  // All prices are rounded to the nearest $500.
  roundTo: 500,

  // Flat managed hosting / security / maintenance.
  monthlyBase: 169,
  // MLS/IDX syncing adds a monthly surcharge (we generally recommend against it).
  monthlyMlsIdxSurcharge: 400, // midpoint of the observed $300–$500/mo

  // A small/basic 3–4 page site sets the floor instead of the standard base.
  basicSiteTotal: 4000,

  // Page-count add-ons (on top of base; first tier is included).
  pageTiers: {
    "1-5": 0,
    "6-9": 1000,
    "10-15": 2000,
    "16+": 3000,
  } as Record<string, number>,

  // Feature add-ons (multi-select). Tuned against past quotes:
  //  - ecommerce sites landed ~$8k  (base 5k + 3k)
  //  - breeder per-animal directories ~$7.5k (base 5k + 2k)
  //  - interactive pedigree pushed Hatada 7.5k -> 9k (+1.5k)
  //  - hunting lodging/activities/events pages pushed Buckhorn high (+1.5k)
  //  - Airbnb/booking linking pushed 6S River to 6.5k (+1.5k)
  features: {
    ecommerce: 3000, // online store (gear, apparel, meat, genetics/semen)
    blog: 500,
    animalDirectory: 2000, // per-buck / per-sire / exotic species pages
    animalDirectorySmall: 1000, // a small set of species pages (e.g. G2 +1k)
    pedigree: 1500, // interactive pedigree / bloodline tool
    lodgingActivities: 1500, // lodging + activities + events pages
    booking: 1500, // Airbnb / VRBO / Hipcamp linking or inquiry calendar
    enhancedMap: 500, // interactive property/acreage map beyond basic location
    salesCatalog: 1500, // for-sale animals / auction / sale catalog
    propertyListings: 1500, // manually managed ranch/real-estate listings
    agentLogins: 500, // team/agent individual logins (real estate)
  } as Record<string, number>,
} as const;

export type PricingAnswers = {
  basicSite?: boolean;
  pageTier?: keyof typeof PRICING_RULES.pageTiers;
  features?: string[];
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

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute a quote from questionnaire answers.
 *
 * Complex / out-of-Webflow-scope requests (free-text "additional functionality",
 * or MLS/IDX syncing) flag the quote for a custom follow-up instead of producing
 * an auto price.
 */
export function computeQuote(answers: PricingAnswers): PricingResult {
  const R = PRICING_RULES;
  const reasons: string[] = [];

  const hasAdditional =
    !!answers.additionalFunctionality &&
    answers.additionalFunctionality.trim().length > 0;
  if (hasAdditional) reasons.push("Custom functionality was requested.");
  if (answers.mlsIdx)
    reasons.push("MLS/IDX syncing requires a custom build and monthly surcharge.");

  if (hasAdditional || answers.mlsIdx) {
    return {
      requiresCustomQuote: true,
      reasons,
      total: 0,
      monthly: answers.mlsIdx
        ? R.monthlyBase + R.monthlyMlsIdxSurcharge
        : R.monthlyBase,
      lineItems: [],
    };
  }

  const lineItems: { label: string; amount: number }[] = [];

  // Base
  if (answers.basicSite) {
    lineItems.push({ label: "Basic Webflow site (3–4 pages)", amount: R.basicSiteTotal });
  } else {
    lineItems.push({ label: "Standard Webflow website (up to 5 pages)", amount: R.base });

    const tier = answers.pageTier ?? "1-5";
    const pageAdd = R.pageTiers[tier] ?? 0;
    if (pageAdd > 0) lineItems.push({ label: `Additional pages (${tier})`, amount: pageAdd });

    for (const f of answers.features ?? []) {
      const amount = R.features[f];
      if (amount) lineItems.push({ label: featureLabel(f), amount });
    }
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = clamp(roundTo(subtotal, R.roundTo), R.min, R.max);

  return {
    requiresCustomQuote: false,
    reasons,
    total,
    monthly: R.monthlyBase,
    lineItems,
  };
}

export function featureLabel(key: string): string {
  const labels: Record<string, string> = {
    ecommerce: "E-commerce / online store",
    blog: "Blog / news section",
    animalDirectory: "Individual animal pages (bucks / sires / species)",
    animalDirectorySmall: "Species / animal pages (small set)",
    pedigree: "Interactive pedigree / bloodline tool",
    lodgingActivities: "Lodging, activities & events pages",
    booking: "Booking / Airbnb–VRBO integration",
    enhancedMap: "Interactive property / acreage map",
    salesCatalog: "For-sale / auction sale catalog",
    propertyListings: "Ranch / real-estate property listings",
    agentLogins: "Team / agent individual logins",
  };
  return labels[key] ?? key;
}

/**
 * PRICING_NOTES — how the rules above map to history (for reference):
 *   $4.0k  Blue Creek Milling (3pg), White River Mountain Ranch (4pg)  -> basicSite
 *   $5.0k  TNT, DEA Ranch, Rancho San Jose, Ace Outfitters, THSR, etc. -> base
 *   $6.0k  Hatada Ranch, G2 (+species), S. TX Brain & Spine            -> base + small add
 *   $6.5k  Pannell, 6S River (Airbnb), Bar T (marked down)             -> base + booking
 *   $7.5k  JKO, S.TX Whitetails(+blog), StarS, Grey Ghost, NBJ std     -> base + animalDirectory
 *   $8.0k  Old 39, Bison Creek, Construction Camo (ecommerce)          -> base + ecommerce
 *   $9.0k  Hatada Whitetails + interactive pedigree                    -> base + animalDir + pedigree
 *   $9.3k  Buckhorn (activities/events/lodging + many interior pages)  -> base + pages + lodgingActivities
 *   $9.5k  Mock Ranches (IDX)                                          -> custom (MLS/IDX)
 *   $10k   Bella Rio, NBJ high-end                                     -> base + animalDir + pages (clamped)
 */
