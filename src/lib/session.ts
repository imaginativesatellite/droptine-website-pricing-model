import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the signed-in user, or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

/** Returns the signed-in admin, or redirects (to login or dashboard). */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
