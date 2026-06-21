"use client";

import { useState, useTransition } from "react";
import { recommendPriceAction } from "./actions";
import type { CustomRecommendation } from "@/lib/anthropic";

/** Set a form field's value and fire an input event so React-controlled or
 *  uncontrolled inputs both reflect the change. */
function fillField(id: string, value: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return false;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

function CopyButton({ label, onCopy }: { label: string; onCopy: () => boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      style={{ padding: "4px 10px", fontSize: "0.8rem" }}
      onClick={() => setDone(onCopy())}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export default function AiRecommendation({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [rec, setRec] = useState<CustomRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setError(null);
      setRec(null);
      const r = await recommendPriceAction(quoteId);
      if ("error" in r) setError(r.error);
      else setRec(r);
    });

  const rowLabel = { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 };
  const value = { fontSize: "1.05rem", fontWeight: 600, color: "var(--ink)" };
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" } as const;

  return (
    <div>
      <button type="button" className="btn-secondary" onClick={run} disabled={pending}>
        {pending ? "Thinking…" : "Get AI recommendation"}
      </button>

      {error && <p className="help" style={{ marginTop: 10, color: "#b3261e" }}>{error}</p>}

      {rec && (
        <div style={{ marginTop: 14 }}>
          {rec.price !== undefined && (
            <div style={row}>
              <div>
                <div style={rowLabel}>Recommended price</div>
                <div style={value}>${rec.price.toLocaleString("en-US")}</div>
              </div>
              <CopyButton label="Use price" onCopy={() => fillField("approve-price", String(rec.price))} />
            </div>
          )}
          {rec.leadDays !== undefined && (
            <div style={row}>
              <div>
                <div style={rowLabel}>Recommended turnaround</div>
                <div style={value}>{rec.leadDays} business days</div>
              </div>
              <CopyButton label="Use turnaround" onCopy={() => fillField("approve-lead", String(rec.leadDays))} />
            </div>
          )}
          {rec.monthly !== undefined && (
            <div style={row}>
              <div>
                <div style={rowLabel}>Recommended monthly</div>
                <div style={value}>${rec.monthly.toLocaleString("en-US")}/mo</div>
              </div>
              <CopyButton label="Use monthly" onCopy={() => fillField("approve-monthly", String(rec.monthly))} />
            </div>
          )}

          {rec.reasoning && (
            <div style={{ marginTop: 12 }}>
              <div style={rowLabel}>Reasoning</div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.9rem", color: "var(--ink)" }}>
                {rec.reasoning}
              </p>
            </div>
          )}

          {rec.scope && (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...rowLabel, marginBottom: 6 }}>Proposed scope</div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.9rem", color: "var(--ink)" }}>
                {rec.scope}
              </p>
              <div style={{ marginTop: 8 }}>
                <CopyButton label="Use this scope" onCopy={() => fillField("approve-scope", rec.scope)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
