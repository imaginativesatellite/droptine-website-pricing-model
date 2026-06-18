import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  await requireUser();

  // Suggest client names that still have at least one quote.
  const named = await prisma.quote.findMany({
    select: { proposalName: true },
    distinct: ["proposalName"],
    orderBy: { proposalName: "asc" },
  });

  return (
    <div className="container">
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1>New Quote</h1>
      </div>
      <NewQuoteForm clientNames={named.map((q) => q.proposalName)} />
    </div>
  );
}
