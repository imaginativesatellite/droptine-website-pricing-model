import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildProposalData } from "@/lib/proposal-data";
import { isExpired } from "@/lib/quote";
import ProposalView from "@/components/ProposalView";
import { documensoSignUrl } from "@/lib/documenso";

export const dynamic = "force-dynamic";
// Public link, but must never be indexed by search engines.
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function ProposalPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicCode: code }, include: { client: true, createdBy: true } });

  if (!quote || quote.status === "CUSTOM_PENDING" || isExpired(quote)) notFound();

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <ProposalView d={buildProposalData(quote!)} />

      {quote!.clientSigningToken && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Signature</h3>
          {quote!.clientSignedAt ? (
            <p className="help">You signed this proposal on {new Date(quote!.clientSignedAt).toLocaleString()}.</p>
          ) : (
            <iframe
              src={documensoSignUrl(quote!.clientSigningToken)}
              style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 10 }}
              title="Sign this proposal"
            />
          )}
        </div>
      )}
    </div>
  );
}
