import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildProposalData } from "@/lib/proposal-data";
import { money, subtotal, finalPrice, isExpired } from "@/lib/quote";
import { leadTimeDays } from "@/lib/pricing";
import ProposalView from "@/components/ProposalView";
import { updateQuote, approveQuote, resendProposalEmail, reactivateQuote, sendForSignature, requestSignature, confirmCompanySignature } from "./actions";
import { documensoEnabled, documensoSignUrl } from "@/lib/documenso";
import DeleteQuoteButton from "./DeleteQuoteButton";
import VisibilityToggle from "./VisibilityToggle";
import AiRecommendation from "./AiRecommendation";

const statusPill = (status: string) => {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending approval</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
};

const signatureStatusLabel: Record<string, string> = {
  SENT: "Sent — awaiting signatures",
  PARTIALLY_SIGNED: "Partially signed",
  SIGNED: "Fully signed",
  DECLINED: "Declined",
};

function describeActivity(e: { field: string; oldValue: string | null; newValue: string | null }): string {
  if (e.field === "email") return e.newValue ?? "Email sent";
  if (e.field === "answers") return `Edited answers — ${e.newValue ?? ""}`;
  if (e.field === "status") return `Status: ${e.oldValue ?? "—"} → ${e.newValue ?? "—"}`;
  return `${e.field}: ${e.oldValue ?? "—"} → ${e.newValue ?? "—"}`;
}

const sublabel = { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 };
// Section divider + spacing for the admin card (one clean line between groups).
const section = { marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)" } as const;
const field = { marginBottom: 14 } as const;

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

  const isCreator = quote!.createdById === user.id;
  // Private to the creator (and admins) unless shared with everyone.
  if (!isAdmin && !isCreator && !quote!.shared) notFound();

  const expired = isExpired(quote!);
  const isPending = quote!.status === "CUSTOM_PENDING";
  const d = buildProposalData(quote!);
  const ans = quote!.answers as Record<string, unknown>;
  const exactPages = typeof ans.pageCountExact === "string" ? ans.pageCountExact : "";
  const extraFunctionality = typeof ans.additionalFunctionality === "string" ? ans.additionalFunctionality : "";
  const existingUrl = ans.existingWebsite === true && typeof ans.existingWebsiteUrl === "string" ? ans.existingWebsiteUrl : "";

  // Staff can't open an expired quote (no details, no price).
  if (!isAdmin && expired) {
    return (
      <div className="container" style={{ maxWidth: 560 }}>
        <Link href="/dashboard" className="backnav">
          <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Dashboard
        </Link>
        <h1>{quote!.proposalName}</h1>
        <div className="card">
          <span className="pill expired">Expired</span>
          <p className="help" style={{ marginTop: 12 }}>
            This proposal has expired. Ask an admin to reactivate it if you still need it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <Link href="/dashboard" className="backnav">
        <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Dashboard
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <h1 style={{ flex: 1 }}>{quote!.proposalName}</h1>
        {expired && <span className="pill expired">Expired</span>}
        {statusPill(quote!.status)}
      </div>

      {isPending ? (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Custom quote — awaiting approval</h3>
          <ul style={{ marginLeft: 18 }}>
            {quote!.customReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {!isAdmin && <p className="help" style={{ marginTop: 10 }}>We&apos;ll review this and follow up with pricing.</p>}
        </div>
      ) : (
        <ProposalView d={d} publicLink={isAdmin} />
      )}

      {(isAdmin || isCreator) && (
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Visibility</div>
          <VisibilityToggle quoteId={quote!.id} shared={quote!.shared} isCreator={isCreator} />
        </div>
      )}

      {!isAdmin && isCreator && !isPending && (
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Signature</div>
          {!documensoEnabled() ? (
            <p className="help">E-signature isn&apos;t set up yet — ask an admin to enable it.</p>
          ) : !quote!.client.email ? (
            <p className="help">No email on file for this client yet — ask an admin to add one before requesting a signature.</p>
          ) : (
            <>
              {quote!.signatureStatus && (
                <p style={{ margin: "0 0 10px" }}>
                  <strong>{signatureStatusLabel[quote!.signatureStatus] ?? quote!.signatureStatus}</strong>
                  {quote!.signatureSentAt && ` · sent ${new Date(quote!.signatureSentAt).toLocaleString()}`}
                </p>
              )}
              <form action={requestSignature.bind(null, quote!.id)}>
                <button type="submit" className="btn-gold">
                  {quote!.signatureStatus ? "Resend Proposal" : "Sign Proposal"}
                </button>
              </form>
              <p className="help" style={{ marginTop: 10 }}>
                Sends the proposal to {quote!.client.email} for signature.
              </p>
            </>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--gold)" }}>
          <h3 style={{ marginBottom: 2 }}>Admin</h3>

          {expired && (
            <div style={{ marginTop: 16 }}>
              <div style={sublabel}>Expired</div>
              <p className="help" style={{ marginBottom: 10 }}>
                The 60-day validity has passed. Reactivating resets the date, refreshes pricing to the current model,
                issues a new link, and <strong>auto-emails the new link to the requester</strong>.
              </p>
              <form action={reactivateQuote.bind(null, quote!.id)}>
                <button type="submit" className="btn-gold">Reactivate</button>
              </form>
            </div>
          )}

          {/* Breakdown */}
          <div style={expired ? section : { marginTop: 16 }}>
            <div style={sublabel}>{isPending ? "Selection summary (suggested)" : "Internal breakdown"}</div>
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
                <tr><td><strong>{isPending ? "Suggested total" : "Total"}</strong></td><td className="amt"><strong>{money(finalPrice(quote!))}</strong></td></tr>
              </tbody>
            </table>
            {!isPending && (
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
            )}
          </div>

          {/* E-signature (Documenso) — available once there's a proposal to sign */}
          {!isPending && (
            <div style={section}>
              <div style={sublabel}>E-signature</div>
              {!documensoEnabled() ? (
                <p className="help">Documenso isn&apos;t configured — set DOCUMENSO_API_KEY and DOCUMENSO_COMPANY_EMAIL in the environment to enable this.</p>
              ) : (
                <>
                  {quote!.signatureStatus && (
                    <p style={{ margin: "0 0 4px" }}>
                      <strong>{signatureStatusLabel[quote!.signatureStatus] ?? quote!.signatureStatus}</strong>
                      {quote!.signatureSentAt && ` · sent ${new Date(quote!.signatureSentAt).toLocaleString()}`}
                      {quote!.signedDocumentUrl && (
                        <> · <a href={quote!.signedDocumentUrl} target="_blank" rel="noreferrer">View signed document</a></>
                      )}
                    </p>
                  )}
                  {quote!.clientSignedAt && (
                    <p className="help" style={{ margin: "0 0 2px" }}>
                      Client signed {new Date(quote!.clientSignedAt).toLocaleString()}
                    </p>
                  )}
                  {quote!.companySignedAt ? (
                    <p className="help" style={{ margin: "0 0 10px" }}>
                      {quote!.companySignedByName ?? "An admin"} signed as Luna Creative {new Date(quote!.companySignedAt).toLocaleString()}
                    </p>
                  ) : quote!.companySignedById ? (
                    <p className="help" style={{ margin: "0 0 10px" }}>
                      {quote!.companySignedByName} started the company signature below — waiting on Documenso to confirm completion.
                    </p>
                  ) : (
                    <div style={{ marginBottom: 10 }} />
                  )}

                  <form action={sendForSignature.bind(null, quote!.id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ ...field, marginBottom: 0, flex: 1, minWidth: 220 }}>
                      <label className="qlabel" htmlFor="clientEmail">Client email</label>
                      <input id="clientEmail" name="clientEmail" type="email" defaultValue={quote!.client.email ?? ""} required />
                    </div>
                    <button type="submit" className="btn-gold">
                      {quote!.signatureStatus ? "Resend for signature" : "Send for signature"}
                    </button>
                  </form>

                  {quote!.clientSignedAt && quote!.companySigningToken && !quote!.companySignedAt && (
                    <div style={{ marginTop: 16 }}>
                      {!quote!.companySignedById ? (
                        <form action={confirmCompanySignature.bind(null, quote!.id)}>
                          <button type="submit" className="btn-gold">Sign as Luna Creative</button>
                        </form>
                      ) : (
                        <iframe
                          src={documensoSignUrl(quote!.companySigningToken)}
                          style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 10 }}
                          title="Sign as Luna Creative"
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Request details + AI recommendation — custom quotes only */}
          {isPending && (extraFunctionality || exactPages || existingUrl) && (
            <div style={section}>
              <div style={sublabel}>Request details</div>
              {exactPages && <p style={{ margin: "0 0 8px" }}><strong>Pages requested:</strong> {exactPages}</p>}
              {existingUrl && <p style={{ margin: "0 0 8px" }}><strong>Existing site:</strong> {existingUrl}</p>}
              {extraFunctionality && (
                <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}><strong>Complex functionality:</strong> {extraFunctionality}</p>
              )}
            </div>
          )}

          {isPending && (
            <div style={section}>
              <div style={sublabel}>AI price recommendation</div>
              <p className="help" style={{ marginBottom: 10 }}>
                Suggests a one-time price (with reasoning) from the selections and the complex functionality requested.
              </p>
              <AiRecommendation quoteId={quote!.id} />
            </div>
          )}

          {/* Approve — custom quotes only (editing is hidden until approved) */}
          {isPending && (
            <div style={section}>
              <div style={sublabel}>Approve custom quote</div>
              <form action={approveQuote.bind(null, quote!.id)}>
                <div style={field}>
                  <label className="qlabel" htmlFor="approve-price">Approved price ($)<span className="req">*</span></label>
                  <input id="approve-price" name="overrideTotal" type="text" inputMode="numeric" defaultValue={quote!.computedTotal || ""} required />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="approve-lead">Turnaround (business days)</label>
                  <input id="approve-lead" name="leadDaysOverride" type="text" inputMode="numeric" defaultValue={quote!.leadDaysOverride ?? leadTimeDays(finalPrice(quote!))} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="approve-monthly">Monthly ($)</label>
                  <input id="approve-monthly" name="monthly" type="text" inputMode="numeric" defaultValue={quote!.monthly} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="approve-scope">Scope</label>
                  <textarea id="approve-scope" name="scopeSummary" defaultValue={quote!.scopeSummary ?? ""} style={{ minHeight: 110 }} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="approve-disc">Additional disclaimer (optional)</label>
                  <textarea id="approve-disc" name="customDisclaimer" defaultValue={quote!.customDisclaimer ?? ""} />
                  <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: "0.9rem" }}>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="customDisclaimerPlacement" value="development" defaultChecked={quote!.customDisclaimerPlacement !== "monthly"} /> Website price</label>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="customDisclaimerPlacement" value="monthly" defaultChecked={quote!.customDisclaimerPlacement === "monthly"} /> Monthly</label>
                  </div>
                </div>
                <button type="submit" className="btn-gold">Approve &amp; send</button>
                <p className="help" style={{ marginTop: 10 }}>Approving emails the requester the PDF and a link to their quotes.</p>
              </form>
            </div>
          )}

          {/* Edit — available once it's no longer a pending custom quote */}
          {!isPending && (
            <div style={section}>
              <div style={sublabel}>Edit</div>
              <div style={{ marginBottom: 16 }}>
                <Link href={`/quote/${quote!.id}/edit`} className="btn-secondary">Edit answers</Link>
              </div>
              <form action={updateQuote.bind(null, quote!.id)}>
                <div style={field}>
                  <label className="qlabel" htmlFor="proposalName">Proposal name</label>
                  <input id="proposalName" name="proposalName" type="text" defaultValue={quote!.proposalName} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="overrideTotal">Override total ($)</label>
                  <input id="overrideTotal" name="overrideTotal" type="text" inputMode="numeric" defaultValue={quote!.overrideTotal ?? ""} />
                  <div className="help" style={{ marginTop: 4 }}>Leave blank to use the computed price ({money(quote!.computedTotal)}).</div>
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="discount">Discount ($)</label>
                  <input id="discount" name="discount" type="text" inputMode="numeric" defaultValue={quote!.discount || ""} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="actualCharged">Actual charged ($)</label>
                  <input id="actualCharged" name="actualCharged" type="text" inputMode="numeric" defaultValue={quote!.actualCharged ?? ""} />
                  <div className="help" style={{ marginTop: 4 }}>What the client was actually billed — for quoted-vs-actual reporting.</div>
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="leadDaysOverride">Turnaround (business days)</label>
                  <input id="leadDaysOverride" name="leadDaysOverride" type="text" inputMode="numeric" defaultValue={quote!.leadDaysOverride ?? ""} />
                  <div className="help" style={{ marginTop: 4 }}>Leave blank to use the price-based default.</div>
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="monthly">Monthly ($)</label>
                  <input id="monthly" name="monthly" type="text" inputMode="numeric" defaultValue={quote!.monthly} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="scopeSummary">Scope</label>
                  <textarea id="scopeSummary" name="scopeSummary" defaultValue={quote!.scopeSummary ?? ""} style={{ minHeight: 110 }} />
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="customDisclaimer">Additional disclaimer (optional)</label>
                  <textarea id="customDisclaimer" name="customDisclaimer" defaultValue={quote!.customDisclaimer ?? ""} />
                  <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: "0.9rem" }}>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="customDisclaimerPlacement" value="development" defaultChecked={quote!.customDisclaimerPlacement !== "monthly"} /> Website price</label>
                    <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="customDisclaimerPlacement" value="monthly" defaultChecked={quote!.customDisclaimerPlacement === "monthly"} /> Monthly</label>
                  </div>
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" defaultValue={quote!.notes ?? ""} />
                </div>
                <button type="submit" className="btn-primary">Save changes</button>
              </form>
            </div>
          )}

          {/* Activity log */}
          <div style={section}>
            <div style={sublabel}>Activity log</div>
            <div className="help" style={{ padding: "3px 0" }}>
              {new Date(quote!.createdAt).toLocaleString()} · Requested by {quote!.createdBy.email}
            </div>
            {[...quote!.edits].reverse().map((e) => (
              <div key={e.id} className="help" style={{ padding: "3px 0" }}>
                {new Date(e.createdAt).toLocaleString()} · {e.editedBy.email} · {describeActivity(e)}
              </div>
            ))}
          </div>

          {/* Danger */}
          <div style={section}>
            <DeleteQuoteButton quoteId={quote!.id} />
          </div>
        </div>
      )}
    </div>
  );
}
