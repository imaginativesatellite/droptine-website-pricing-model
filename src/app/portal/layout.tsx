import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canUseClientPortal } from "@/lib/portal";
import { isPresentationMode } from "@/lib/presentation";
import PortalNav from "./PortalNav";

/**
 * Shell for the client-facing portal. Two guards: the account must be allowed to
 * use the portal at all, and the session must actually be in Presentation Mode
 * (you enter from the account menu, which sets the cookie). Anything else lands
 * back on the dashboard.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!canUseClientPortal(user)) redirect("/dashboard");
  if (!(await isPresentationMode())) redirect("/dashboard");

  return (
    <>
      <PortalNav />
      {children}
    </>
  );
}
