/**
 * Shared coordinates for the proposal PDF's dedicated "Signatures" page and
 * the e-signature fields Documenso overlays on top of it. Both lib/pdf.tsx
 * (the visual guide boxes) and lib/documenso.ts (the API field placement)
 * import these so the two can never drift apart.
 *
 * Positions/sizes are percentages of the LETTER page (0–100), since that's
 * react-pdf's native percentage-string unit and Documenso's documented
 * examples use small numbers consistent with percentages rather than points.
 */

// Must match the page order in lib/pdf.tsx (Proposal, Monthly, Terms, Signatures).
export const SIGNATURE_PAGE_NUMBER = 4;

type FieldBox = { page: number; positionX: number; positionY: number; width: number; height: number };

export const SIGNATURE_FIELDS: Record<"client" | "company", { signature: FieldBox; date: FieldBox }> = {
  client: {
    signature: { page: SIGNATURE_PAGE_NUMBER, positionX: 8, positionY: 24, width: 47, height: 9 },
    date: { page: SIGNATURE_PAGE_NUMBER, positionX: 60, positionY: 24, width: 32, height: 9 },
  },
  company: {
    signature: { page: SIGNATURE_PAGE_NUMBER, positionX: 8, positionY: 54, width: 47, height: 9 },
    date: { page: SIGNATURE_PAGE_NUMBER, positionX: 60, positionY: 54, width: 32, height: 9 },
  },
};
