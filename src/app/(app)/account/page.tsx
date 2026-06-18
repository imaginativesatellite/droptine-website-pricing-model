import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <h1>Account</h1>
      <p className="lede">Your contact details and password.</p>

      <ProfileForm defaultName={user.name} defaultPhone={user.phone ?? ""} />
      <PasswordForm />
    </div>
  );
}
