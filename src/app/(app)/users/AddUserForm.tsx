"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import BrandSelect from "@/components/BrandSelect";
import { createUser, type FormState } from "./actions";

export default function AddUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUser, undefined);
  const [role, setRole] = useState("STAFF");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setRole("STAFF");
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 12 }}>Add user</h3>
      <div className="form-2col">
        <div>
          <label className="qlabel" htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div>
          <label className="qlabel" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="off" />
        </div>
        <div>
          <label className="qlabel" htmlFor="role">Role</label>
          <input type="hidden" name="role" value={role} />
          <BrandSelect
            id="role"
            value={role}
            onChange={setRole}
            options={[
              { value: "STAFF", label: "Staff" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
        </div>
        <div>
          <label className="qlabel" htmlFor="password">Temporary password</label>
          <input id="password" name="password" type="text" minLength={8} required autoComplete="off" />
        </div>
      </div>

      {state && (
        <p style={{ marginTop: 10, fontSize: "0.9rem", color: state.ok ? "var(--good)" : "#b3261e" }}>
          {state.message}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: 12 }}>
        {pending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}
