import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { finalPrice } from "@/lib/quote";
import DashboardList, { type QuoteItem } from "./DashboardList";

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { createdById: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      proposalName: true,
      status: true,
      createdAt: true,
      computedTotal: true,
      overrideTotal: true,
      discount: true,
    },
  });

  const items: QuoteItem[] = quotes.map((q) => ({
    id: q.id,
    code: q.code,
    name: q.proposalName,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    price: q.status === "CUSTOM_PENDING" ? null : finalPrice(q),
  }));

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1>Dashboard</h1>
          <p className="lede" style={{ margin: 0 }}>
            {isAdmin ? "All quotes." : "Your quotes."} {items.length} total.
          </p>
        </div>
        <Link href="/new" className="btn-primary">+ New Quote</Link>
      </div>

      {items.length === 0 ? (
        <div className="card"><p>No quotes yet. <Link href="/new">Create your first quote →</Link></p></div>
      ) : (
        <DashboardList items={items} />
      )}
    </div>
  );
}
