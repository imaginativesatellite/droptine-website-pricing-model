"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "./actions";

function initialsOf(name: string, email: string): string {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AppNav({ user }: { user: { email: string; name: string; role: string } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const initials = initialsOf(user.name, user.email);

  const navLinks = (onClick?: () => void) => (
    <>
      <Link href="/dashboard" onClick={onClick}>Dashboard</Link>
      <Link href="/new" onClick={onClick}>New Quote</Link>
      {isAdmin && <Link href="/admin" onClick={onClick}>Admin</Link>}
      {isAdmin && <Link href="/users" onClick={onClick}>Users</Link>}
    </>
  );

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
