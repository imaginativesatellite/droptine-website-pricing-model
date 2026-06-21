import Link from "next/link";
import { prisma } from "@/lib/db";

/**
 * Pinned list of custom quotes awaiting admin approval. Rendered above the admin
 * tabs by the admin layout so it stays put no matter which tab is open — a
 * standing reminder of anything that needs a decision. Renders nothing when the
 * queue is empty. Styling mirrors the dashboard's "needs attention" rows.
 */
export default async function AdminApprovalBanner() {
  const pending = await prisma.quote.findMany({
    where: { status: "CUSTOM_PENDING" },
    orderBy: { createdAt: "asc" },
    include: { createdBy: true },
  });

  if (pending.length === 0) return null;

  return (
    <section style={{ marginBottom: 24 }}>
      <div className="section-label attention">
        Awaiting approval
        <span className="count-badge">{pending.length}</span>
      </div>
      {pending.map((q) => (
        <Link href={`/quote/${q.id}`} className="qrow attention" key={q.id}>
          <div className="main">
            <div className="name">{q.proposalName}</div>
            <div className="meta">
              {q.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {" · "}{q.createdBy.email} · {q.customReasons[0] ?? "custom"}
            </div>
          </div>
          <div className="right">
            <span className="pill pending">Custom · pending</span>
          </div>
        </Link>
      ))}
    </section>
  );
}
