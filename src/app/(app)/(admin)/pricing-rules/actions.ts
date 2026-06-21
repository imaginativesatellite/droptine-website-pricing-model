"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type FormState = { ok: boolean; message: string } | undefined;

/** Admin: set the global demand-adjustment percentage applied to every new
 *  or recomputed quote total. Never shown to members - see applyDemandAdjustment
 *  in src/lib/pricing.ts. */
export async function saveDemandAdjustment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const magnitude = Number(String(formData.get("magnitude") ?? "0").replace(/[^0-9]/g, ""));
  const direction = formData.get("direction") === "decrease" ? -1 : 1;
  const adjustmentPct = Math.min(50, magnitude) * direction;

  await prisma.pricingSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", adjustmentPct },
    update: { adjustmentPct },
  });

  revalidatePath("/pricing-rules");
  return { ok: true, message: "Demand adjustment saved." };
}
