/**
 * Droptine quote questionnaire.
 *
 * Answers feed the deterministic pricing engine (src/lib/pricing.ts). Industry
 * options are tailored to the ranch / hunting / breeder community.
 *
 * `showIf` declaratively gates follow-up questions (serializable for a future
 * admin-editable version).
 */

export type ShowIf = { field: string; equals: string | boolean };

type Base = {
  id: string;
  label: string;
  help?: string;
  group: "client" | "scope";
  // A single condition, or an array of conditions that must ALL be true (AND).
  showIf?: ShowIf | ShowIf[];
};

export type Question =
  | (Base & { type: "text" | "email" | "tel" | "url"; placeholder?: string; required?: boolean })
  | (Base & { type: "longtext"; placeholder?: string })
  | (Base & { type: "boolean" })
  | (Base & { type: "single" | "multi"; options: { value: string; label: string; help?: string }[] });

const COUNT_OPTIONS = [
  { value: "1-10", label: "1–10" },
  { value: "11-20", label: "11–20" },
  { value: "21-30", label: "21–30" },
  { value: "31-40", label: "31–40" },
  { value: "41-50", label: "41–50" },
  { value: "51-60", label: "51–60" },
  { value: "60+", label: "60+ (custom quote)" },
];

export const QUESTIONNAIRE: Question[] = [
  // The client the proposal will eventually go to (Droptine's end client).
  { id: "proposalName", type: "text", label: "Client Name", placeholder: "e.g. Texas Hidden Springs Ranch", required: true, group: "client" },

  // --- Scope ---
  { id: "existingWebsite", type: "boolean", label: "Does the client have an existing website?", group: "scope" },
  {
    id: "existingWebsiteUrl",
    type: "url",
    label: "Existing website URL",
    placeholder: "https://…",
    group: "scope",
    showIf: { field: "existingWebsite", equals: true },
  },

  // --- E-commerce (asked before page count: e-commerce sites are priced by
  //     store cost, not by number of pages) ---
  { id: "ecommerce", type: "boolean", label: "Does the site need an online store / e-commerce?", group: "scope" },
  {
    id: "ecommerceItems",
    type: "single",
    label: "How many items will be sold?",
    group: "scope",
    showIf: { field: "ecommerce", equals: true },
    options: [
      { value: "1-25", label: "1–25 items" },
      { value: "26-50", label: "26–50 items" },
      { value: "51-75", label: "51–75 items" },
      { value: "76-100", label: "76–100 items" },
      { value: "101-125", label: "101–125 items" },
      { value: "126-150", label: "126–150 items" },
      { value: "150+", label: "150+ items (custom quote)" },
    ],
  },
  {
    id: "ecommerceShopify",
    type: "boolean",
    label: "Does the store need to be built on Shopify?",
    group: "scope",
    showIf: { field: "ecommerce", equals: true },
  },

  // --- Pages (skipped for e-commerce sites) ---
  {
    id: "pageTier",
    type: "single",
    label: "How many pages?",
    help: "Only count main pages — not their individual dynamic sub-pages (e.g. animals, pedigree, news, blog, events), and not legal pages (e.g. privacy policy, terms & conditions).",
    group: "scope",
    showIf: { field: "ecommerce", equals: false },
    options: [
      { value: "1-4", label: "1–4 pages" },
      { value: "5-9", label: "5–9 pages" },
      { value: "10-14", label: "10–14 pages" },
      { value: "15-19", label: "15–19 pages" },
      { value: "20-24", label: "20–24 pages" },
      { value: "25-29", label: "25–29 pages" },
      { value: "30+", label: "30+ pages (custom quote)" },
    ],
  },

  // --- Animals ---
  { id: "animalPages", type: "boolean", label: "Do they need animals listed (an animals page)?", group: "scope" },
  { id: "animalIndividualPages", type: "boolean", label: "Will the animals need individual pages?", group: "scope", showIf: { field: "animalPages", equals: true } },
  { id: "animalCount", type: "single", label: "How many animals?", group: "scope", showIf: { field: "animalIndividualPages", equals: true }, options: COUNT_OPTIONS },

  // --- Pedigrees ---
  { id: "pedigreePages", type: "boolean", label: "Do they need pedigree / bloodline pages?", group: "scope" },
  { id: "pedigreeIndividualPages", type: "boolean", label: "Will the pedigrees need individual pages?", group: "scope", showIf: { field: "pedigreePages", equals: true } },
  { id: "pedigreeCount", type: "single", label: "How many pedigrees?", group: "scope", showIf: { field: "pedigreeIndividualPages", equals: true }, options: COUNT_OPTIONS },

  // --- Real estate ---
  {
    id: "realEstate",
    type: "boolean",
    label: "Real-estate package?",
    help: "Property/land listings + team/agent logins + interactive property map.",
    group: "scope",
  },

  // --- Content ---
  { id: "blog", type: "boolean", label: "Blog?", group: "scope" },
  { id: "news", type: "boolean", label: "News?", group: "scope" },
  { id: "events", type: "boolean", label: "Events?", group: "scope" },

  { id: "contentProvided", type: "boolean", label: "Will the page structure and content be organized and provided by Droptine?", group: "scope" },

  { id: "socialFeed", type: "boolean", label: "Social media feed integration?", group: "scope" },

  // --- Complex / custom ---
  { id: "mlsIdx", type: "boolean", label: "Does it need live MLS/IDX real-estate syncing?", help: "Adds $930 to the build. 3rd-party IDX fees are billed directly to the client.", group: "scope" },
  {
    id: "additionalFunctionality",
    type: "longtext",
    label: "Any other / complex functionality requested?",
    placeholder: "Describe anything beyond the options above. Anything here routes the request to a custom quote.",
    group: "scope",
  },
];
