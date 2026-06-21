"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { platformTermsSnapshot } from "@/lib/terms";

export async function acceptTerms(): Promise<void> {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      termsAcceptedAt: new Date(),
      termsAcceptedText: platformTermsSnapshot(),
    },
  });

  redirect("/dashboard");
}
