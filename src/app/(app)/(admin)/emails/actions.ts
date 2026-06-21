"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { TEMPLATE_MAP, type TemplateKey } from "@/lib/email-templates";

function isTemplateKey(k: string): k is TemplateKey {
  return k in TEMPLATE_MAP;
}

/** Admin: save a customized subject/body for one email template. */
export async function saveTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = String(formData.get("key") ?? "");
  if (!isTemplateKey(key)) throw new Error("Unknown email template.");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) throw new Error("Subject and body are both required.");

  await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, subject, body },
    update: { subject, body },
  });

  revalidatePath("/emails");
}

/** Admin: discard the override and revert this template to the built-in default. */
export async function resetTemplate(key: string): Promise<void> {
  await requireAdmin();
  if (!isTemplateKey(key)) throw new Error("Unknown email template.");
  await prisma.emailTemplate.deleteMany({ where: { key } });
  revalidatePath("/emails");
}
