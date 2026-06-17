"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

function pill(status: string) {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function DashboardList({ items }: { items: QuoteItem[] }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search by client…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <label className="help" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Show
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ width: "auto" }}
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {slice.length === 0 ? (
        <div className="card"><p className="help">No quotes match.</p></div>
      ) : (
        slice.map((q) => (
          <Link href={`/quote/${q.id}`} className="quote-row" key={q.id}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{q.name}</div>
              <div className="help">{new Date(q.createdAt).toLocaleDateString()} · {q.requestedBy} · code {q.code}</div>
            </div>
            {pill(q.status)}
            <div className="price">{q.price == null ? "—" : money(q.price)}</div>
          </Link>
        ))
      )}

      {filtered.length > pageSize && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className="btn-secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}
                  style={{ padding: "8px 14px" }}>← Prev</button>
          <span className="help">Page {current} of {totalPages} · {filtered.length} quotes</span>
          <button className="btn-secondary" disabled={current >= totalPages} onClick={() => setPage(current + 1)}
                  style={{ padding: "8px 14px" }}>Next →</button>
        </div>
      )}
    </>
  );
}
