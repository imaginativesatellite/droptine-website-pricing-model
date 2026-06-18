import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import AddUserForm from "./AddUserForm";
import EditUserForm from "./EditUserForm";
import { resetPassword, deleteUser } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const admin = await requireAdmin();
  const { flash } = await searchParams;

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="container">
      <h1>Users</h1>
      <p className="lede">Add Droptine staff and manage access.</p>

      {flash && (
        <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 18 }}>
          {flash}
        </div>
      )}

      <AddUserForm />

      {users.map((u) => (
        <div className="card" key={u.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>{u.name}</span>
            <span className={`pill ${u.role === "ADMIN" ? "approved" : "proposal"}`}>{u.role}</span>
            {u.id === admin.id && <span className="help">· you</span>}
          </div>

          <EditUserForm
            user={{ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role }}
            isSelf={u.id === admin.id}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <form action={resetPassword.bind(null, u.id)} style={{ display: "flex", gap: 6 }}>
              <input name="password" type="text" placeholder="New password" minLength={8} required
                     style={{ width: 160 }} autoComplete="off" />
              <button type="submit" className="btn-secondary" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Reset password
              </button>
            </form>
            {u.id !== admin.id && (
              <form action={deleteUser.bind(null, u.id)}>
                <button type="submit" className="btn-secondary"
                        style={{ padding: "8px 12px", fontSize: "0.82rem", color: "#b3261e" }}>
                  Delete
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
