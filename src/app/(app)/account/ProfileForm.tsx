"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "./actions";

export default function ProfileForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);

  return (
    <form action={action} className="card">
      <h3 style={{ marginBottom: 12 }}>Your details</h3>
      <p className="help" style={{ marginBottom: 12 }}>
        This name and phone appear on proposals as the contact (&ldquo;prepared by&rdquo;).
      </p>
      <div className="q" style={{ padding: "0 0 14px", borderBottom: "none" }}>
        <label className="qlabel" htmlFor="name">Name</label>
        <input id="name" name="name" type="text" defaultValue={defaultName} required />
      </div>
      <div className="q" style={{ borderBottom: "none" }}>
        <label className="qlabel" htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" defaultValue={defaultPhone} placeholder="e.g. 432.853.6300" />
      </div>

      {state && (
        <p style={{ fontSize: "0.9rem", margin: "6px 0", color: state.ok ? "var(--good)" : "#b3261e" }}>
          {state.message}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
