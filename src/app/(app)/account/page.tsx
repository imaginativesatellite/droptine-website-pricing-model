"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

export default function AccountPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <h1>Account</h1>
      <p className="lede">Change your password.</p>

      <form action={action} className="card">
        <div className="q" style={{ paddingTop: 0 }}>
          <label className="qlabel" htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" required autoComplete="current-password" />
        </div>
        <div className="q">
          <label className="qlabel" htmlFor="next">New password</label>
          <input id="next" name="next" type="password" minLength={8} required autoComplete="new-password" />
        </div>
        <div className="q">
          <label className="qlabel" htmlFor="confirm">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
        </div>

        {state && (
          <p style={{ fontSize: "0.9rem", margin: "6px 0", color: state.ok ? "var(--good)" : "#b3261e" }}>
            {state.message}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: 8 }}>
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
