"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canUseClientPortal } from "@/lib/portal";

export type FormState = { ok: boolean; message: string } | undefined;

/** Parse a money/number field, stripping "$", "%", commas and spaces. */
function toAmount(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/** Save the signed-in member's client-portal markup settings. */
export async function saveMarkup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canUseClientPortal(user)) return { ok: false, message: "This isn't available for your account." };

  const markupWebsite = toAmount(formData.get("markupWebsite"));
  const markupWebsiteIsPercent = String(formData.get("markupWebsiteIsPercent")) === "percent";
  const markupMonthly = toAmount(formData.get("markupMonthly"));
  const markupIncrement = toAmount(formData.get("markupIncrement"));

  // A runaway percentage would blow past the price guardrails - keep it sane.
  if (markupWebsiteIsPercent && markupWebsite > 500) {
    return { ok: false, message: "A percentage markup that high looks like a mistake - keep it at or under 500%." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { markupWebsite, markupWebsiteIsPercent, markupMonthly, markupIncrement },
  });

  revalidatePath("/markup");
  return { ok: true, message: "Markup saved." };
}
