import { money } from "@/lib/quote";
import type { ProposalPdfData } from "@/lib/pdf";
import {
  STANDARD_FEATURES,
  LEAD_TIME,
  PROPOSAL_DISCLAIMER,
  PROPOSAL_VALIDITY,
  MONTHLY_ITEMS,
  ECOMMERCE_MONTHLY_DISCLAIMER,
  IDX_MONTHLY_DISCLAIMER,
} from "@/lib/proposal-copy";

const labelStyle = {
  fontSize: "0.72rem",
  color: "var(--muted)",
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

/** The client-facing proposal (single total). Used on the public code page and
 *  on the internal quote page. */
export default function ProposalView({ d }: { d: ProposalPdfData }) {
  const half = Math.round(d.total / 2);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "22px 28px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "1.45rem", letterSpacing: 1, color: "var(--gold)" }}>LUNA CREATIVE</div>
        <a href={`/api/proposal/${d.code}/pdf`} className="btn-gold" style={{ padding: "13px 26px", fontSize: "0.98rem" }}>
          Download PDF
        </a>
      </div>

      <div style={{ padding: "26px 28px" }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>Website Proposal · prepared for</div>
        <div style={{ fontWeight: 800, fontSize: "2rem", lineHeight: 1.15, color: "var(--charcoal)" }}>{d.proposalName}</div>

      {(d.preparedByName || d.preparedByEmail || d.preparedByPhone) && (
        <div className="q" style={{ marginTop: 18 }}>
          <div style={labelStyle}>Prepared by</div>
          {[d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  ·  ")}
        </div>
      )}

      {d.scopeSummary && (
        <div className="q">
          {d.scopeSummary.split(/\n+/).map((p, i) => <p key={i} style={{ marginBottom: 8 }}>{p}</p>)}
        </div>
      )}

      <div className="q">
        <div style={labelStyle}>Website Development</div>
        <p style={{ fontWeight: 600, marginTop: 4 }}>Coding, Programming, and Implementation of Website</p>
        <p className="help" style={{ marginTop: 6 }}>{STANDARD_FEATURES}</p>
        <p className="help" style={{ marginTop: 4 }}>{LEAD_TIME}</p>

        {d.discount > 0 && (
          <table className="simple" style={{ marginTop: 10 }}>
            <tbody>
              <tr><td>Subtotal</td><td className="amt">{money(d.subtotal)}</td></tr>
              <tr style={{ color: "var(--good)" }}><td>Discount</td><td className="amt">−{money(d.discount)}</td></tr>
            </tbody>
          </table>
        )}

        <div className="total"><span>Total</span><span className="big">{money(d.total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span>50% deposit to begin</span><span>{money(half)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>50% on completion</span><span>{money(d.total - half)}</span>
        </div>
        <p className="note">{PROPOSAL_DISCLAIMER}</p>
        <p className="note">{PROPOSAL_VALIDITY}</p>
      </div>

      <div className="q">
        <div style={labelStyle}>Monthly Hosting, Security &amp; Maintenance</div>
        <ul style={{ margin: "8px 0 0 18px", fontSize: "0.88rem" }}>
          {MONTHLY_ITEMS.map((m, i) => (
            <li key={i} style={{ marginBottom: 5 }}><strong>{m.title}:</strong> {m.desc}</li>
          ))}
        </ul>
        <div className="total"><span>Per month</span><span className="big">{money(d.monthly)}</span></div>
        <p className="note">No tax.</p>
        {d.ecommerce && <p className="note">{ECOMMERCE_MONTHLY_DISCLAIMER}</p>}
        {d.mlsIdx && <p className="note">{IDX_MONTHLY_DISCLAIMER}</p>}
      </div>

        <p className="help" style={{ marginTop: 14 }}>{d.code}</p>
      </div>
    </div>
  );
}
