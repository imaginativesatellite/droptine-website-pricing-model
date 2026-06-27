"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type FormState = { ok: boolean; message: string } | undefined;

/** Update the signed-in user's name + phone (shown on proposals as "prepared by"). */
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) return { ok: false, message: "Name is required." };
  if (!phone) return { ok: false, message: "A phone number is required." };

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { name, phone },
  });

  revalidatePath("/account");
  return { ok: true, message: "Profile saved." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { ok: false, message: "New password must be at least 8 characters." };
  if (next !== confirm) return { ok: false, message: "New passwords don't match." };

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return { ok: false, message: "Account not found." };

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return { ok: false, message: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true, message: "Password updated." };
}
