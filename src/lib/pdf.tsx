import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  STANDARD_FEATURES,
  LEAD_TIME,
  PROPOSAL_DISCLAIMER,
  PROPOSAL_VALIDITY,
  MONTHLY_ITEMS,
  ECOMMERCE_MONTHLY_DISCLAIMER,
  IDX_MONTHLY_DISCLAIMER,
  TERMS_INTRO_BULLETS,
  TERMS_WITNESS,
  TERMS_SECTIONS,
  LUNA_ADDRESS,
  LUNA_PHONE,
  LUNA_WEB,
} from "./proposal-copy";

const GOLD = "#e89422";
const CHARCOAL = "#1a1a1a";
const MUTED = "#6f6a63";
const LINE = "#e7e3dd";

const s = StyleSheet.create({
  page: { paddingTop: 46, paddingBottom: 60, paddingHorizontal: 48, fontSize: 10, color: "#2b2b2b", fontFamily: "Helvetica", lineHeight: 1.5 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1.5 },
  addr: { fontSize: 7.5, color: MUTED, textAlign: "right", lineHeight: 1.4 },
  rule: { height: 1.5, backgroundColor: GOLD, marginTop: 10 },

  title: { fontSize: 23, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginTop: 26 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 18, marginBottom: 4 },
  clientName: { fontSize: 20, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  para: { marginBottom: 6 },
  small: { fontSize: 9, color: MUTED },

  devTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  rowLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 9.5 },
  discount: { color: "#2e7d32" },

  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, borderTopColor: CHARCOAL, paddingTop: 12, paddingHorizontal: 14, marginTop: 18 },
  totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: CHARCOAL, textTransform: "uppercase", letterSpacing: 1 },
  totalAmt: { fontSize: 18, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  splitRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, fontSize: 9.5 },

  italic: { fontFamily: "Helvetica-Oblique", fontSize: 8, color: MUTED, marginTop: 14 },
  note: { fontSize: 8, color: MUTED, marginTop: 6 },

  mItem: { marginBottom: 7, fontSize: 9.5 },
  mTitle: { fontFamily: "Helvetica-Bold", color: CHARCOAL },

  termsHeading: { fontSize: 16, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginBottom: 2 },
  termsTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginTop: 11, marginBottom: 1 },
  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 12, color: "#2b2b2b" },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  sigBlock: { width: "46%", borderTopWidth: 1, borderTopColor: CHARCOAL, paddingTop: 5, fontSize: 8, color: MUTED },

  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 7, color: MUTED, textAlign: "center", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 7 },
});

export type ProposalPdfData = {
  proposalName: string;
  preparedByName?: string | null;
  preparedByEmail?: string | null;
  preparedByPhone?: string | null;
  code: string;
  publicCode: string;
  scopeSummary?: string | null;
  lineItems: { label: string; amount: number }[];
  subtotal: number;
  discount: number;
  total: number;
  monthly: number;
  ecommerce: boolean;
  mlsIdx: boolean;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}.00`;

function Header() {
  return (
    <>
      <View style={s.brandRow}>
        <Text style={s.brand}>LUNA CREATIVE</Text>
        <Text style={s.addr}>{LUNA_ADDRESS}{"\n"}{LUNA_PHONE} · {LUNA_WEB}</Text>
      </View>
      <View style={s.rule} />
    </>
  );
}

function Footer({ code }: { code: string }) {
  return (
    <Text style={s.footer} fixed>
      {code} · Luna Creative · {LUNA_PHONE} · {LUNA_WEB}
    </Text>
  );
}

function ProposalDoc({ d }: { d: ProposalPdfData }) {
  const half = Math.round(d.total / 2);
  const preparedBy = [d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  ·  ");
  const features = STANDARD_FEATURES.replace(/^Standard Features:\s*/, "");
  const leadTime = LEAD_TIME.replace(/^Estimated Lead Time:\s*/, "");

  return (
    <Document>
      {/* Page 1 — Proposal */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.title}>Website Proposal</Text>

        <Text style={s.label}>Prepared for</Text>
        <Text style={s.clientName}>{d.proposalName}</Text>

        {preparedBy ? (
          <>
            <Text style={s.label}>Prepared by</Text>
            <Text>{preparedBy}</Text>
          </>
        ) : null}

        {d.scopeSummary ? (
          <>
            <Text style={s.label}>Scope</Text>
            {d.scopeSummary.split(/\n+/).map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}
          </>
        ) : null}

        <Text style={s.label}>Website Development</Text>
        <Text style={s.devTitle}>Coding, Programming, and Implementation of Website</Text>
        <View style={[s.bullet, { marginTop: 6 }]}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={{ flex: 1 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Standard Features: </Text>{features}</Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={{ flex: 1 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>Estimated Lead Time: </Text>{leadTime}</Text>
        </View>

        {d.discount > 0 && (
          <>
            <View style={[s.rowLine, { marginTop: 8 }]}><Text>Subtotal</Text><Text>{usd(d.subtotal)}</Text></View>
            <View style={s.rowLine}><Text style={s.discount}>Discount</Text><Text style={s.discount}>-{usd(d.discount)}</Text></View>
          </>
        )}

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalAmt}>{usd(d.total)}</Text>
        </View>
        <View style={s.splitRow}><Text>50% deposit to begin</Text><Text>{usd(half)}</Text></View>
        <View style={s.splitRow}><Text>50% on completion</Text><Text>{usd(d.total - half)}</Text></View>

        <Text style={[s.italic, { marginTop: 22 }]}>{PROPOSAL_DISCLAIMER} {PROPOSAL_VALIDITY}</Text>

        <Footer code={d.code} />
      </Page>

      {/* Page 2 — Monthly */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.title}>Monthly Hosting, Security & Maintenance</Text>

        <View style={{ marginTop: 14 }}>
          {MONTHLY_ITEMS.map((m, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>•</Text>
              <Text style={{ flex: 1 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>{m.title}: </Text>{m.desc}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>Per Month</Text>
          <Text style={s.totalAmt}>{usd(d.monthly)}</Text>
        </View>
        {d.ecommerce && <Text style={s.note}>{ECOMMERCE_MONTHLY_DISCLAIMER}</Text>}
        {d.mlsIdx && <Text style={s.note}>{IDX_MONTHLY_DISCLAIMER}</Text>}
        <Text style={s.note}>{PROPOSAL_VALIDITY}</Text>

        <Footer code={d.code} />
      </Page>

      {/* Terms & Conditions — no brand header, so the signature stays with the text */}
      <Page size="LETTER" style={s.page} wrap>
        <Text style={s.termsHeading}>Terms &amp; Conditions</Text>

        <Text style={[s.label, { marginTop: 12 }]}>General Project Development Information</Text>
        {TERMS_INTRO_BULLETS.map((b, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={{ flex: 1 }}>{b}</Text>
          </View>
        ))}
        <Text style={[s.para, { marginTop: 4 }]}>{TERMS_WITNESS}</Text>

        {TERMS_SECTIONS.map((t, i) => (
          <View key={i} wrap={false}>
            <Text style={s.termsTitle}>{t.title}</Text>
            <Text style={s.para}>{t.body}</Text>
          </View>
        ))}

        <View style={s.sigRow} wrap={false}>
          <Text style={s.sigBlock}>CLIENT SIGNATURE / DATE</Text>
          <Text style={s.sigBlock}>MANAGING MEMBER, LUNA CREATIVE LLC / DATE</Text>
        </View>

        <Footer code={d.code} />
      </Page>
    </Document>
  );
}

export async function renderProposalPdf(d: ProposalPdfData): Promise<Buffer> {
  return renderToBuffer(<ProposalDoc d={d} />);
}
