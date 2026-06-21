"use client";

import { useState, useTransition } from "react";
import { recommendPriceAction } from "./actions";

export default function AiRecommendation({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [scope, setScope] = useState<string>("");
  const [applied, setApplied] = useState(false);

  const run = () =>
    startTransition(async () => {
      setApplied(false);
      const r = await recommendPriceAction(quoteId);
      if ("error" in r) {
        setResult(r.error);
        setScope("");
      } else {
        setResult(r.reasoning);
        setScope(r.scope);
      }
    });

  // Drop the proposed scope into the approval form's Scope textarea so the admin
  // can review/tweak it before approving — they stay in control of the final text.
  const applyScope = () => {
    const ta = document.getElementById("approve-scope") as HTMLTextAreaElement | null;
    if (ta) {
      ta.value = scope;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      setApplied(true);
    }
  };

  return (
    <div>
      <button type="button" className="btn-secondary" onClick={run} disabled={pending}>
        {pending ? "Thinking…" : "Get AI price recommendation"}
      </button>
      {result && (
        <p style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.9rem", color: "var(--ink)" }}>
          {result}
        </p>
      )}
      {scope && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Proposed scope
          </div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.9rem", color: "var(--ink)" }}>
            {scope}
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={applyScope} disabled={applied}>
            {applied ? "Added to Scope ✓" : "Use this scope"}
          </button>
        </div>
      )}
    </div>
  );
}
