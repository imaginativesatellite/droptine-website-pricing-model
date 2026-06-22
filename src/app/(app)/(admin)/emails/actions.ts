"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { TEMPLATE_MAP, type TemplateKey } from "@/lib/email-templates";

function isTemplateKey(k: string): k is TemplateKey {
  return k in TEMPLATE_MAP;
}

/** Admin: save a customized subject/body for one email template. Leaves the
 *  on/off state untouched (that's controlled by the toggle). */
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

/** Admin: switch a template on or off. When off, that email is never sent.
 *  Persisted on the override row (created with the current default copy if the
 *  template hasn't been customized yet), so the switch survives independently
 *  of any copy edits. */
export async function setTemplateEnabled(key: string, enabled: boolean): Promise<void> {
  await requireAdmin();
  if (!isTemplateKey(key)) throw new Error("Unknown email template.");
  const def = TEMPLATE_MAP[key];

  await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, subject: def.subject, body: def.body, enabled },
    update: { enabled },
  });

  revalidatePath("/emails");
}

/** Admin: discard copy customizations and revert this template's wording to the
 *  built-in default. If the template is switched off, the row (and its off
 *  state) is kept with default copy; otherwise the override row is removed. */
export async function resetTemplate(key: string): Promise<void> {
  await requireAdmin();
  if (!isTemplateKey(key)) throw new Error("Unknown email template.");
  const def = TEMPLATE_MAP[key];

  const existing = await prisma.emailTemplate.findUnique({ where: { key }, select: { enabled: true } });
  if (existing && !existing.enabled) {
    await prisma.emailTemplate.update({ where: { key }, data: { subject: def.subject, body: def.body } });
  } else {
    await prisma.emailTemplate.deleteMany({ where: { key } });
  }
  revalidatePath("/emails");
}
