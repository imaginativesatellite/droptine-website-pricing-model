"use client";

import { useState } from "react";
import BrandSelect from "@/components/BrandSelect";
import { updateUser } from "./actions";

export default function EditUserForm({
  user,
  isSelf,
}: {
  user: { id: string; name: string; email: string; phone: string | null; role: string };
  isSelf: boolean;
}) {
  const [role, setRole] = useState(user.role);

  return (
    <form action={updateUser.bind(null, user.id)}>
      <div className="form-2col">
        <div>
          <label className="qlabel">Name</label>
          <input name="name" type="text" defaultValue={user.name} required />
        </div>
        <div>
          <label className="qlabel">Email</label>
          <input name="email" type="email" defaultValue={user.email} required autoComplete="off" />
        </div>
        <div>
          <label className="qlabel">Phone</label>
          <input name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="e.g. 432.853.6300" />
        </div>
        <div>
          <label className="qlabel">Role</label>
          {isSelf ? (
            <input type="text" value="Admin (you)" disabled />
          ) : (
            <>
              <input type="hidden" name="role" value={role} />
              <BrandSelect
                value={role}
                onChange={setRole}
                options={[
                  { value: "MEMBER", label: "Member" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
            </>
          )}
        </div>
      </div>
      <button type="submit" className="btn-secondary" style={{ marginTop: 12 }}>Save details</button>
    </form>
  );
}
