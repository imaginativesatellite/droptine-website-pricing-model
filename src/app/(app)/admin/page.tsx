import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { money, finalPrice } from "@/lib/quote";

export default async function AdminPage() {
  await requireAdmin();

  const pending = await prisma.quote.findMany({
    where: { status: "CUSTOM_PENDING" },
    orderBy: { createdAt: "asc" },
    include: { createdBy: true, client: true },
  });

  const recent = await prisma.quote.findMany({
    where: { NOT: { status: "CUSTOM_PENDING" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { createdBy: true, client: true },
  });

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1>Admin</h1>
          <p className="lede" style={{ margin: 0 }}>Review custom requests and recent quotes.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn-secondary" href="/pricing-preview">Pricing preview</Link>
          <a className="btn-secondary" href="/api/export/quotes">Export CSV (quoted vs. actual)</a>
        </div>
      </div>
      <div style={{ height: 18 }} />

      <h3 style={{ marginBottom: 10 }}>
        Awaiting approval {pending.length > 0 && <span className="pill pending">{pending.length}</span>}
      </h3>
      {pending.length === 0 ? (
        <div className="card"><p className="help">Nothing waiting. 🎉</p></div>
      ) : (
        pending.map((q) => (
          <Link href={`/quote/${q.id}`} className="quote-row" key={q.id}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{q.proposalName}</div>
              <div className="help">{q.client.name} · {q.createdBy.email} · {q.customReasons[0] ?? "custom"}</div>
            </div>
            <span className="btn-gold" style={{ padding: "6px 14px", fontSize: "0.82rem" }}>Review →</span>
          </Link>
        ))
      )}

      <h3 style={{ margin: "26px 0 10px" }}>Recent quotes</h3>
      {recent.map((q) => (
        <Link href={`/quote/${q.id}`} className="quote-row" key={q.id}>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{q.proposalName}</div>
            <div className="help">{q.client.name} · {q.createdBy.email} · {new Date(q.createdAt).toLocaleDateString()}</div>
          </div>
          <span className={`pill ${q.status === "APPROVED" ? "approved" : "proposal"}`}>
            {q.status === "APPROVED" ? "Approved" : "Proposal"}
          </span>
          <div className="price">{money(finalPrice(q))}</div>
        </Link>
      ))}
    </div>
  );
}
