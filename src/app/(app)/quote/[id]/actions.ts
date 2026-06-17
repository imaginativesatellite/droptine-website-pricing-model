"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { renderProposalPdf } from "@/lib/pdf";
import { buildProposalData } from "@/lib/proposal-data";
import { sendApprovedQuoteToRequester, sendProposalToStaff } from "@/lib/email";
import { appUrl, proposalUrl, finalPrice } from "@/lib/quote";

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

/** Admin: edit a quote (name, override, discount, actual charged, notes) with audit logging. */
export async function updateQuote(quoteId: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found.");

  const proposalName = String(formData.get("proposalName") ?? quote.proposalName).trim();
  const overrideTotal = toInt(formData.get("overrideTotal"));
  const discount = toInt(formData.get("discount")) ?? 0;
  const actualCharged = toInt(formData.get("actualCharged"));
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;

  await logEdit(quoteId, admin.id, "proposalName", quote.proposalName, proposalName);
  await logEdit(quoteId, admin.id, "overrideTotal", quote.overrideTotal?.toString() ?? null, overrideTotal?.toString() ?? null);
  await logEdit(quoteId, admin.id, "discount", quote.discount.toString(), discount.toString());
  await logEdit(quoteId, admin.id, "actualCharged", quote.actualCharged?.toString() ?? null, actualCharged?.toString() ?? null);
  await logEdit(quoteId, admin.id, "notes", quote.notes ?? null, notes);

  await prisma.quote.update({
    where: { id: quoteId },
    data: { proposalName, overrideTotal, discount, actualCharged, notes },
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

  const price = toInt(formData.get("overrideTotal"));
  if (price == null) throw new Error("Enter an approved price.");

  await logEdit(quoteId, admin.id, "overrideTotal", quote.overrideTotal?.toString() ?? null, price.toString());
  await logEdit(quoteId, admin.id, "status", quote.status, "APPROVED");

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { overrideTotal: price, status: "APPROVED", approvedById: admin.id, approvedAt: new Date() },
    include: { client: true, createdBy: true },
  });

  try {
    const pdf = await renderProposalPdf(buildProposalData(updated));
    await sendApprovedQuoteToRequester({
      requesterEmail: quote.createdBy.email,
      proposalName: updated.proposalName,
      total: finalPrice(updated),
      code: updated.code,
      proposalUrl: proposalUrl(updated.code),
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

/** Admin: permanently delete a quote (its edit history cascades). */
export async function deleteQuote(quoteId: string): Promise<void> {
  await requireAdmin();
  await prisma.quote.delete({ where: { id: quoteId } });
  redirect("/dashboard");
}

/** Admin: re-send the proposal email (with PDF) to the staff member who created it. */
export async function resendProposalEmail(quoteId: string): Promise<void> {
  await requireAdmin();
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { createdBy: true, client: true },
  });
  if (!quote) throw new Error("Quote not found.");
  if (quote.status === "CUSTOM_PENDING") throw new Error("No proposal to send yet — approve it first.");

  try {
    const pdf = await renderProposalPdf(buildProposalData(quote));
    await sendProposalToStaff({
      staffEmail: quote.createdBy.email,
      proposalName: quote.proposalName,
      total: finalPrice(quote),
      code: quote.code,
      proposalUrl: proposalUrl(quote.code),
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
