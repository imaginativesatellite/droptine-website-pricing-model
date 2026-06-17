import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { finalPrice, money } from "@/lib/quote";

const statusPill = (status: string) => {
  if (status === "CUSTOM_PENDING") return <span className="pill pending">Custom · pending</span>;
  if (status === "APPROVED") return <span className="pill approved">Approved</span>;
  return <span className="pill proposal">Proposal</span>;
};

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const clients = await prisma.client.findMany({
    where: isAdmin ? {} : { ownerId: user.id },
    orderBy: { name: "asc" },
    include: {
      owner: true,
      quotes: { orderBy: { createdAt: "desc" } },
    },
  });

  const totalQuotes = clients.reduce((n, c) => n + c.quotes.length, 0);

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h1>Dashboard</h1>
          <p className="lede" style={{ margin: 0 }}>
            {isAdmin ? "All clients and quotes." : "Your clients and quotes."} {totalQuotes} quote
            {totalQuotes === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/new" className="btn-primary">+ New quote</Link>
      </div>

      {clients.length === 0 && (
        <div className="card">
          <p>No quotes yet. <Link href="/new">Create your first quote →</Link></p>
        </div>
      )}

      {clients.map((client) => (
        <div className="client-group" key={client.id}>
          <h3>{client.name}</h3>
          <p className="help" style={{ marginBottom: 10 }}>
            {[client.email, client.phone].filter(Boolean).join(" · ")}
            {isAdmin ? `${client.email || client.phone ? " · " : ""}owner: ${client.owner.email}` : ""}
          </p>
          {client.quotes.map((q) => (
            <Link href={`/quote/${q.id}`} className="quote-row" key={q.id}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{q.proposalName}</div>
                <div className="help">
                  {new Date(q.createdAt).toLocaleDateString()} · code {q.code}
                </div>
              </div>
              {statusPill(q.status)}
              <div className="price">
                {q.status === "CUSTOM_PENDING" ? "—" : money(finalPrice(q))}
              </div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
