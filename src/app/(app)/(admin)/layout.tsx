import { requireAdmin } from "@/lib/session";
import AdminApprovalBanner from "./AdminApprovalBanner";
import AdminTabs from "./AdminTabs";

/**
 * Shared shell for every admin page. The approval banner sits above the tabs so
 * it's always visible, and switching tabs below never disturbs it. Each admin
 * page supplies its own heading/content as {children}.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="container">
      <AdminApprovalBanner />
      <AdminTabs />
      {children}
    </div>
  );
}
