import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import PinForm from "./PinForm";

export default async function ExitPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } });
  const hasPin = (dbUser?.phone ?? "").replace(/\D/g, "").length >= 4;

  return (
    <div className="container" style={{ maxWidth: 380 }}>
      <div className="card">
        <PinForm hasPin={hasPin} />
      </div>
    </div>
  );
}
