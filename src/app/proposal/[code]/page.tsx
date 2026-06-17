import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildProposalData } from "@/lib/proposal-data";
import { money } from "@/lib/quote";

export const dynamic = "force-dynamic";

export default async function ProposalPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const quote = await prisma.quote.findUnique({ where: { code }, include: { client: true } });

  if (!quote || quote.status === "CUSTOM_PENDING") notFound();

  const d = buildProposalData(quote!);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--charcoal)" }}>
              LUNA <span style={{ color: "var(--gold)" }}>CREATIVE</span>
            </div>
            <div className="help">Branding done right.</div>
          </div>
          <a className="btn-gold" href={`/api/proposal/${d.code}/pdf`}>Download PDF</a>
        </div>

        <h1 style={{ marginTop: 20 }}>
          Website <span style={{ color: "var(--gold)" }}>Proposal</span>
        </h1>

        <div className="q">
          <div className="label" style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>Prepared for</div>
          <div style={{ fontWeight: 600 }}>{d.proposalName}</div>
          {d.clientName && <div>{d.clientName}</div>}
          {[d.clientEmail, d.clientPhone].filter(Boolean).join(" · ")}
        </div>

        {d.scopeSummary && (
          <div className="q">
            {d.scopeSummary.split(/\n+/).map((p, i) => (
              <p key={i} style={{ marginBottom: 8 }}>{p}</p>
            ))}
          </div>
        )}

        <table className="simple" style={{ marginTop: 12 }}>
          <tbody>
            {d.lineItems.map((li, i) => (
              <tr key={i}>
                <td>{li.label}</td>
                <td className="amt">{money(li.amount)}</td>
              </tr>
            ))}
            {d.discount > 0 && (
              <>
                <tr>
                  <td>Subtotal</td>
                  <td className="amt">{money(d.subtotal)}</td>
                </tr>
                <tr style={{ color: "var(--good)" }}>
                  <td>Discount</td>
                  <td className="amt">−{money(d.discount)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div className="total">
          <span>Total</span>
          <span className="big">{money(d.total)}</span>
        </div>
        <div className="monthly">+ {money(d.monthly)}/mo hosting, security &amp; maintenance · no tax</div>

        <p className="help" style={{ marginTop: 20 }}>
          Proposal code {d.code} · valid 60 days · subject to terms at luna-creative.com/terms-conditions
        </p>
      </div>
    </div>
  );
}
