import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildProposalData } from "@/lib/proposal-data";
import { money, finalPrice, isExpired, asDisclaimers } from "@/lib/quote";
import { leadTimeDays, computeQuote, type PricingAnswers } from "@/lib/pricing";
import ProposalView from "@/components/ProposalView";
import { updateQuote, approveQuote, resendProposalEmail, reactivateQuote, sendForSignature, requestSignature, confirmCompanySignature } from "./actions";
import { documensoEnabled, documensoSignUrl } from "@/lib/documenso";
import DeleteQuoteButton from "./DeleteQuoteButton";
import VisibilityToggle from "./VisibilityToggle";
import AiRecommendation from "./AiRecommendation";
import DisclaimersField from "./DisclaimersField";

// Status pills mirror the dashboard scheme: all quotes are proposals, so there's
// no "Proposal"/"Approved" tag - a ready quote shows no status pill. We surface
// only meaningful states: awaiting approval and where it is in the signature flow.
const statusPills = (q: {
  status: string;
  signatureStatus: string | null;
  clientSignedAt: Date | null;
  companySignedAt: Date | null;
}) => {
  const signed = Boolean(q.clientSignedAt && q.companySignedAt);
  const awaitingCountersign = Boolean(q.clientSignedAt && !q.companySignedAt);
  const sentForSignature = Boolean(
    q.signatureStatus && !q.clientSignedAt && !q.companySignedAt && q.signatureStatus !== "DECLINED",
  );
  return (
    <>
      {q.status === "CUSTOM_PENDING" && <span className="pill gold">Pending approval</span>}
      {signed && <span className="pill signed">Signed</span>}
      {!signed && awaitingCountersign && <span className="pill awaiting">Awaiting signature</span>}
      {!signed && !awaitingCountersign && sentForSignature && (
        <span className="pill awaiting">Sent for signature</span>
      )}
    </>
  );
};

const signatureStatusLabel: Record<string, string> = {
  SENT: "Sent - awaiting signatures",
  PARTIALLY_SIGNED: "Partially signed",
  SIGNED: "Fully signed",
  DECLINED: "Declined",
};

function describeActivity(e: { field: string; oldValue: string | null; newValue: string | null }): string {
  if (e.field === "email") return e.newValue ?? "Email sent";
  if (e.field === "answers") return `Edited answers - ${e.newValue ?? ""}`;
  if (e.field === "status") return `Status: ${e.oldValue ?? "-"} → ${e.newValue ?? "-"}`;
  return `${e.field}: ${e.oldValue ?? "-"} → ${e.newValue ?? "-"}`;
}

const sublabel = { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 };
// Section divider + spacing for the admin card (one clean line between groups).
const section = { marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)" } as const;
const field = { marginBottom: 14 } as const;
// Destructive actions get their own clearly-separated, red-tinted group so
// they read as deliberate, not part of the routine controls above.
const dangerZone = { marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" } as const;

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
  // When an admin is reviewing a pending custom quote, the approval controls are
  // the point of the visit, so float the Admin card to the top and push the
  // request summary + visibility cards beneath it (via flex order, below).
  const reorderAdminReview = isAdmin && isPending;
  const d = buildProposalData(quote!);
  const ans = quote!.answers as Record<string, unknown>;
  const exactPages = typeof ans.pageCountExact === "string" ? ans.pageCountExact : "";
  const extraFunctionality = typeof ans.additionalFunctionality === "string" ? ans.additionalFunctionality : "";
  const existingUrl = ans.existingWebsite === true && typeof ans.existingWebsiteUrl === "string" ? ans.existingWebsiteUrl : "";
  // Admin internal breakdown is always the deterministic engine result computed
  // from the saved answers - even for custom/override quotes, where the
  // member-facing view collapses to a single "Website build" line. This keeps
  // the standard breakdown visible and lets us show how much the custom price
  // added/removed over it.
  const computedBreakdown = computeQuote(ans as unknown as PricingAnswers);
  const isCustomPricing = isPending || quote!.overrideTotal != null;
  // How much the admin's custom price moved off the deterministic standard.
  const customDelta = (quote!.overrideTotal ?? quote!.computedTotal) - quote!.computedTotal;

  // Members can't open an expired quote (no details, no price).
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
    <div className="container" style={{ maxWidth: 820, ...(reorderAdminReview ? { display: "flex", flexDirection: "column" } : {}) }}>
      <Link href="/dashboard" className="backnav">
        <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Dashboard
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <h1 style={{ flex: 1 }}>{quote!.proposalName}</h1>
        {statusPills(quote!)}
        {expired && <span className="pill expired">Expired</span>}
      </div>

      {isPending ? (
        <div className="card" style={reorderAdminReview ? { order: 2, marginTop: 18 } : undefined}>
          <h3 style={{ marginBottom: 8 }}>Custom quote - awaiting approval</h3>
          <ul style={{ marginLeft: 18 }}>
            {quote!.customReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {!isAdmin && <p className="help" style={{ marginTop: 10 }}>We&apos;ll review this and follow up with pricing.</p>}
        </div>
      ) : (
        <ProposalView d={d} publicLink={isAdmin} />
      )}

      {!isAdmin && isCreator && !isPending && (
        <div className="card" style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Accept proposal</div>
          {!documensoEnabled() ? (
            <p className="help">E-signature isn&apos;t set up yet - ask an admin to enable it.</p>
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
                  {quote!.signatureStatus ? "Resend for signature" : "Accept & sign"}
                </button>
              </form>
              <p className="help" style={{ marginTop: 10 }}>
                Sends the proposal to your account email ({quote!.createdBy.email}) to review and sign.
              </p>
            </>
          )}
        </div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--gold)", ...(reorderAdminReview ? { order: 1 } : {}) }}>
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

          {/* Breakdown - always the deterministic engine result, so the standard
              build cost stays visible even on custom/override quotes. */}
          <div style={expired ? section : { marginTop: 16 }}>
            <div style={sublabel}>{isPending ? "Selection summary (suggested)" : "Internal breakdown"}</div>
            <table className="simple">
              <tbody>
                {computedBreakdown.lineItems.map((li, i) => (
                  <tr key={i}><td>{li.label}</td><td className="amt">{money(li.amount)}</td></tr>
                ))}
                {/* Standard, deterministic total from the pricing engine. */}
                <tr>
                  <td>{isCustomPricing ? "Standard total (computed)" : "Subtotal"}</td>
                  <td className="amt">{money(quote!.computedTotal)}</td>
                </tr>
                {/* On a custom/override quote, show how much the custom price moved
                    off the standard - positive = added, negative = removed. */}
                {isCustomPricing && quote!.overrideTotal != null && (
                  <tr style={{ color: customDelta < 0 ? "var(--good)" : "var(--ink)" }}>
                    <td>Custom functionality adjustment</td>
                    <td className="amt">
                      {customDelta > 0 ? "+" : customDelta < 0 ? "−" : ""}{money(Math.abs(customDelta))}
                    </td>
                  </tr>
                )}
                {quote!.discount > 0 && (
                  <tr style={{ color: "var(--good)" }}><td>Discount</td><td className="amt">−{money(quote!.discount)}</td></tr>
                )}
                <tr>
                  <td style={{ fontSize: "1.02rem", paddingTop: 10 }}>
                    <strong>{isPending ? "Suggested total" : isCustomPricing ? "Custom quote price" : "Total"}</strong>
                  </td>
                  <td className="amt" style={{ fontSize: "1.05rem", paddingTop: 10 }}><strong>{money(finalPrice(quote!))}</strong></td>
                </tr>
              </tbody>
            </table>
            {/* What pushed this into a custom quote. */}
            {quote!.customReasons.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={sublabel}>What triggered the custom quote</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.9rem" }}>
                  {quote!.customReasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {!isPending && (
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                <form action={resendProposalEmail.bind(null, quote!.id)}>
                  <button type="submit" className="btn-secondary">Resend email</button>
                </form>
                {quote!.emailStatus && (
                  <span className="help" style={{ color: quote!.emailStatus === "FAILED" ? "#b3261e" : "var(--muted)" }}>
                    Email: <strong>{quote!.emailStatus}</strong>{quote!.emailError ? ` - ${quote!.emailError}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* E-signature (Documenso) - available once there's a proposal to sign */}
          {!isPending && (
            <div style={section}>
              <div style={sublabel}>E-signature</div>
              {!documensoEnabled() ? (
                <p className="help">Documenso isn&apos;t configured - set DOCUMENSO_API_KEY and DOCUMENSO_COMPANY_EMAIL in the environment to enable this.</p>
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
                      {quote!.companySignedByName} started the company signature below - waiting on Documenso to confirm completion.
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

          {/* Request details + AI recommendation - custom quotes only */}
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
              <div style={sublabel}>AI recommendation</div>
              <p className="help" style={{ marginBottom: 10 }}>
                Suggests a one-time price, turnaround, monthly cost, and a proposed scope from the
                selections and the complex functionality requested. Copy any value into the fields below.
              </p>
              <AiRecommendation quoteId={quote!.id} />
            </div>
          )}

          {/* Approve - custom quotes only (editing is hidden until approved) */}
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
                  <DisclaimersField initial={asDisclaimers(quote!.disclaimers)} />
                </div>
                <button type="submit" className="btn-gold">Approve &amp; send</button>
                <p className="help" style={{ marginTop: 10 }}>Approving emails the requester the PDF and a link to their quotes.</p>
              </form>
            </div>
          )}

          {/* Edit - available once it's no longer a pending custom quote */}
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
                  <div className="help" style={{ marginTop: 4 }}>What the client was actually billed - for quoted-vs-actual reporting.</div>
                </div>
                <div style={field}>
                  <label className="qlabel" htmlFor="priceReason">Reason for price adjustment (optional)</label>
                  <input id="priceReason" name="priceReason" type="text" defaultValue={quote!.priceReason ?? ""} />
                  <div className="help" style={{ marginTop: 4 }}>Internal note on why this was charged more or less - feeds future AI pricing review.</div>
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
                  <DisclaimersField initial={asDisclaimers(quote!.disclaimers)} />
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
          <details style={section}>
            <summary style={{ ...sublabel, marginBottom: 0, cursor: "pointer" }}>
              Activity log ({quote!.edits.length + 1})
            </summary>
            <div style={{ marginTop: 10 }}>
              <div className="help" style={{ padding: "3px 0" }}>
                {new Date(quote!.createdAt).toLocaleString()} · Requested by {quote!.createdBy.email}
              </div>
              {[...quote!.edits].reverse().map((e) => (
                <div key={e.id} className="help" style={{ padding: "3px 0" }}>
                  {new Date(e.createdAt).toLocaleString()} · {e.editedBy.email} · {describeActivity(e)}
                </div>
              ))}
            </div>
          </details>

          {/* Danger zone - destructive, kept apart from routine controls */}
          <div style={dangerZone}>
            <div style={{ ...sublabel, color: "#b3261e", marginBottom: 6 }}>Danger zone</div>
            <p className="help" style={{ marginTop: 0, marginBottom: 10 }}>
              Permanently deletes this proposal and its history. This can&apos;t be undone.
            </p>
            <DeleteQuoteButton quoteId={quote!.id} />
          </div>
        </div>
      )}

      {/* Visibility - collapsed by default and kept last, mirroring the activity
          log. The toggle/design is unchanged; only its container is collapsible. */}
      {(isAdmin || isCreator) && (
        <details className="card" style={{ marginTop: 18, ...(reorderAdminReview ? { order: 99 } : {}) }}>
          <summary style={{ fontWeight: 600, cursor: "pointer" }}>Visibility</summary>
          <div style={{ marginTop: 12 }}>
            <VisibilityToggle quoteId={quote!.id} shared={quote!.shared} isCreator={isCreator} />
          </div>
        </details>
      )}
    </div>
  );
}
