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
  const navLinks = (onClick?: () => void) => {
    const item = (href: string, label: string) => (
      <Link key={href} href={href} className={isActive(href) ? "active" : ""} onClick={onClick}>
        {label}
      </Link>
    );
    return (
      <>
        {item("/dashboard", "Dashboard")}
        {item("/new", "New Quote")}
        {isAdmin && item("/admin", "Admin")}
        {isAdmin && item("/users", "Users")}
        {isAdmin && item("/pricing-rules", "Pricing Rules")}
        {isAdmin && item("/tests", "Tests")}
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
