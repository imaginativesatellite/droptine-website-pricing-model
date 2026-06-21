import { prisma } from "@/lib/db";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";
import { downloadSignedPdf } from "@/lib/documenso";
import { isExpired } from "@/lib/quote";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicCode: code }, include: { client: true, createdBy: true } });

  // Custom quotes have no proposal until approved; expired links stop working.
  if (!quote || quote.status === "CUSTOM_PENDING" || isExpired(quote)) {
    return new Response("Not found", { status: 404 });
  }

  // Once both parties have signed, hand back the fully signed copy rather than a
  // fresh render. Falls back to the rendered proposal if it can't be retrieved.
  const signed = quote.signatureStatus === "SIGNED" && quote.signatureEnvelopeId
    ? await downloadSignedPdf(quote.signatureEnvelopeId)
    : null;
  const pdf = signed ?? (await renderProposalPdf(buildProposalData(quote)));
  const filename = signed
    ? `${quote.proposalName.replace(/[^a-z0-9]+/gi, "-")}-signed.pdf`
    : `${quote.proposalName.replace(/[^a-z0-9]+/gi, "-")}-proposal.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
