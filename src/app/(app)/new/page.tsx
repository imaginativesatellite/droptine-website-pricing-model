import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  await requireUser();

  // Suggest existing client names (across the team) for reuse.
  const clients = await prisma.client.findMany({
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });

  return (
    <div className="container">
      <h1>New Quote</h1>
      <p className="lede">Answer the questions, then generate the proposal.</p>
      <NewQuoteForm clientNames={clients.map((c) => c.name)} />
    </div>
  );
}
