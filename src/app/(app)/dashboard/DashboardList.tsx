"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandSelect from "@/components/BrandSelect";

export type QuoteItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  price: number | null;
  requestedBy: string;
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function pill(status: string) {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
}

function Row({ q, attention }: { q: QuoteItem; attention?: boolean }) {
  return (
    <Link href={`/quote/${q.id}`} className={`qrow${attention ? " attention" : ""}`}>
      <div className="main">
        <div className="name">{q.name}</div>
        <div className="meta">{fmtDate(q.createdAt)} · {q.requestedBy} · {q.code}</div>
      </div>
      <div className="right">
        {pill(q.status)}
        <div className="price">{q.price == null ? "—" : money(q.price)}</div>
      </div>
    </Link>
  );
}

function Tile({ q, attention }: { q: QuoteItem; attention?: boolean }) {
  return (
    <Link href={`/quote/${q.id}`} className={`qtile${attention ? " attention" : ""}`}>
      <div>{pill(q.status)}</div>
      <div className="name">{q.name}</div>
      <div className="price">{q.price == null ? "—" : money(q.price)}</div>
      <div className="meta">{fmtDate(q.createdAt)} · {q.requestedBy} · {q.code}</div>
    </Link>
  );
}

function Group({ items, view, attention }: { items: QuoteItem[]; view: "list" | "tiles"; attention?: boolean }) {
  if (view === "tiles") {
    return (
      <div className="qtiles">
        {items.map((q) => <Tile key={q.id} q={q} attention={attention} />)}
      </div>
    );
  }
  return <>{items.map((q) => <Row key={q.id} q={q} attention={attention} />)}</>;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function DashboardList({ items }: { items: QuoteItem[] }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "tiles">("list");
  const [isMobile, setIsMobile] = useState(false);

  // On mobile, always use the list view (no tile toggle).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveView = isMobile ? "list" : view;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const pending = filtered.filter((i) => i.status === "CUSTOM_PENDING");
  const rest = filtered.filter((i) => i.status !== "CUSTOM_PENDING");

  const totalPages = Math.max(1, Math.ceil(rest.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = rest.slice((current - 1) * pageSize, current * pageSize);

  return (
    <>
      <div className="searchbar">
        <div className="search-field">
          <span className="icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input type="search" placeholder="Search by client…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </div>

        <div className="help" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          Show
          <div style={{ width: 84 }}>
            <BrandSelect
              value={String(pageSize)}
              onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>

        {!isMobile && (
          <div className="viewtoggle">
            <button type="button" className={view === "list" ? "on" : ""} onClick={() => setView("list")} title="List view" aria-label="List view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            <button type="button" className={view === "tiles" ? "on" : ""} onClick={() => setView("tiles")} title="Tile view" aria-label="Tile view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="card"><p className="help">No quotes match.</p></div>
      )}

      {pending.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div className="section-label attention">Needs attention · {pending.length}</div>
          <Group items={pending} view={effectiveView} attention />
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="section-label">All quotes</div>
          <Group items={slice} view={effectiveView} />

          {rest.length > pageSize && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button className="btn-secondary" disabled={current <= 1} onClick={() => setPage(current - 1)} style={{ padding: "8px 14px" }}>← Prev</button>
              <span className="help">Page {current} of {totalPages} · {rest.length} quotes</span>
              <button className="btn-secondary" disabled={current >= totalPages} onClick={() => setPage(current + 1)} style={{ padding: "8px 14px" }}>Next →</button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
