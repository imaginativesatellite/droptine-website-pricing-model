import { requireAdmin } from "@/lib/session";

export default async function AdminPage() {
  await requireAdmin();

  // The approval banner and tabs come from the admin layout; this landing just
  // orients the admin. Recent quotes now live on the Dashboard instead.
  return (
    <div>
      <h1>Admin</h1>
      <p className="lede" style={{ marginBottom: 0 }}>
        Manage your team, pricing, and QA from the tabs above. Anything awaiting your approval stays
        pinned at the top, and every quote lives on the Dashboard.
      </p>
    </div>
  );
}
