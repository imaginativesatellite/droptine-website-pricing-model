"use client";

import { useState, useTransition } from "react";
import { recommendPriceAction } from "./actions";

export default function AiRecommendation({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      const r = await recommendPriceAction(quoteId);
      setResult("error" in r ? r.error : r.reasoning);
    });

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
    </div>
  );
}
