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
  // Visual section header this question sits under (rendered once per section).
  section?: string;
  // Exact substring of `label` to render bold, so members can scan the question
  // list without reading every word (e.g. "blog" in "Will the website have a blog?").
  emphasize?: string;
  // A single condition, or an array of conditions that must ALL be true (AND).
  showIf?: ShowIf | ShowIf[];
};

export type Question =
  | (Base & { type: "text" | "email" | "tel" | "url"; placeholder?: string; required?: boolean; numeric?: boolean })
  | (Base & { type: "longtext"; placeholder?: string })
  | (Base & { type: "boolean" })
  | (Base & { type: "single" | "multi"; options: { value: string; label: string; help?: string }[] });

// Whether a question should be shown given the current answers. A question is
// visible only when every showIf condition is met AND the question that each
// condition references is itself visible — so a deep follow-up (e.g. animal
// count) hides as soon as anything above it in the chain is switched off, even
// if its own controlling answer is still set from before.
export function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  if (!q.showIf) return true;
  const conds: ShowIf[] = Array.isArray(q.showIf) ? q.showIf : [q.showIf];
  return conds.every((c) => {
    const controller = QUESTIONNAIRE.find((x) => x.id === c.field);
    if (controller && !isVisible(controller, answers)) return false;
    const v = answers[c.field];
    if (typeof c.equals === "boolean") return c.equals ? v === true : !v;
    return v === c.equals;
  });
}

// Splits a question's label into plain/bold segments around `emphasize`, so
// the UI can render the emphasized word in <strong> without re-deriving it.
export function splitLabel(q: Pick<Question, "label" | "emphasize">): { text: string; bold: boolean }[] {
  if (!q.emphasize) return [{ text: q.label, bold: false }];
  const idx = q.label.indexOf(q.emphasize);
  if (idx === -1) return [{ text: q.label, bold: false }];
  const parts: { text: string; bold: boolean }[] = [];
  if (idx > 0) parts.push({ text: q.label.slice(0, idx), bold: false });
  parts.push({ text: q.emphasize, bold: true });
  const rest = q.label.slice(idx + q.emphasize.length);
  if (rest) parts.push({ text: rest, bold: false });
  return parts;
}

// True when `q` is gated by a showIf in the same section as the question before
// it — i.e. it's a follow-up reveal, not an independent top-level question. Used
// to group follow-ups tightly with what triggered them instead of spacing every
// question identically.
export function isFollowUp(q: Question, prev: Question | undefined): boolean {
  return Boolean(q.showIf) && prev !== undefined && prev.section === q.section;
}

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
  { id: "proposalName", type: "text", label: "Client Name", placeholder: "e.g. Hidden Valley Ranch", required: true, group: "client" },

  // --- Existing site ---
  { id: "existingWebsite", type: "boolean", label: "Does the client have an existing website?", emphasize: "existing website", group: "scope", section: "Existing site" },
  {
    id: "existingWebsiteUrl",
    type: "url",
    label: "Existing website URL",
    emphasize: "URL",
    placeholder: "https://…",
    group: "scope",
    section: "Existing site",
    showIf: { field: "existingWebsite", equals: true },
  },

  // --- E-commerce (asked before page count: e-commerce sites are priced by
  //     store cost, not by number of pages) ---
  { id: "ecommerce", type: "boolean", label: "Will the website have an online store / e-commerce?", emphasize: "online store / e-commerce", group: "scope", section: "E-commerce" },
  {
    id: "ecommerceItems",
    type: "single",
    label: "How many items will the store sell?",
    emphasize: "How many",
    group: "scope",
    section: "E-commerce",
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
    label: "Will the store be built on Shopify?",
    emphasize: "Shopify",
    group: "scope",
    section: "E-commerce",
    showIf: { field: "ecommerce", equals: true },
  },

  // --- Pages (skipped for e-commerce sites) ---
  {
    id: "pageTier",
    type: "single",
    label: "How many pages will the website have?",
    emphasize: "How many",
    help: "Only count main pages — not their individual dynamic sub-pages (e.g. animals, pedigree, news, blog, events), and not legal pages (e.g. privacy policy, terms & conditions).",
    group: "scope",
    section: "Pages",
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
  {
    id: "pageCountExact",
    type: "text",
    numeric: true,
    label: "How many pages will the website need?",
    emphasize: "how many",
    placeholder: "e.g. 35",
    group: "scope",
    section: "Pages",
    showIf: { field: "pageTier", equals: "30+" },
  },

  // --- Animals & pedigrees ---
  { id: "animalPages", type: "boolean", label: "Will the website have an animals page?", emphasize: "animals page", group: "scope", section: "Animals & pedigrees" },
  { id: "animalIndividualPages", type: "boolean", label: "Will each animal have its own page?", emphasize: "own page", group: "scope", section: "Animals & pedigrees", showIf: { field: "animalPages", equals: true } },
  { id: "animalCount", type: "single", label: "How many animals will the website list?", emphasize: "How many", group: "scope", section: "Animals & pedigrees", showIf: { field: "animalIndividualPages", equals: true }, options: COUNT_OPTIONS },

  { id: "pedigreePages", type: "boolean", label: "Will the website have a pedigree page?", emphasize: "pedigree page", group: "scope", section: "Animals & pedigrees" },
  { id: "pedigreeIndividualPages", type: "boolean", label: "Will each pedigree have its own page?", emphasize: "own page", group: "scope", section: "Animals & pedigrees", showIf: { field: "pedigreePages", equals: true } },
  { id: "pedigreeCount", type: "single", label: "How many pedigrees will the website list?", emphasize: "How many", group: "scope", section: "Animals & pedigrees", showIf: { field: "pedigreeIndividualPages", equals: true }, options: COUNT_OPTIONS },

  // --- Content ---
  { id: "blog", type: "boolean", label: "Will the website have a blog?", emphasize: "blog", group: "scope", section: "Content" },
  { id: "news", type: "boolean", label: "Will the website have a news page?", emphasize: "news page", group: "scope", section: "Content" },
  { id: "events", type: "boolean", label: "Will the website have an events page?", emphasize: "events page", group: "scope", section: "Content" },

  // Property/land listings + its follow-ups. MLS/IDX and team/agent logins are
  // sub-features, so they only surface once listings are selected (and are only
  // priced then — see pricing.ts).
  { id: "realEstate", type: "boolean", label: "Will the website need Property/land listings?", emphasize: "Property/land listings", group: "scope", section: "Content" },
  {
    id: "mlsIdx",
    type: "boolean",
    label: "Will the website have live MLS/IDX real-estate syncing?",
    emphasize: "MLS/IDX",
    group: "scope",
    section: "Content",
    showIf: { field: "realEstate", equals: true },
  },
  {
    id: "teamLogins",
    type: "boolean",
    label: "Will the website need team/agent logins?",
    emphasize: "team/agent logins",
    group: "scope",
    section: "Content",
    showIf: { field: "realEstate", equals: true },
  },

  { id: "contentProvided", type: "boolean", label: "Will Droptine organize and provide the page structure and content?", emphasize: "provide the page structure", group: "scope", section: "Content" },

  // --- Add-ons ---
  {
    id: "animations",
    type: "single",
    label: "Will the website have animations?",
    emphasize: "animations",
    group: "scope",
    section: "Add-ons",
    options: [
      { value: "none", label: "None" },
      { value: "entrance", label: "Entrance animations only" },
      { value: "entrance-interactive", label: "Entrance & interactive animations" },
    ],
  },
  { id: "socialFeed", type: "boolean", label: "Will the website have social media feed integration?", emphasize: "social media feed", group: "scope", section: "Add-ons" },

  // --- Custom ---
  {
    id: "additionalFunctionality",
    type: "longtext",
    label: "What custom or advanced functionality should we plan for?",
    emphasize: "custom",
    placeholder: "Describe any features beyond the options above — e.g. member logins, booking/reservations, herd-management tools, payment portals, API integrations. Leave blank if none. Anything here routes the request to a custom quote.",
    group: "scope",
    section: "Custom",
  },
];
