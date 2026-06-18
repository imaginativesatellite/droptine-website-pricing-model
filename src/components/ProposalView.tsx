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

// Three consistent styles: label, body, and (large) pricing.
const labelStyle = {
  fontSize: "0.72rem",
  color: "var(--muted)",
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  marginBottom: 6,
};
const bodyStyle = { fontSize: "1rem", color: "var(--ink)", lineHeight: 1.5, margin: 0 };
const bodyBold = { ...bodyStyle, fontWeight: 600 };

/** The client-facing proposal (single total). Used on the public code page and
 *  on the internal quote page. */
export default function ProposalView({ d }: { d: ProposalPdfData }) {
  const half = Math.round(d.total / 2);
  const preparedBy = [d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  ·  ");
  const monthlyNote = ["No tax.", d.ecommerce ? ECOMMERCE_MONTHLY_DISCLAIMER : "", d.mlsIdx ? IDX_MONTHLY_DISCLAIMER : ""]
    .filter(Boolean)
    .join(" ");

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
        <div style={labelStyle}>Website Proposal · prepared for</div>
        <div style={{ fontWeight: 800, fontSize: "2rem", lineHeight: 1.15, color: "var(--charcoal)" }}>{d.proposalName}</div>

        {preparedBy && (
          <div className="q" style={{ marginTop: 18 }}>
            <div style={labelStyle}>Prepared by</div>
            <p style={bodyStyle}>{preparedBy}</p>
          </div>
        )}

        {d.scopeSummary && (
          <div className="q">
            {d.scopeSummary.split(/\n+/).map((p, i) => (
              <p key={i} style={{ ...bodyStyle, marginBottom: 10 }}>{p}</p>
            ))}
          </div>
        )}

        <div className="q">
          <div style={labelStyle}>Website Development</div>
          <p style={bodyBold}>Coding, Programming, and Implementation of Website</p>
          <p style={{ ...bodyStyle, marginTop: 8 }}>{STANDARD_FEATURES}</p>
          <p style={{ ...bodyStyle, marginTop: 6 }}>{LEAD_TIME}</p>

          {d.discount > 0 && (
            <>
              <div style={{ ...bodyStyle, display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <span>Subtotal</span><span>{money(d.subtotal)}</span>
              </div>
              <div style={{ ...bodyStyle, display: "flex", justifyContent: "space-between", color: "var(--good)" }}>
                <span>Discount</span><span>−{money(d.discount)}</span>
              </div>
            </>
          )}

          <div className="total"><span>Total</span><span className="big">{money(d.total)}</span></div>
          <div style={{ ...bodyStyle, display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span>50% deposit to begin</span><span>{money(half)}</span>
          </div>
          <div style={{ ...bodyStyle, display: "flex", justifyContent: "space-between" }}>
            <span>50% on completion</span><span>{money(d.total - half)}</span>
          </div>
          <p className="note">{PROPOSAL_DISCLAIMER}</p>
          <p className="note">{PROPOSAL_VALIDITY}</p>
        </div>

        <div className="q">
          <div style={labelStyle}>Monthly Hosting, Security &amp; Maintenance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 2 }}>
            {MONTHLY_ITEMS.map((m, i) => (
              <p key={i} style={bodyStyle}><span style={{ fontWeight: 600 }}>{m.title}:</span> {m.desc}</p>
            ))}
          </div>
          <div className="total"><span>Per month</span><span className="big">{money(d.monthly)}</span></div>
          <p className="note">{monthlyNote}</p>
        </div>

        <p className="note">{d.code}</p>
      </div>
    </div>
  );
}
