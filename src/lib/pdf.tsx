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
const LINE = "#e3e0db";

const s = StyleSheet.create({
  page: { padding: 44, paddingBottom: 64, fontSize: 10, color: "#2b2b2b", fontFamily: "Helvetica", lineHeight: 1.5 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1 },
  addr: { fontSize: 8, color: MUTED, textAlign: "right" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginTop: 8 },
  section: { marginTop: 18 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  clientName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  para: { marginBottom: 6 },
  small: { fontSize: 9, color: MUTED },
  italic: { fontFamily: "Helvetica-Oblique", fontSize: 8, color: MUTED, marginTop: 10 },
  devRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  devLabel: { flex: 1, paddingRight: 12, fontFamily: "Helvetica-Bold" },
  devAmt: { width: 90, textAlign: "right", fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowAmt: { width: 90, textAlign: "right" },
  discount: { color: "#2e7d32" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 2, borderTopColor: CHARCOAL },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  totalAmt: { fontSize: 16, fontFamily: "Helvetica-Bold", color: CHARCOAL, textAlign: "right" },
  splitRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  mItem: { marginBottom: 7 },
  mTitle: { fontFamily: "Helvetica-Bold" },
  termsTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginTop: 10 },
  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 10 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 26 },
  sigBlock: { width: "45%", borderTopWidth: 1, borderTopColor: CHARCOAL, paddingTop: 4, fontSize: 8, color: MUTED },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, fontSize: 7, color: MUTED, textAlign: "center", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

export type ProposalPdfData = {
  proposalName: string; // = the client name (the proposal is for)
  preparedByName?: string | null;
  preparedByEmail?: string | null;
  preparedByPhone?: string | null;
  code: string;
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
    <View style={s.brandRow}>
      <Text style={s.brand}>LUNA CREATIVE</Text>
      <Text style={s.addr}>
        {LUNA_ADDRESS}
        {"\n"}{LUNA_PHONE}
        {"\n"}{LUNA_WEB}
      </Text>
    </View>
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

  return (
    <Document>
      {/* Page 1 — Proposal */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.title}>WEBSITE PROPOSAL</Text>

        <View style={s.section}>
          <Text style={s.label}>Prepared for</Text>
          <Text style={s.clientName}>{d.proposalName}</Text>
        </View>

        {(d.preparedByName || d.preparedByEmail || d.preparedByPhone) && (
          <View style={s.section}>
            <Text style={s.label}>Prepared by</Text>
            <Text>{[d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  |  ")}</Text>
          </View>
        )}

        {d.scopeSummary ? (
          <View style={s.section}>
            <Text style={s.label}>Scope</Text>
            {d.scopeSummary.split(/\n+/).map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.label}>Website Development</Text>
          <View style={s.devRow}>
            <Text style={s.devLabel}>Coding, Programming, and Implementation of Website</Text>
            <Text style={s.devAmt}>{usd(d.discount > 0 ? d.subtotal : d.total)}</Text>
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>{STANDARD_FEATURES}</Text>
          <Text style={[s.small, { marginTop: 4 }]}>{LEAD_TIME}</Text>

          {d.discount > 0 && (
            <>
              <View style={s.row}><Text>Subtotal</Text><Text style={s.rowAmt}>{usd(d.subtotal)}</Text></View>
              <View style={s.row}><Text style={s.discount}>Discount</Text><Text style={[s.rowAmt, s.discount]}>-{usd(d.discount)}</Text></View>
            </>
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmt}>{usd(d.total)}</Text>
          </View>
          <View style={s.splitRow}><Text>50% deposit to begin</Text><Text>{usd(half)}</Text></View>
          <View style={s.splitRow}><Text>50% on completion</Text><Text>{usd(d.total - half)}</Text></View>

          <Text style={s.italic}>{PROPOSAL_DISCLAIMER}</Text>
          <Text style={[s.small, { marginTop: 8 }]}>{PROPOSAL_VALIDITY}</Text>
        </View>

        <Footer code={d.code} />
      </Page>

      {/* Page 2 — Monthly Hosting, Security & Maintenance */}
      <Page size="LETTER" style={s.page}>
        <Header />
        <Text style={s.title}>MONTHLY HOSTING, SECURITY &amp; MAINTENANCE</Text>

        <View style={s.section}>
          {MONTHLY_ITEMS.map((m, i) => (
            <View key={i} style={s.mItem}>
              <Text><Text style={s.mTitle}>{m.title}:</Text> {m.desc}</Text>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>PER MONTH</Text>
            <Text style={s.totalAmt}>{usd(d.monthly)}</Text>
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>No tax.</Text>

          {d.ecommerce && <Text style={[s.small, { marginTop: 4 }]}>{ECOMMERCE_MONTHLY_DISCLAIMER}</Text>}
          {d.mlsIdx && <Text style={[s.small, { marginTop: 4 }]}>{IDX_MONTHLY_DISCLAIMER}</Text>}
          <Text style={[s.small, { marginTop: 8 }]}>{PROPOSAL_VALIDITY}</Text>
        </View>

        <Footer code={d.code} />
      </Page>

      {/* Terms & Conditions — flows across as many pages as needed */}
      <Page size="LETTER" style={s.page} wrap>
        <Header />
        <Text style={s.title}>TERMS &amp; CONDITIONS</Text>

        <Text style={[s.label, { marginTop: 16 }]}>General Project Development Information</Text>
        {TERMS_INTRO_BULLETS.map((b, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={{ flex: 1 }}>{b}</Text>
          </View>
        ))}
        <Text style={[s.para, { marginTop: 6 }]}>{TERMS_WITNESS}</Text>

        {TERMS_SECTIONS.map((t, i) => (
          <View key={i} wrap={false}>
            <Text style={s.termsTitle}>{t.title}</Text>
            <Text style={s.para}>{t.body}</Text>
          </View>
        ))}

        <View style={s.sigRow}>
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
