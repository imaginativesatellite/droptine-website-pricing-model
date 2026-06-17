"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>

      <form action={formAction} className="card">
        <div className="q">
          <label className="qlabel" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="q">
          <label className="qlabel" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        {error && (
          <p style={{ color: "#b3261e", fontSize: "0.9rem", margin: "10px 0" }}>{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: 8 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
