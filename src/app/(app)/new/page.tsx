import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  // Suggest client names that still have at least one quote (so names from
  // deleted proposals drop off).
  const named = await prisma.quote.findMany({
    select: { proposalName: true },
    distinct: ["proposalName"],
    orderBy: { proposalName: "asc" },
  });
  const clientNames = named.map((q) => q.proposalName);

  // Admins can assign a new quote to another user.
  const assignableUsers = isAdmin
    ? (await prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }))
    : [];

  return (
    <div className="container">
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1>New Quote</h1>
      </div>
      <NewQuoteForm
        clientNames={clientNames}
        assignableUsers={assignableUsers}
        currentUserId={user.id}
      />
    </div>
  );
}
