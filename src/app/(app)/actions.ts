"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { canUseClientPortal } from "@/lib/portal";
import { PRESENTATION_COOKIE } from "@/lib/presentation";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

/** Switch into the client-facing portal. Gated to portal users; sets the mode
 *  cookie and drops the operator on the portal. Leaving requires the exit PIN. */
export async function enterPresentationMode() {
  const user = await requireUser();
  if (!canUseClientPortal(user)) redirect("/dashboard");
  const store = await cookies();
  store.set(PRESENTATION_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/portal");
}
