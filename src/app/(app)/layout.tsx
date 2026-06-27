import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canUseClientPortal } from "@/lib/portal";
import { isPresentationMode } from "@/lib/presentation";
import AppNav from "./AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // In Presentation Mode the whole internal app is off-limits - a client at the
  // booth can't URL-hop into the dashboard/admin. Everything here redirects to
  // the locked-down portal; leaving requires the exit PIN. Gate on portal access
  // too, so a stale cookie on a non-portal account can't ping-pong with the
  // portal layout's own redirect back to the dashboard.
  if (canUseClientPortal(user) && (await isPresentationMode())) redirect("/portal");

  if (user.role === "MEMBER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { termsAcceptedAt: true },
    });
    if (!dbUser?.termsAcceptedAt) redirect("/accept-terms");
  }

  return (
    <>
      <AppNav user={{ email: user.email ?? "", name: user.name ?? "", role: user.role, clientPortalEnabled: user.clientPortalEnabled }} />
      {children}
    </>
  );
}
