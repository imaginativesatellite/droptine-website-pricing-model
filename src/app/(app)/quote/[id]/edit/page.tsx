import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import EditAnswersForm from "../EditAnswersForm";

type Answers = Record<string, string | boolean | string[] | undefined>;

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) notFound();

  const named = await prisma.quote.findMany({
    select: { proposalName: true },
    distinct: ["proposalName"],
    orderBy: { proposalName: "asc" },
  });

  return (
    <div className="container">
      <Link href={`/quote/${id}`} className="backnav">
        <svg viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to quote
      </Link>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h1>Edit answers</h1>
        <p className="lede">Changing answers re-computes the price and is recorded in the activity log.</p>
      </div>
      <EditAnswersForm
        quoteId={id}
        initialAnswers={quote!.answers as Answers}
        clientNames={named.map((q) => q.proposalName)}
      />
    </div>
  );
}
