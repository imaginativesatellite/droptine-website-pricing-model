import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <nav className="appnav">
        <div className="wrap">
          <Link
            href="/dashboard"
            style={{ fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1 }}
          >
            Droptine Web Pricing
          </Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/new">New Quote</Link>
          {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
          {user.role === "ADMIN" && <Link href="/users">Users</Link>}
          <Link href="/account">Account</Link>
          <span className="spacer" />
          <span className="who">{user.email}</span>
          <form action={logout}>
            <button type="submit" className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.82rem" }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>
      {children}
    </>
  );
}
