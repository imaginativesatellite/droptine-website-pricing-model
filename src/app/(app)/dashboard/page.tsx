import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { finalPrice, isExpired } from "@/lib/quote";
import DashboardList, { type QuoteItem } from "./DashboardList";

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  // Admins see everything; staff see their own quotes plus any shared ones.
  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { OR: [{ createdById: user.id }, { shared: true }] },
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
      shared: true,
      validFrom: true,
      clientSignedAt: true,
      companySignedAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  const items: QuoteItem[] = quotes.map((q) => {
    const expired = isExpired(q);
    return {
      id: q.id,
      code: q.code,
      name: q.proposalName,
      status: q.status,
      createdAt: q.createdAt.toISOString(),
      // Staff don't see the price on expired quotes.
      price: q.status === "CUSTOM_PENDING" || (!isAdmin && expired) ? null : finalPrice(q),
      requestedBy: q.createdBy.name || q.createdBy.email,
      shared: q.shared,
      expired,
      signed: Boolean(q.clientSignedAt && q.companySignedAt),
    };
  });

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1>Dashboard</h1>
        </div>
        <Link href="/new" className="btn-primary">+ New Quote</Link>
      </div>

      {items.length === 0 ? (
        <div className="card"><p>No quotes yet. <Link href="/new">Create your first quote →</Link></p></div>
      ) : (
        <DashboardList items={items} isAdmin={isAdmin} />
      )}
    </div>
  );
}
