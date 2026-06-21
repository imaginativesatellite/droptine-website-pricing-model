import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import NewQuoteForm from "./NewQuoteForm";

export default async function NewQuotePage() {
  const user = await requireUser();
  // Members default to sharing with everyone; admins default to private.
  const defaultShared = user.role !== "ADMIN";

  // Suggest client names that still have at least one quote.
  const named = await prisma.quote.findMany({
    select: { proposalName: true },
    distinct: ["proposalName"],
    orderBy: { proposalName: "asc" },
  });

  return (
    <div className="container">
      <NewQuoteForm clientNames={named.map((q) => q.proposalName)} defaultShared={defaultShared} />
    </div>
  );
}
