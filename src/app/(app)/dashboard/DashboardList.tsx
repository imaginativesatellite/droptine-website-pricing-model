"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, type LucideIcon } from "lucide-react";

export type QuoteItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  price: number | null;
  requestedBy: string;
  shared: boolean;
  custom: boolean;
  expired: boolean;
  signed: boolean;
  awaitingCountersign: boolean;
  sentForSignature: boolean;
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Compact, muted icon that sits inline with the status tags and explains itself
// on hover (native tooltip via title). Used for at-a-glance properties of a
// quote that aren't workflow states - e.g. private, custom-priced.
function TagIcon({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <span className="tag-icon" title={label} aria-label={label}>
      <Icon size={14} aria-hidden />
    </span>
  );
}

// Ready-made row icons. Exposed as components (rather than passing the icon as a
// prop) so server components - e.g. the admin UI reference page - can render
// them without passing a function across the server/client boundary.
export function PrivateIcon() {
  return <TagIcon Icon={Lock} label="Private — visible only to its creator and admins" />;
}
export function CustomIcon() {
  return <TagIcon Icon={Sparkles} label="Custom proposal — individually priced by Luna Creative" />;
}

// Icons render first so they sit to the LEFT of the status tags within the
// right-aligned cluster. All quotes are proposals, so there's no
// "Proposal"/"Approved" tag - a ready quote shows no status tag. We surface only
// the states that mean something: awaiting approval and the signature flow.
// The custom-proposal icon is admin-only - members don't need to see it.
function badges(q: QuoteItem, isAdmin: boolean) {
  return (
    <>
      {!q.shared && <PrivateIcon />}
      {q.custom && isAdmin && <CustomIcon />}
      {q.status === "CUSTOM_PENDING" && <span className="pill pending">Pending approval</span>}
      {q.signed && <span className="pill signed">Signed</span>}
      {!q.signed && q.awaitingCountersign && <span className="pill awaiting">Awaiting signature</span>}
      {!q.signed && !q.awaitingCountersign && q.sentForSignature && (
        <span className="pill awaiting">Sent for signature</span>
      )}
      {q.expired && <span className="pill expired">Expired</span>}
    </>
  );
}

function Row({ q, attention, locked, isAdmin }: { q: QuoteItem; attention?: boolean; locked: boolean; isAdmin: boolean }) {
  const inner = (
    <>
      <div className="main">
        <div className="name">{q.name}</div>
        <div className="meta">{fmtDate(q.createdAt)} · {q.requestedBy} · {q.code}</div>
      </div>
      <div className="right">
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{badges(q, isAdmin)}</div>
        <div className="price">{q.price == null ? "-" : money(q.price)}</div>
      </div>
    </>
  );
  if (locked) return <div className="qrow" style={{ opacity: 0.65, cursor: "default" }}>{inner}</div>;
  const cls = `qrow${attention ? " attention" : q.signed ? " signed" : q.awaitingCountersign || q.sentForSignature ? " awaiting" : ""}`;
  return <Link href={`/quote/${q.id}`} className={cls}>{inner}</Link>;
}

function Tile({ q, attention, locked, isAdmin }: { q: QuoteItem; attention?: boolean; locked: boolean; isAdmin: boolean }) {
  const inner = (
    <>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{badges(q, isAdmin)}</div>
      <div className="name">{q.name}</div>
      <div className="price">{q.price == null ? "-" : money(q.price)}</div>
      <div className="meta">{fmtDate(q.createdAt)} · {q.requestedBy} · {q.code}</div>
    </>
  );
  if (locked) return <div className="qtile" style={{ opacity: 0.65, cursor: "default" }}>{inner}</div>;
  const cls = `qtile${attention ? " attention" : q.signed ? " signed" : q.awaitingCountersign || q.sentForSignature ? " awaiting" : ""}`;
  return <Link href={`/quote/${q.id}`} className={cls}>{inner}</Link>;
}

function Group({ items, view, isAdmin, attention }: { items: QuoteItem[]; view: "list" | "tiles"; isAdmin: boolean; attention?: boolean }) {
  const locked = (q: QuoteItem) => q.expired && !isAdmin;
  if (view === "tiles") {
    return (
      <div className="qtiles">
        {items.map((q) => <Tile key={q.id} q={q} attention={attention} locked={locked(q)} isAdmin={isAdmin} />)}
      </div>
    );
  }
  return <>{items.map((q) => <Row key={q.id} q={q} attention={attention} locked={locked(q)} isAdmin={isAdmin} />)}</>;
}

const PAGE_SIZE = 25;

export default function DashboardList({ items, isAdmin }: { items: QuoteItem[]; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState<"list" | "tiles">("list");
  const [isMobile, setIsMobile] = useState(false);

  // Remember the member's list/tile choice across visits so they don't have to
  // re-pick it every time. Read once on mount; write whenever it changes.
  useEffect(() => {
    const saved = window.localStorage.getItem("dashboardView");
    if (saved === "list" || saved === "tiles") setView(saved);
  }, []);
  const chooseView = (v: "list" | "tiles") => {
    setView(v);
    window.localStorage.setItem("dashboardView", v);
  };

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

  // Top section = anything where the next move is Luna Creative's: a custom
  // quote awaiting pricing/approval, or a proposal the member signed that still
  // needs Luna's counter-signature. (awaitingCountersign already implies the
  // member has signed and Luna hasn't.)
  const needsLuna = (i: QuoteItem) => i.status === "CUSTOM_PENDING" || i.awaitingCountersign;
  const pending = filtered.filter(needsLuna);
  const rest = filtered.filter((i) => !needsLuna(i));
  const slice = rest.slice(0, visibleCount);

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
          <input type="search" placeholder="Search by client…" value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }} />
        </div>

        {!isMobile && (
          <div className="viewtoggle">
            <button type="button" className={view === "list" ? "on" : ""} onClick={() => chooseView("list")} title="List view" aria-label="List view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            <button type="button" className={view === "tiles" ? "on" : ""} onClick={() => chooseView("tiles")} title="Tile view" aria-label="Tile view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
        )}

        <Link href="/new" className="btn-primary" style={{ flex: "none", whiteSpace: "nowrap" }}>+ New Quote</Link>
      </div>

      {filtered.length === 0 && (
        <div className="card"><p className="help">No quotes match.</p></div>
      )}

      {pending.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div className="section-label attention">{isAdmin ? "Needs attention" : "Awaiting Luna Creative"} · {pending.length}</div>
          <Group items={pending} view={effectiveView} isAdmin={isAdmin} attention />
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="section-label">All quotes</div>
          <Group items={slice} view={effectiveView} isAdmin={isAdmin} />

          {rest.length > slice.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} style={{ padding: "8px 14px" }}>
                Load more
              </button>
              <span className="help">Showing {slice.length} of {rest.length}</span>
            </div>
          )}
        </section>
      )}
    </>
  );
}
