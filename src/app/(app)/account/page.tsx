import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div className="container">
      <h1>Account</h1>
      <p className="lede">Your contact details and password.</p>

      <div className="account-grid">
        <ProfileForm defaultName={user.name} defaultPhone={user.phone ?? ""} />
        <PasswordForm />
      </div>

      {user.role === "MEMBER" && user.termsAcceptedAt && (
        <div className="account-terms">
          <h3>Platform terms</h3>
          <p className="help" style={{ marginBottom: 10 }}>
            Accepted {user.termsAcceptedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{user.termsAcceptedText}</p>
        </div>
      )}
    </div>
  );
}
