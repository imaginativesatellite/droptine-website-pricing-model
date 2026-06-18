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
 *  on the internal quote page. `publicLink` adds a button to open the public link. */
export default function ProposalView({ d, publicLink = false }: { d: ProposalPdfData; publicLink?: boolean }) {
  const half = Math.round(d.total / 2);
  const preparedBy = [d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  ·  ");
  const monthlyNote = [d.ecommerce ? ECOMMERCE_MONTHLY_DISCLAIMER : "", d.mlsIdx ? IDX_MONTHLY_DISCLAIMER : ""]
    .filter(Boolean)
    .join(" ");
  const features = STANDARD_FEATURES.replace(/^Standard Features:\s*/, "");
  const leadTime = LEAD_TIME.replace(/^Estimated Lead Time:\s*/, "");

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {publicLink && (
            <a
              href={`/proposal/${d.publicCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: "13px 22px", fontSize: "0.98rem", display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              View public link
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M5 3h6v6M11 3L4 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
          <a href={`/api/proposal/${d.publicCode}/pdf`} className="btn-gold" style={{ padding: "13px 26px", fontSize: "0.98rem" }}>
            Download PDF
          </a>
        </div>
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
          <ul className="bullets">
            <li><span style={{ fontWeight: 600 }}>Standard Features:</span> {features}</li>
            <li><span style={{ fontWeight: 600 }}>Estimated Lead Time:</span> {leadTime}</li>
          </ul>

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
          <p style={{ fontStyle: "italic", fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, marginTop: 28 }}>
            {PROPOSAL_DISCLAIMER} {PROPOSAL_VALIDITY}
          </p>
        </div>

        <div className="q">
          <div style={labelStyle}>Monthly Hosting, Security &amp; Maintenance</div>
          <ul className="bullets">
            {MONTHLY_ITEMS.map((m, i) => (
              <li key={i}><span style={{ fontWeight: 600 }}>{m.title}:</span> {m.desc}</li>
            ))}
          </ul>
          <div className="total"><span>Per month</span><span className="big">{money(d.monthly)}</span></div>
          {monthlyNote && <p className="note">{monthlyNote}</p>}
        </div>

        <p className="note">{d.code}</p>
      </div>
    </div>
  );
}
