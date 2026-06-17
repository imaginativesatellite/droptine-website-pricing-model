import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logout } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <nav className="appnav">
        <div className="wrap">
          <Link href="/dashboard" style={{ fontWeight: 800, color: "#fff" }}>
            DROP<span style={{ color: "var(--gold)" }}>TINE</span>
          </Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/new">New quote</Link>
          {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
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
