import { prisma } from "@/lib/db";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await prisma.quote.findUnique({ where: { code }, include: { client: true, createdBy: true } });

  // Custom quotes have no proposal until approved.
  if (!quote || quote.status === "CUSTOM_PENDING") {
    return new Response("Not found", { status: 404 });
  }

  const pdf = await renderProposalPdf(buildProposalData(quote));
  const filename = `${quote.proposalName.replace(/[^a-z0-9]+/gi, "-")}-proposal.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
