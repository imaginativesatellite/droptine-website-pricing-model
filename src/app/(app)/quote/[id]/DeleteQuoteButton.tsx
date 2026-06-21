"use client";

import { useTransition } from "react";
import { deleteQuote } from "./actions";

export default function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (confirm("Delete this proposal permanently? This cannot be undone.")) {
      startTransition(() => deleteQuote(quoteId));
    }
  };

  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? "Deleting…" : "Delete proposal"}
    </button>
  );
}
