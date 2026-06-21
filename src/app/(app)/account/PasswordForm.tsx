"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);

  return (
    <form action={action} className="card">
      <h3 style={{ marginBottom: 12 }}>Change password</h3>
      <div className="q" style={{ padding: "0 0 14px", borderBottom: "none" }}>
        <label className="qlabel" htmlFor="current">Current password</label>
        <input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="q" style={{ borderBottom: "none" }}>
        <label className="qlabel" htmlFor="next">New password</label>
        <input id="next" name="next" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="q" style={{ borderBottom: "none" }}>
        <label className="qlabel" htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
      </div>

      {state && (
        <p style={{ fontSize: "0.9rem", margin: "6px 0", color: state.ok ? "var(--good)" : "#b3261e" }}>
          {state.message}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
