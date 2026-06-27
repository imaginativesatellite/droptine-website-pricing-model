"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { computeQuote, priceQuote, leadTimeDays, PRICING_RULES, type PricingAnswers } from "@/lib/pricing";
import { generatePublicCode } from "@/lib/code";
import { recommendCustomPrice as aiRecommendCustomPrice, type CustomRecommendation } from "@/lib/anthropic";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";
import { sendApprovedQuoteToRequester, sendProposalToMember } from "@/lib/email";
import { appUrl, finalPrice, isExpired, asDisclaimers, MAX_DISCLAIMERS, type Disclaimer } from "@/lib/quote";
import { documensoEnabled, sendEnvelopeForSignature, getEnvelopeStatus } from "@/lib/documenso";
import { syncSignatureFromRecipients } from "@/lib/signature-sync";

type RawAnswers = Record<string, string | boolean | string[] | undefined>;

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  if (v === true) return "Yes";
  if (v === false) return "No";
  return String(v);
}

function summarizeAnswerChanges(before: Record<string, unknown>, after: RawAnswers): string {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) {
      changes.push(`${k}: ${fmt(before[k])} → ${fmt(after[k])}`);
    }
  }
  return changes.join("; ");
}

async function logEdit(
  quoteId: string,
  editedById: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) {
  if (oldValue === newValue) return;
  await prisma.quoteEdit.create({ data: { quoteId, editedById, field, oldValue, newValue } });
}

function toInt(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Reads up to MAX_DISCLAIMERS single-line disclaimers from fields named
 *  `disclaimerText{i}` / `disclaimerPlacement{i}`, dropping empty ones. */
function parseDisclaimers(formData: FormData): Disclaimer[] {
  const out: Disclaimer[] = [];
  for (let i = 0; i < MAX_DISCLAIMERS; i++) {
    const text = String(formData.get(`disclaimerText${i}`) ?? "").trim();
    if (!text) continue;
    const placement = formData.get(`disclaimerPlacement${i}`) === "monthly" ? "monthly" : "development";
    out.push({ text, placement });
  }
  return out;
}

function disclaimersJson(disclaimers: Disclaimer[]) {
  return disclaimers.length ? (disclaimers as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
}

/** Admin: edit a quote (name, override, discount, actual charged, notes) with audit logging. */
export async function updateQuote(quoteId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found.");

  const proposalName = String(formData.get("proposalName") ?? quote.proposalName).trim();
  const overrideTotal = toInt(formData.get("overrideTotal"));
  const discount = toInt(formData.get("discount")) ?? 0;
  const actualCharged = toInt(formData.get("actualCharged"));
  const priceReason = String(formData.get("priceReason") ?? "").trim() || null;
  const leadDaysOverride = toInt(formData.get("leadDaysOverride"));
  const monthly = toInt(formData.get("monthly")) ?? quote.monthly;
  const scopeSummary = formData.get("scopeSummary") != null ? String(formData.get("scopeSummary")) : quote.scopeSummary;
  const disclaimers = parseDisclaimers(formData);
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;

  await logEdit(quoteId, admin.id, "proposalName", quote.proposalName, proposalName);
  await logEdit(quoteId, admin.id, "overrideTotal", quote.overrideTotal?.toString() ?? null, overrideTotal?.toString() ?? null);
  await logEdit(quoteId, admin.id, "discount", quote.discount.toString(), discount.toString());
  await logEdit(quoteId, admin.id, "actualCharged", quote.actualCharged?.toString() ?? null, actualCharged?.toString() ?? null);
  await logEdit(quoteId, admin.id, "priceReason", quote.priceReason ?? null, priceReason);
  await logEdit(quoteId, admin.id, "leadDaysOverride", quote.leadDaysOverride?.toString() ?? null, leadDaysOverride?.toString() ?? null);
  await logEdit(quoteId, admin.id, "monthly", quote.monthly.toString(), monthly.toString());
  await logEdit(quoteId, admin.id, "scope", quote.scopeSummary ?? null, scopeSummary ?? null);
  await logEdit(quoteId, admin.id, "disclaimers", JSON.stringify(asDisclaimers(quote.disclaimers)), JSON.stringify(disclaimers));
  await logEdit(quoteId, admin.id, "notes", quote.notes ?? null, notes);

  await prisma.quote.update({
    where: { id: quoteId },
    data: { proposalName, overrideTotal, discount, actualCharged, priceReason, leadDaysOverride, monthly, scopeSummary, disclaimers: disclaimersJson(disclaimers), notes },
  });

  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: approve a custom quote at a set price, then email the requester the PDF. */
export async function approveQuote(quoteId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { createdBy: true, client: true },
  });
  if (!quote) throw new Error("Quote not found.");
  // Guards against a double-submit (e.g. a fast double-click before the page
  // re-renders) re-running approval and emailing the requester twice.
  if (quote.status !== "CUSTOM_PENDING") throw new Error("This quote has already been approved.");

  const price = toInt(formData.get("overrideTotal"));
  if (price == null) throw new Error("Enter an approved price.");
  const leadDaysOverride = toInt(formData.get("leadDaysOverride"));
  const monthly = toInt(formData.get("monthly")) ?? quote.monthly;
  const scopeSummary = formData.get("scopeSummary") != null ? String(formData.get("scopeSummary")) : quote.scopeSummary;
  const disclaimers = parseDisclaimers(formData);

  await logEdit(quoteId, admin.id, "overrideTotal", quote.overrideTotal?.toString() ?? null, price.toString());
  await logEdit(quoteId, admin.id, "leadDaysOverride", quote.leadDaysOverride?.toString() ?? null, leadDaysOverride?.toString() ?? null);
  await logEdit(quoteId, admin.id, "monthly", quote.monthly.toString(), monthly.toString());
  await logEdit(quoteId, admin.id, "scope", quote.scopeSummary ?? null, scopeSummary ?? null);
  await logEdit(quoteId, admin.id, "disclaimers", JSON.stringify(asDisclaimers(quote.disclaimers)), JSON.stringify(disclaimers));
  await logEdit(quoteId, admin.id, "status", quote.status, "APPROVED");

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    // Approval resets the 60-day validity window.
    data: { overrideTotal: price, leadDaysOverride, monthly, scopeSummary, disclaimers: disclaimersJson(disclaimers), status: "APPROVED", approvedById: admin.id, approvedAt: new Date(), validFrom: new Date() },
    include: { client: true, createdBy: true },
  });

  try {
    const pdf = await renderProposalPdf(buildProposalData(updated));
    await sendApprovedQuoteToRequester({
      requesterEmail: quote.createdBy.email,
      proposalName: updated.proposalName,
      total: finalPrice(updated),
      monthly: updated.monthly,
      code: updated.publicCode,
      dashboardUrl: `${appUrl()}/dashboard`,
      pdf,
    });
    await prisma.quote.update({ where: { id: quoteId }, data: { emailStatus: "SENT", emailError: null } });
  } catch (e) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { emailStatus: "FAILED", emailError: e instanceof Error ? e.message : String(e) },
    });
  }

  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: reactivate an expired quote - reset the 60-day window and refresh
 *  the computed pricing to the current model (override, if any, is kept). */
export async function reactivateQuote(quoteId: string): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found.");
  // Reactivation is only meaningful for an expired quote (it resets the 60-day
  // window and issues a fresh link). Guard against it firing on a live one.
  if (!isExpired(quote)) throw new Error("This quote hasn't expired - nothing to reactivate.");

  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  const result = priceQuote(quote.answers as unknown as PricingAnswers, settings?.adjustmentPct ?? 0);
  // Issue a fresh public code so the expired URL can never be used again.
  let publicCode = generatePublicCode();
  for (let i = 0; i < 6; i++) {
    const clash = await prisma.quote.findUnique({ where: { publicCode } });
    if (!clash) break;
    publicCode = generatePublicCode();
  }
  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      validFrom: new Date(),
      publicCode,
      computedTotal: result.total,
      monthly: result.monthly,
      rushDays: result.rushDays ?? null,
      lineItems: result.lineItems as unknown as Prisma.InputJsonValue,
      customReasons: result.reasons,
    },
    include: { createdBy: true, client: true },
  });
  await logEdit(quoteId, admin.id, "reactivated", null, "Reset 60-day validity; new link; refreshed pricing");

  // Auto-resend the new link to the requester (proposals/approved quotes only).
  if (updated.status !== "CUSTOM_PENDING") {
    try {
      const pdf = await renderProposalPdf(buildProposalData(updated));
      await sendProposalToMember({
        memberEmail: updated.createdBy.email,
        proposalName: updated.proposalName,
        total: finalPrice(updated),
        monthly: updated.monthly,
        code: updated.publicCode,
        pdf,
      });
      await prisma.quote.update({ where: { id: quoteId }, data: { emailStatus: "SENT", emailError: null } });
    } catch (e) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { emailStatus: "FAILED", emailError: e instanceof Error ? e.message : String(e) },
      });
    }
  }
  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: AI recommendation of a custom-quote price + reasoning. */
export async function recommendPriceAction(quoteId: string): Promise<CustomRecommendation | { error: string }> {
  await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { error: "Quote not found." };

  const answers = quote.answers as Record<string, unknown>;
  const result = computeQuote(answers as unknown as PricingAnswers);
  return aiRecommendCustomPrice({
    proposalName: quote.proposalName,
    lineItems: result.lineItems,
    customReasons: quote.customReasons,
    additionalFunctionality: typeof answers.additionalFunctionality === "string" ? answers.additionalFunctionality : undefined,
    pageCountExact: typeof answers.pageCountExact === "string" ? answers.pageCountExact : undefined,
    answers: answers as unknown as PricingAnswers,
    standardTotal: quote.computedTotal,
    standardMonthly: quote.monthly,
    standardLeadDays: quote.leadDaysOverride ?? leadTimeDays(quote.computedTotal),
    min: PRICING_RULES.min,
    max: PRICING_RULES.max,
  });
}

/** Creator or admin: toggle whether the quote is viewable by all members. */
export async function setShared(quoteId: string, shared: boolean): Promise<void> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { createdById: true } });
  if (!quote) throw new Error("Quote not found.");
  if (user.role !== "ADMIN" && quote.createdById !== user.id) throw new Error("Not allowed.");
  await prisma.quote.update({ where: { id: quoteId }, data: { shared } });
  revalidatePath(`/quote/${quoteId}`);
}

export type EditAnswersResult = { error: string } | void;

/** Admin: edit the questionnaire answers, recompute the price, and log the change. */
export async function editAnswers(quoteId: string, answers: RawAnswers): Promise<EditAnswersResult> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { error: "Quote not found - it may have been deleted." };

  const pricing = answers as PricingAnswers;
  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  const result = priceQuote(pricing, settings?.adjustmentPct ?? 0);
  const proposalName = String(answers.proposalName ?? quote.proposalName).trim() || quote.proposalName;

  const summary = summarizeAnswerChanges(quote.answers as Record<string, unknown>, answers);
  await prisma.quoteEdit.create({
    data: { quoteId, editedById: admin.id, field: "answers", oldValue: null, newValue: summary || "answers updated" },
  });

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      proposalName,
      answers: JSON.parse(JSON.stringify(pricing)) as Prisma.InputJsonValue,
      computedTotal: result.total,
      monthly: result.monthly,
      rushDays: result.rushDays ?? null,
      lineItems: result.lineItems as unknown as Prisma.InputJsonValue,
      customReasons: result.reasons,
    },
  });

  redirect(`/quote/${quoteId}`);
}

export type DeleteResult = { error: string } | void;

/** Admin: permanently delete a quote (its edit history cascades). Also removes
 *  the client if it has no remaining quotes, so its name leaves the suggestions. */
export async function deleteQuote(quoteId: string): Promise<DeleteResult> {
  await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { clientId: true } });
  if (!quote) return { error: "Quote not found - it may have already been deleted." };

  try {
    await prisma.quote.delete({ where: { id: quoteId } });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't delete this quote." };
  }

  const remaining = await prisma.quote.count({ where: { clientId: quote.clientId } });
  if (remaining === 0) {
    await prisma.client.delete({ where: { id: quote.clientId } }).catch(() => {});
  }
  redirect("/dashboard");
}

/** Renders the proposal PDF, creates the two-recipient Documenso envelope,
 *  and saves the resulting tokens/status onto the quote - shared by the
 *  admin-driven send (custom email entry) and the member one-click request
 *  (uses the client's email already on file). */
async function dispatchSignatureEnvelope(
  quote: Prisma.QuoteGetPayload<{ include: { client: true; createdBy: true } }>,
  clientEmail: string,
  signerName?: string,
): Promise<void> {
  const pdf = await renderProposalPdf(buildProposalData(quote));
  const { envelopeId, clientToken, companyToken, raw } = await sendEnvelopeForSignature({
    title: `${quote.proposalName} - Proposal`,
    pdf,
    clientEmail,
    clientName: signerName ?? quote.client.name,
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      signatureStatus: "SENT",
      signatureEnvelopeId: envelopeId,
      signatureSentAt: new Date(),
      clientSigningToken: clientToken,
      clientSignedAt: null,
      companySigningToken: companyToken,
      companySignedAt: null,
      companySignedById: null,
      companySignedByName: null,
      signedDocumentUrl: null,
      signatureMeta: raw as Prisma.InputJsonValue,
    },
  });
}

/** Admin: send the proposal out for e-signature via Documenso. Saves the
 *  client's email onto the Client record (if new/changed) and creates a
 *  two-recipient envelope - the client signs first, then any admin can
 *  complete the shared company signature (see confirmCompanySignature). */
export async function sendForSignature(quoteId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!documensoEnabled()) {
    throw new Error("Documenso isn't configured - set DOCUMENSO_API_KEY and DOCUMENSO_COMPANY_EMAIL in the environment.");
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { client: true, createdBy: true } });
  if (!quote) throw new Error("Quote not found.");
  if (quote.status === "CUSTOM_PENDING") throw new Error("Approve this quote before sending it for signature.");

  const email = String(formData.get("clientEmail") ?? "").trim();
  if (!email) throw new Error("Enter the member's email to send for signature.");

  if (email !== quote.client.email) {
    await prisma.client.update({ where: { id: quote.client.id }, data: { email } });
  }

  await dispatchSignatureEnvelope(quote, email);
  await logEdit(quoteId, admin.id, "signature", null, `Sent for signature to ${email}`);

  revalidatePath(`/quote/${quoteId}`);
}

/** Member (creator) or admin: one-click request to accept/sign the proposal.
 *  The signer is the member the proposal was prepared for (Droptine) - i.e. the
 *  quote's creator - NOT the member's own downstream client. We use the
 *  creator's account email, so there's never anything for an admin to "add."
 *  Logged immediately, but admins aren't emailed until the proposal is actually
 *  signed (see the Documenso webhook handler) - nothing for them to do until then. */
export async function requestSignature(quoteId: string): Promise<void> {
  const user = await requireUser();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { client: true, createdBy: true } });
  if (!quote) throw new Error("Quote not found.");
  if (user.role !== "ADMIN" && quote.createdById !== user.id) throw new Error("Not allowed.");
  if (!documensoEnabled()) {
    throw new Error("Documenso isn't configured - set DOCUMENSO_API_KEY and DOCUMENSO_COMPANY_EMAIL in the environment.");
  }
  if (quote.status === "CUSTOM_PENDING") throw new Error("Approve this quote before sending it for signature.");

  const email = quote.createdBy.email;
  if (!email) throw new Error("No account email on file for the proposal owner.");

  await dispatchSignatureEnvelope(quote, email, quote.createdBy.name);
  await logEdit(quoteId, user.id, "signature", null, `${user.name} requested a signature from ${email}`);

  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: record which admin completed the shared "Luna Creative" signature.
 *  Documenso only ever sees one shared recipient - this captures *which*
 *  logged-in admin clicked through, before they sign in the embedded iframe. */
export async function confirmCompanySignature(quoteId: string): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found.");
  if (!quote.companySigningToken) throw new Error("This quote hasn't been sent for signature yet.");
  if (!quote.clientSignedAt) throw new Error("Waiting on the client's signature first.");

  await prisma.quote.update({
    where: { id: quoteId },
    data: { companySignedById: admin.id, companySignedByName: admin.name },
  });
  await logEdit(quoteId, admin.id, "signature", null, `${admin.name} signed as Luna Creative`);

  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: manual fallback for a missed Documenso webhook delivery (instance
 *  restart, network blip, webhook misconfigured) - pulls the envelope's live
 *  recipient status directly from Documenso and re-syncs the quote through
 *  the same logic the webhook uses (see syncSignatureFromRecipients), so the
 *  two paths can never disagree. */
export async function syncSignatureStatus(quoteId: string): Promise<void> {
  await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { createdBy: true } });
  if (!quote) throw new Error("Quote not found.");
  if (!quote.signatureEnvelopeId) throw new Error("This quote hasn't been sent for signature yet.");

  const envelope = await getEnvelopeStatus(quote.signatureEnvelopeId);
  await syncSignatureFromRecipients(quote, envelope.recipients ?? [], envelope);

  revalidatePath(`/quote/${quoteId}`);
}

/** Admin: re-send the proposal email (with PDF) to the member who created it. */
export async function resendProposalEmail(quoteId: string): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { createdBy: true, client: true },
  });
  if (!quote) throw new Error("Quote not found.");
  if (quote.status === "CUSTOM_PENDING") throw new Error("No proposal to send yet - approve it first.");

  try {
    const pdf = await renderProposalPdf(buildProposalData(quote));
    await sendProposalToMember({
      memberEmail: quote.createdBy.email,
      proposalName: quote.proposalName,
      total: finalPrice(quote),
      monthly: quote.monthly,
      code: quote.publicCode,
      pdf,
    });
    await prisma.quote.update({ where: { id: quoteId }, data: { emailStatus: "SENT", emailError: null } });
    await logEdit(quoteId, admin.id, "email", null, "Proposal email re-sent");
  } catch (e) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { emailStatus: "FAILED", emailError: e instanceof Error ? e.message : String(e) },
    });
  }

  revalidatePath(`/quote/${quoteId}`);
}
