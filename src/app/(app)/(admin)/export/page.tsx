import { requireAdmin } from "@/lib/session";

export default async function ExportPage() {
  await requireAdmin();

  return (
    <div>
      <h1>Export</h1>
      <p className="lede">
        Download every quote as a CSV — created date, client, owner, status, price, and a
        breakdown of what was selected.
      </p>
      <a href="/api/export/quotes" className="btn-primary">Download CSV</a>
    </div>
  );
}
