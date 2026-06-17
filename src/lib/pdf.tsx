import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const GOLD = "#e89422";
const CHARCOAL = "#1a1a1a";
const MUTED = "#6f6a63";
const LINE = "#e3e0db";

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: "#2b2b2b", fontFamily: "Helvetica", lineHeight: 1.5 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: CHARCOAL, letterSpacing: 1 },
  brandAccent: { color: GOLD },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  addr: { fontSize: 8, color: MUTED, textAlign: "right" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CHARCOAL, marginTop: 8 },
  titleAccent: { color: GOLD },
  section: { marginTop: 18 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  para: { marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: LINE },
  rowLabel: { flex: 1, paddingRight: 12 },
  rowAmt: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 2, borderTopColor: CHARCOAL },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: CHARCOAL },
  totalAmt: { fontSize: 16, fontFamily: "Helvetica-Bold", color: CHARCOAL, textAlign: "right" },
  discount: { color: "#2e7d32" },
  monthly: { marginTop: 6, color: MUTED, fontSize: 9 },
  splitRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
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
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}.00`;

function ProposalDoc({ d }: { d: ProposalPdfData }) {
  const half = Math.round(d.total / 2);
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.brandRow}>
          <View>
            <Text style={s.brand}>
              LUNA <Text style={s.brandAccent}>CREATIVE</Text>
            </Text>
            <Text style={s.brandSub}>Branding done right.</Text>
          </View>
          <Text style={s.addr}>
            16403 Huebner Rd{"\n"}San Antonio, TX 78248{"\n"}(210) 479-4085{"\n"}www.luna-creative.com
          </Text>
        </View>

        <Text style={s.title}>
          WEBSITE <Text style={s.titleAccent}>PROPOSAL</Text>
        </Text>

        <View style={s.section}>
          <Text style={s.label}>Prepared for</Text>
          <Text style={s.para}>{d.proposalName}</Text>
        </View>

        {(d.preparedByName || d.preparedByEmail || d.preparedByPhone) && (
          <View style={s.section}>
            <Text style={s.label}>Prepared by</Text>
            <Text style={s.para}>
              {[d.preparedByName, d.preparedByEmail, d.preparedByPhone].filter(Boolean).join("  |  ")}
            </Text>
          </View>
        )}

        {d.scopeSummary ? (
          <View style={s.section}>
            <Text style={s.label}>Scope</Text>
            {d.scopeSummary.split(/\n+/).map((p, i) => (
              <Text key={i} style={s.para}>{p}</Text>
            ))}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.label}>Website Development</Text>
          {d.lineItems.map((li, i) => (
            <View style={s.row} key={i}>
              <Text style={s.rowLabel}>{li.label}</Text>
              <Text style={s.rowAmt}>{usd(li.amount)}</Text>
            </View>
          ))}
          {d.discount > 0 && (
            <>
              <View style={s.row}>
                <Text style={s.rowLabel}>Subtotal</Text>
                <Text style={s.rowAmt}>{usd(d.subtotal)}</Text>
              </View>
              <View style={s.row}>
                <Text style={[s.rowLabel, s.discount]}>Discount</Text>
                <Text style={[s.rowAmt, s.discount]}>-{usd(d.discount)}</Text>
              </View>
            </>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmt}>{usd(d.total)}</Text>
          </View>
          <View style={s.splitRow}>
            <Text>50% deposit to begin</Text>
            <Text>{usd(half)}</Text>
          </View>
          <View style={s.splitRow}>
            <Text>50% on completion</Text>
            <Text>{usd(d.total - half)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Monthly Hosting, Security &amp; Maintenance</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>
              Managed cloud hosting, security &amp; maintenance, SSL, automated backups, secure form
              handling, premium typography, and media delivery.
            </Text>
            <Text style={s.rowAmt}>{usd(d.monthly)}</Text>
          </View>
          <Text style={s.monthly}>Per month. No tax. Valid for 60 days from the proposal date.</Text>
        </View>

        <Text style={s.footer}>
          Proposal code {d.code} · Luna Creative · 210.479.4085 · www.luna-creative.com — Subject to the
          terms &amp; conditions at www.luna-creative.com/terms-conditions
        </Text>
      </Page>
    </Document>
  );
}

export async function renderProposalPdf(d: ProposalPdfData): Promise<Buffer> {
  return renderToBuffer(<ProposalDoc d={d} />);
}
