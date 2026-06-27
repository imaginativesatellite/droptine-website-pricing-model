"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PRESENTATION_COOKIE } from "@/lib/presentation";

export type ExitState = { error: string } | undefined;

/**
 * Leave Presentation Mode. The gate is the last four digits of the operator's
 * phone number (shown to the client only as "PIN"). Accounts that somehow have
 * no phone on file set one here instead - it becomes their PIN going forward.
 * Only on success is the mode cookie cleared.
 */
export async function exitPresentationMode(_prev: ExitState, formData: FormData): Promise<ExitState> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
  const digits = (dbUser?.phone ?? "").replace(/\D/g, "");

  if (digits.length >= 4) {
    const pin = String(formData.get("pin") ?? "").replace(/\D/g, "");
    if (pin !== digits.slice(-4)) return { error: "Incorrect PIN. Please try again." };
  } else {
    const phone = String(formData.get("phone") ?? "").trim();
    if (phone.replace(/\D/g, "").length < 4) return { error: "Enter a valid phone number." };
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
  }

  const store = await cookies();
  store.delete(PRESENTATION_COOKIE);
  redirect("/dashboard");
}
