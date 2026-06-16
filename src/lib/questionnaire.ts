/**
 * Droptine quote questionnaire.
 *
 * The staff member answers these; answers feed the deterministic pricing engine
 * (src/lib/pricing.ts). Industry options are tailored to the ranch / hunting /
 * breeder community Droptine works with. This is data-driven so it can be edited
 * from the admin UI later.
 */

export type Question =
  | {
      id: string;
      type: "text" | "email" | "tel";
      label: string;
      placeholder?: string;
      required?: boolean;
      group: "client" | "scope";
    }
  | {
      id: string;
      type: "single";
      label: string;
      group: "scope";
      options: { value: string; label: string; help?: string }[];
    }
  | {
      id: string;
      type: "multi";
      label: string;
      group: "scope";
      options: { value: string; label: string; help?: string }[];
    }
  | {
      id: string;
      type: "boolean";
      label: string;
      help?: string;
      group: "scope";
    }
  | {
      id: string;
      type: "longtext";
      label: string;
      placeholder?: string;
      group: "scope";
    };

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
  {
    id: "basicSite",
    type: "boolean",
    label: "Is this a small, basic 3–4 page site?",
    help: "Simple brochure site with no extra functionality. Sets the $4,000 floor.",
    group: "scope",
  },
  {
    id: "pageTier",
    type: "single",
    label: "Roughly how many pages? (ignored if basic site)",
    group: "scope",
    options: [
      { value: "1-5", label: "Up to 5 pages (standard)" },
      { value: "6-9", label: "6–9 pages" },
      { value: "10-15", label: "10–15 pages" },
      { value: "16+", label: "16+ pages" },
    ],
  },
  {
    id: "features",
    type: "multi",
    label: "Which functionality does the site need?",
    group: "scope",
    options: [
      { value: "ecommerce", label: "E-commerce / online store", help: "Gear, apparel, processed meat, semen/genetics sales" },
      { value: "animalDirectory", label: "Individual animal pages", help: "A page per breeder buck / sire / exotic species with stats & photos" },
      { value: "animalDirectorySmall", label: "Species pages (small set)", help: "A handful of species/animal pages rather than a full directory" },
      { value: "pedigree", label: "Interactive pedigree tool", help: "Bloodline / sire-dam pedigree charts for breeders" },
      { value: "salesCatalog", label: "For-sale / auction catalog", help: "Animals or lots for sale, sale-day catalog, auction listings" },
      { value: "lodgingActivities", label: "Lodging, activities & events", help: "Hunt packages, lodging, amenities, events calendar" },
      { value: "booking", label: "Booking / Airbnb integration", help: "Inquiry calendar or Airbnb/VRBO/Hipcamp linking" },
      { value: "propertyListings", label: "Property / land listings", help: "Manually managed ranch/real-estate listings" },
      { value: "agentLogins", label: "Team / agent logins", help: "Individual logins for a real-estate team" },
      { value: "enhancedMap", label: "Interactive property map", help: "Acreage / trail / drone-tour map beyond a basic location pin" },
      { value: "blog", label: "Blog / news", help: "Posts, news, hunt reports" },
    ],
  },
  {
    id: "mlsIdx",
    type: "boolean",
    label: "Does it need live MLS/IDX real-estate syncing?",
    help: "Complex, out-of-Webflow scope. Triggers a custom quote + monthly surcharge (we generally recommend against it).",
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
