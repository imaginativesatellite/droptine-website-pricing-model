"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "./actions";

function initialOf(name: string, email: string): string {
  const n = (name || "").trim();
  return (n ? n[0] : email[0] || "?").toUpperCase();
}

export default function AppNav({ user }: { user: { email: string; name: string; role: string } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const initials = initialOf(user.name, user.email);

  // Close any open menu when navigating to another tab/page.
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // The admin section spans several routes that now live as tabs under Admin, so
  // the top-level Admin link stays lit on any of them.
  const ADMIN_SECTION = ["/admin", "/users", "/pricing-rules", "/tests", "/pricing-preview"];
  const inAdminSection = ADMIN_SECTION.some((h) => isActive(h));
  const navLinks = (onClick?: () => void) => {
    const item = (href: string, label: string, active = isActive(href)) => (
      <Link key={href} href={href} className={active ? "active" : ""} onClick={onClick}>
        {label}
      </Link>
    );
    return (
      <>
        {item("/dashboard", "Dashboard")}
        {item("/new", "New Quote")}
        {/* Users / Pricing / Tests now live as tabs under Admin. */}
        {isAdmin && item("/admin", "Admin", inAdminSection)}
      </>
    );
  };

  return (
    <nav className="appnav">
      <div className="wrap">
        <Link href="/dashboard" className="brandlink">Droptine Web Pricing</Link>
        <div className="links">{navLinks()}</div>
        <span className="spacer" />

        <div className="avatarwrap">
          <button className="avatar" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu">
            {initials}
          </button>
          {menuOpen && (
            <div className="menu">
              <div className="menu-email">{user.email}</div>
              <Link href="/account" onClick={() => setMenuOpen(false)}>Account</Link>
              <form action={logout}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          )}
        </div>

        <button className="hamburger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">☰</button>
      </div>

      {navOpen && (
        <div className="mobile-panel">
          {navLinks(() => setNavOpen(false))}
          <div className="menu-email">{user.email}</div>
          <Link href="/account" onClick={() => setNavOpen(false)}>Account</Link>
          <form action={logout}>
            <button type="submit" className="linklike">Sign out</button>
          </form>
        </div>
      )}
    </nav>
  );
}
