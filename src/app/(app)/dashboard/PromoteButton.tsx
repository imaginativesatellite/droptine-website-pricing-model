"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { requestQuoteFromLuna } from "./actions";

const CONFIRM =
  "Request a quote from Luna Creative for this client? It moves to your Luna Creative quotes and notifies the team.";

/** "Request Quote from Luna Creative" - promotes a client quote (see actions.ts). */
export default function PromoteButton({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!window.confirm(CONFIRM)) return;
    setError(null);
    startTransition(async () => {
      const res = await requestQuoteFromLuna(quoteId);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        className="btn-secondary"
        onClick={onClick}
        disabled={pending}
        style={{ padding: "8px 14px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
      >
        <ArrowRightLeft size={14} aria-hidden />
        {pending ? "Requesting…" : "Request Quote from Luna Creative"}
      </button>
      {error && <span style={{ color: "#b3261e", fontSize: "0.8rem" }}>{error}</span>}
    </div>
  );
}
