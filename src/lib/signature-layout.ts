/**
 * Shared coordinates for the proposal PDF's dedicated "Signatures" page and
 * the e-signature fields Documenso overlays on top of it. Both lib/pdf.tsx
 * (the visual guide boxes) and lib/documenso.ts (the API field placement)
 * import these so the two can never drift apart.
 *
 * Positions/sizes are percentages of the LETTER page (0–100), since that's
 * react-pdf's native percentage-string unit and Documenso's documented
 * examples use small numbers consistent with percentages rather than points.
 *
 * There's no fixed page *number* here on purpose: the Signatures page is
 * always the last `<Page>` in lib/pdf.tsx's JSX, but earlier sections (Terms
 * especially) can wrap onto extra physical pages depending on content
 * length, so the actual last page number varies per document. lib/documenso.ts
 * resolves the real page count from the rendered PDF and applies it here.
 */

type FieldPosition = { positionX: number; positionY: number; width: number; height: number };

export const SIGNATURE_FIELDS: Record<"client" | "company", { signature: FieldPosition; date: FieldPosition }> = {
  client: {
    signature: { positionX: 8, positionY: 24, width: 47, height: 9 },
    date: { positionX: 60, positionY: 24, width: 32, height: 9 },
  },
  company: {
    signature: { positionX: 8, positionY: 54, width: 47, height: 9 },
    date: { positionX: 60, positionY: 54, width: 32, height: 9 },
  },
};
