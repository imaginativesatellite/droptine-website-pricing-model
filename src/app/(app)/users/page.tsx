import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import AddUserForm from "./AddUserForm";
import { resetPassword, toggleRole, deleteUser } from "./actions";

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
        <div className="card" key={u.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600 }}>
                {u.name}{" "}
                <span className={`pill ${u.role === "ADMIN" ? "approved" : "proposal"}`}>{u.role}</span>
                {u.id === admin.id && <span className="help"> · you</span>}
              </div>
              <div className="help">{u.email}</div>
            </div>

            {/* Reset password */}
            <form action={resetPassword.bind(null, u.id)} style={{ display: "flex", gap: 6 }}>
              <input name="password" type="text" placeholder="New password" minLength={8} required
                     style={{ width: 150 }} autoComplete="off" />
              <button type="submit" className="btn-secondary" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                Reset
              </button>
            </form>

            {/* Role toggle */}
            {u.id !== admin.id && (
              <>
                <form action={toggleRole.bind(null, u.id)}>
                  <button type="submit" className="btn-secondary" style={{ padding: "8px 12px", fontSize: "0.82rem" }}>
                    Make {u.role === "ADMIN" ? "Staff" : "Admin"}
                  </button>
                </form>
                <form action={deleteUser.bind(null, u.id)}>
                  <button type="submit" className="btn-secondary"
                          style={{ padding: "8px 12px", fontSize: "0.82rem", color: "#b3261e" }}>
                    Delete
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
