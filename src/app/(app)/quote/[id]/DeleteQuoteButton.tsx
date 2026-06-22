"use client";

import { useState, useTransition } from "react";
import { deleteQuote } from "./actions";

export default function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!confirm("Delete this proposal permanently? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteQuote(quoteId);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div>
      <button
        type="button"
        className="btn-danger"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Deleting…" : "Delete proposal"}
      </button>
      {error && <p style={{ color: "#b3261e", fontSize: "0.85rem", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
