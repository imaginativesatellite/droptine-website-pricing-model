"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Secondary navigation for the admin area. Rendered by the admin layout so it
// persists across every admin page and highlights the active section. Export is
// a file download, not a tab, so it never shows an active state.
const TABS: { href: string; label: string }[] = [
  { href: "/users", label: "Users" },
  { href: "/pricing-rules", label: "Pricing" },
  { href: "/tests", label: "Tests" },
  { href: "/pricing-preview", label: "Pricing preview" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="admin-tabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={isActive(t.href) ? "active" : ""}>
          {t.label}
        </Link>
      ))}
      <a href="/api/export/quotes">Export</a>
    </div>
  );
}
