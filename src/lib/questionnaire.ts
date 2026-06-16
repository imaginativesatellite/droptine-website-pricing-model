/**
 * Droptine quote questionnaire.
 *
 * The staff member answers these; answers feed the deterministic pricing engine
 * (src/lib/pricing.ts). Industry options are tailored to the ranch / hunting /
 * breeder community Droptine works with.
 *
 * `showIf` declaratively gates follow-up questions on a previous answer, so it
 * stays serializable for a future admin-editable (DB-backed) version.
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
  | (Base & { type: "text" | "email" | "tel"; placeholder?: string; required?: boolean })
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
  // --- Client / project identity (appears on the proposal) ---
  { id: "proposalName", type: "text", label: "Project / business name", placeholder: "e.g. Texas Hidden Springs Ranch", required: true, group: "client" },
  { id: "clientName", type: "text", label: "Client contact name", placeholder: "e.g. Austin Pradon", group: "client" },
  { id: "clientEmail", type: "email", label: "Client email", group: "client" },
  { id: "clientPhone", type: "tel", label: "Client phone", group: "client" },

  // --- Scope ---
  {
    id: "industry",
    type: "single",
    label: "What industry is this site for?",
    group: "scope",
    options: [
      { value: "ranch", label: "Ranch / outfitter / hunting" },
      { value: "breeder", label: "Breeder (whitetail / exotics)" },
      { value: "realestate", label: "Ranch / land real estate" },
      { value: "retail", label: "Retail / product brand" },
      { value: "other", label: "Other" },
    ],
  },
  // --- E-commerce (asked before page count: e-commerce sites are priced by
  //     store cost, not by number of pages) ---
  { id: "ecommerce", type: "boolean", label: "Does the site need an online store / e-commerce?", group: "scope" },
  {
    id: "ecommerceItems",
    type: "single",
    label: "Roughly how many items will be sold?",
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
    help: "Adds $1,000.",
    group: "scope",
    showIf: { field: "ecommerce", equals: true },
  },

  // --- Pages (skipped for e-commerce sites) ---
  {
    id: "basicSite",
    type: "boolean",
    label: "Is this a small, basic 3–4 page site?",
    help: "Simple brochure site with no extra functionality. Sets the $4,000 floor.",
    group: "scope",
    showIf: { field: "ecommerce", equals: false },
  },
  {
    id: "pageTier",
    type: "single",
    label: "Roughly how many pages?",
    help: "Do NOT count individual animal or pedigree pages here — those are priced separately below.",
    group: "scope",
    showIf: [
      { field: "ecommerce", equals: false },
      { field: "basicSite", equals: false },
    ],
    options: [
      { value: "5-9", label: "5–9 pages (standard)" },
      { value: "10-14", label: "10–14 pages" },
      { value: "15-19", label: "15–19 pages" },
      { value: "20-24", label: "20–24 pages" },
      { value: "25-29", label: "25–29 pages" },
      { value: "30+", label: "30+ pages (custom quote)" },
    ],
  },

  // --- Animals ---
  { id: "animalPages", type: "boolean", label: "Do they need animals listed (an animals page)?", group: "scope" },
  {
    id: "animalIndividualPages",
    type: "boolean",
    label: "Will the animals need individual pages?",
    group: "scope",
    showIf: { field: "animalPages", equals: true },
  },
  {
    id: "animalCount",
    type: "single",
    label: "How many animals?",
    group: "scope",
    showIf: { field: "animalIndividualPages", equals: true },
    options: COUNT_OPTIONS,
  },

  // --- Pedigrees ---
  { id: "pedigreePages", type: "boolean", label: "Do they need pedigree / bloodline pages?", group: "scope" },
  {
    id: "pedigreeIndividualPages",
    type: "boolean",
    label: "Will the pedigrees need individual pages?",
    group: "scope",
    showIf: { field: "pedigreePages", equals: true },
  },
  {
    id: "pedigreeCount",
    type: "single",
    label: "How many pedigrees?",
    group: "scope",
    showIf: { field: "pedigreeIndividualPages", equals: true },
    options: COUNT_OPTIONS,
  },

  // --- Real estate ---
  {
    id: "realEstate",
    type: "boolean",
    label: "Real-estate package?",
    help: "Property/land listings + team/agent logins + interactive property map. Adds $2,500.",
    group: "scope",
  },

  // --- Content pages ---
  { id: "blog", type: "boolean", label: "Blog page?", help: "Adds $500.", group: "scope" },
  { id: "news", type: "boolean", label: "News page?", help: "Adds $500.", group: "scope" },
  { id: "events", type: "boolean", label: "Events page?", help: "Adds $500.", group: "scope" },

  // --- Complex / custom ---
  {
    id: "mlsIdx",
    type: "boolean",
    label: "Does it need live MLS/IDX real-estate syncing?",
    help: "Out-of-Webflow scope. Triggers a custom quote + monthly surcharge (we generally recommend against it).",
    group: "scope",
  },
  {
    id: "additionalFunctionality",
    type: "longtext",
    label: "Any other / complex functionality requested?",
    placeholder: "Describe anything beyond the options above. Anything here routes the request to a custom quote instead of an instant price.",
    group: "scope",
  },
];
