import { requireUser } from "@/lib/session";
import AppNav from "./AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <AppNav user={{ email: user.email ?? "", name: user.name ?? "", role: user.role }} />
      {children}
    </>
  );
}
