import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import AppNav from "./AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (user.role === "MEMBER") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { termsAcceptedAt: true },
    });
    if (!dbUser?.termsAcceptedAt) redirect("/accept-terms");
  }

  return (
    <>
      <AppNav user={{ email: user.email ?? "", name: user.name ?? "", role: user.role }} />
      {children}
    </>
  );
}
