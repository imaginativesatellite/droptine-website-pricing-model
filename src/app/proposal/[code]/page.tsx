import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildProposalData } from "@/lib/proposal-data";
import ProposalView from "@/components/ProposalView";

export const dynamic = "force-dynamic";
// Public link, but must never be indexed by search engines.
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function ProposalPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await prisma.quote.findUnique({ where: { code }, include: { client: true, createdBy: true } });

  if (!quote || quote.status === "CUSTOM_PENDING") notFound();

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <ProposalView d={buildProposalData(quote!)} />
    </div>
  );
}
