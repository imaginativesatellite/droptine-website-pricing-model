"use client";

import { useActionState } from "react";
import Link from "next/link";
import { exitPresentationMode, type ExitState } from "./actions";

export default function PinForm({ hasPin }: { hasPin: boolean }) {
  const [state, action, pending] = useActionState<ExitState, FormData>(exitPresentationMode, undefined);

  return (
    <form action={action}>
      <h2 style={{ marginBottom: hasPin ? 16 : 6 }}>{hasPin ? "Enter your PIN" : "Set your phone number"}</h2>
      {!hasPin && (
        <p className="help" style={{ marginBottom: 16 }}>Add your phone number to continue.</p>
      )}

      {hasPin ? (
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={4}
          placeholder="••••"
          style={{ width: 160, maxWidth: "100%", margin: "0 auto", display: "block", textAlign: "center", letterSpacing: "0.4em", fontSize: "1.5rem", padding: "12px" }}
        />
      ) : (
        <input name="phone" type="tel" autoComplete="off" autoFocus placeholder="e.g. 432.853.6300" />
      )}

      {state?.error && (
        <p style={{ color: "#b3261e", fontSize: "0.9rem", marginTop: 12 }}>{state.error}</p>
      )}

      <button type="submit" className="btn-primary" disabled={pending} style={{ marginTop: 18, width: "100%" }}>
        {pending ? "Checking…" : "Continue"}
      </button>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link href="/portal" className="help" style={{ textDecoration: "none" }}>← Back</Link>
      </div>
    </form>
  );
}
