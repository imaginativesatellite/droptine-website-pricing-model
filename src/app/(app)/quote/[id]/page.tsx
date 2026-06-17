import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildProposalData } from "@/lib/proposal-data";
import { money, subtotal, finalPrice } from "@/lib/quote";
import { updateQuote, approveQuote, resendProposalEmail } from "./actions";

const statusPill = (status: string) => {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending approval</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
};

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
  // Staff and admins can view any quote; only admins get the edit/approve controls.

  const isPending = quote!.status === "CUSTOM_PENDING";
  const d = buildProposalData(quote!);

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <Link href="/dashboard" className="help">← Dashboard</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ flex: 1 }}>{quote!.proposalName}</h1>
        {statusPill(quote!.status)}
      </div>
      <p className="lede">
        {quote!.client.name} · code {quote!.code}
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
        <div className="card">
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
            </tbody>
          </table>
          <div className="total"><span>Total</span><span className="big">{money(finalPrice(quote!))}</span></div>
          <div className="monthly">+ {money(quote!.monthly)}/mo</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Link className="btn-secondary" href={`/proposal/${quote!.code}`}>View proposal page</Link>
            <a className="btn-secondary" href={`/api/proposal/${quote!.code}/pdf`}>Download PDF</a>
            {isAdmin && (
              <form action={resendProposalEmail.bind(null, quote!.id)}>
                <button type="submit" className="btn-secondary">Resend email</button>
              </form>
            )}
          </div>
          {isAdmin && quote!.emailStatus && (
            <p className="help" style={{ marginTop: 10, color: quote!.emailStatus === "FAILED" ? "#b3261e" : "var(--muted)" }}>
              Proposal email: <strong>{quote!.emailStatus}</strong>
              {quote!.emailError ? ` — ${quote!.emailError}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--gold)" }}>
          <h3 style={{ marginBottom: 12 }}>Admin</h3>

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

          {quote!.edits.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="label" style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Edit history</div>
              {quote!.edits.map((e) => (
                <div key={e.id} className="help" style={{ padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                  {new Date(e.createdAt).toLocaleString()} · {e.editedBy.email} changed <strong>{e.field}</strong>{" "}
                  {e.oldValue ? `from "${e.oldValue}" ` : ""}to &quot;{e.newValue ?? "—"}&quot;
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
