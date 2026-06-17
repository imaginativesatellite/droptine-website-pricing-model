"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type FormState = { ok: boolean; message: string } | undefined;

function flash(msg: string): never {
  redirect(`/users?flash=${encodeURIComponent(msg)}`);
}

/** Admin: create a staff or admin account with a temporary password. */
export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) === "ADMIN" ? Role.ADMIN : Role.STAFF;
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { ok: false, message: "Name, email, and a temporary password are required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Temporary password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "A user with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, role, passwordHash } });

  revalidatePath("/users");
  return { ok: true, message: `Created ${email}. Share the temporary password — they can change it under Account.` };
}

/** Admin: set a new password for a user. */
export async function resetPassword(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) flash("Password must be at least 8 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  flash(`Password reset for ${user.email}.`);
}

/** Admin: flip a user between STAFF and ADMIN (can't change your own role). */
export async function toggleRole(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) flash("You can't change your own role.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) flash("User not found.");

  const next = user!.role === Role.ADMIN ? Role.STAFF : Role.ADMIN;
  await prisma.user.update({ where: { id: userId }, data: { role: next } });
  flash(`${user!.email} is now ${next}.`);
}

/** Admin: delete a user (blocked if they own clients/quotes, or it's you). */
export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) flash("You can't delete your own account.");

  const [clients, quotes, edits] = await Promise.all([
    prisma.client.count({ where: { ownerId: userId } }),
    prisma.quote.count({ where: { createdById: userId } }),
    prisma.quoteEdit.count({ where: { editedById: userId } }),
  ]);
  if (clients + quotes + edits > 0) {
    flash("Can't delete a user who has clients, quotes, or edit history. Set them to STAFF instead.");
  }

  const user = await prisma.user.delete({ where: { id: userId } });
  flash(`Deleted ${user.email}.`);
}
