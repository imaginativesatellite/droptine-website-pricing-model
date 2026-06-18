import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildProposalData } from "@/lib/proposal-data";
import { money, subtotal, finalPrice } from "@/lib/quote";
import ProposalView from "@/components/ProposalView";
import { updateQuote, approveQuote, resendProposalEmail } from "./actions";
import DeleteQuoteButton from "./DeleteQuoteButton";

const statusPill = (status: string) => {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending approval</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
};

function describeActivity(e: { field: string; oldValue: string | null; newValue: string | null }): string {
  if (e.field === "email") return e.newValue ?? "Email sent";
  if (e.field === "answers") return `Edited answers — ${e.newValue ?? ""}`;
  if (e.field === "status") return `Status: ${e.oldValue ?? "—"} → ${e.newValue ?? "—"}`;
  return `${e.field}: ${e.oldValue ?? "—"} → ${e.newValue ?? "—"}`;
}

const sublabel = { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 };

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: true,
      edits: { orderBy: { createdAt: "desc" }, include: { editedBy: true } },
    },
  });
  if (!quote) notFound();

  const isPending = quote!.status === "CUSTOM_PENDING";
  const d = buildProposalData(quote!);

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <Link href="/dashboard" className="help backlink">‹ Dashboard</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ flex: 1 }}>{quote!.proposalName}</h1>
        {statusPill(quote!.status)}
      </div>
      <p className="lede">
        {quote!.client.name} · {quote!.code}
        {isAdmin ? ` · by ${quote!.createdBy.email}` : ""}
      </p>

      {isPending ? (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Custom quote — awaiting approval</h3>
          <ul style={{ marginLeft: 18 }}>
            {quote!.customReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {!isAdmin && <p className="help" style={{ marginTop: 10 }}>We&apos;ll review this and follow up with pricing.</p>}
        </div>
      ) : (
        <ProposalView d={d} />
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--gold)" }}>
          <h3 style={{ marginBottom: 12 }}>Admin</h3>

          <div style={{ marginBottom: 16 }}>
            <Link href={`/quote/${quote!.id}/edit`} className="btn-secondary">Edit answers</Link>
          </div>

          {!isPending && (
            <div style={{ marginBottom: 20 }}>
              <div style={sublabel}>Internal breakdown</div>
              <table className="simple">
                <tbody>
                  {d.lineItems.map((li, i) => (
                    <tr key={i}><td>{li.label}</td><td className="amt">{money(li.amount)}</td></tr>
                  ))}
                  {quote!.discount > 0 && (
                    <>
                      <tr><td>Subtotal</td><td className="amt">{money(subtotal(quote!))}</td></tr>
                      <tr style={{ color: "var(--good)" }}><td>Discount</td><td className="amt">−{money(quote!.discount)}</td></tr>
                    </>
                  )}
                  <tr><td><strong>Total</strong></td><td className="amt"><strong>{money(finalPrice(quote!))}</strong></td></tr>
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                <form action={resendProposalEmail.bind(null, quote!.id)}>
                  <button type="submit" className="btn-secondary">Resend email</button>
                </form>
                {quote!.emailStatus && (
                  <span className="help" style={{ color: quote!.emailStatus === "FAILED" ? "#b3261e" : "var(--muted)" }}>
                    Email: <strong>{quote!.emailStatus}</strong>{quote!.emailError ? ` — ${quote!.emailError}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {isPending && (
            <form action={approveQuote.bind(null, quote!.id)} style={{ marginBottom: 20 }}>
              <label className="qlabel" htmlFor="approve-price">Approve at price ($)</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input id="approve-price" name="overrideTotal" type="text" inputMode="numeric" placeholder="e.g. 12000" required />
                <button type="submit" className="btn-gold">Approve &amp; send</button>
              </div>
              <p className="help" style={{ marginTop: 6 }}>Approving emails the requester the PDF and a link to their quotes.</p>
            </form>
          )}

          <form action={updateQuote.bind(null, quote!.id)}>
            <div className="q" style={{ paddingTop: 0 }}>
              <label className="qlabel" htmlFor="proposalName">Proposal name</label>
              <input id="proposalName" name="proposalName" type="text" defaultValue={quote!.proposalName} />
            </div>
            <div className="q">
              <label className="qlabel" htmlFor="overrideTotal">Override total ($)</label>
              <div className="help">Leave blank to use the computed price ({money(quote!.computedTotal)}).</div>
              <input id="overrideTotal" name="overrideTotal" type="text" inputMode="numeric" defaultValue={quote!.overrideTotal ?? ""} />
            </div>
            <div className="q">
              <label className="qlabel" htmlFor="discount">Discount ($)</label>
              <input id="discount" name="discount" type="text" inputMode="numeric" defaultValue={quote!.discount || ""} />
            </div>
            <div className="q">
              <label className="qlabel" htmlFor="actualCharged">Actual charged ($)</label>
              <div className="help">What the client was actually billed — for quoted-vs-actual reporting.</div>
              <input id="actualCharged" name="actualCharged" type="text" inputMode="numeric" defaultValue={quote!.actualCharged ?? ""} />
            </div>
            <div className="q">
              <label className="qlabel" htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" defaultValue={quote!.notes ?? ""} />
            </div>
            <button type="submit" className="btn-primary">Save changes</button>
          </form>

          <div style={{ marginTop: 20 }}>
            <div style={sublabel}>Activity log</div>
            <div className="help" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
              {new Date(quote!.createdAt).toLocaleString()} · Requested by {quote!.createdBy.email}
            </div>
            {[...quote!.edits].reverse().map((e) => (
              <div key={e.id} className="help" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                {new Date(e.createdAt).toLocaleString()} · {e.editedBy.email} · {describeActivity(e)}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <DeleteQuoteButton quoteId={quote!.id} />
          </div>
        </div>
      )}
    </div>
  );
}
