import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { finalPrice } from "@/lib/quote";

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  const header = [
    "Created", "Client", "Owner", "Status", "Code",
    "Computed", "Override", "Discount", "Final", "ActualCharged", "Monthly",
  ];
  const rows = quotes.map((q) => [
    new Date(q.createdAt).toISOString().slice(0, 10),
    q.proposalName,
    q.createdBy.email,
    q.status,
    q.code,
    q.computedTotal,
    q.overrideTotal ?? "",
    q.discount,
    q.status === "CUSTOM_PENDING" ? "" : finalPrice(q),
    q.actualCharged ?? "",
    q.monthly,
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="droptine-quotes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
