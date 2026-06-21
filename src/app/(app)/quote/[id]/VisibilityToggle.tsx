"use client";

import { useState, useTransition } from "react";
import { setShared } from "./actions";
import { VISIBILITY_TIP } from "@/lib/quote";

export default function VisibilityToggle({
  quoteId,
  shared,
  isCreator,
}: {
  quoteId: string;
  shared: boolean;
  isCreator: boolean;
}) {
  const [optimisticShared, setOptimisticShared] = useState(shared);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (nextShared: boolean) => {
    setError(null);
    setOptimisticShared(nextShared);
    startTransition(async () => {
      try {
        await setShared(quoteId, nextShared);
      } catch (e) {
        setOptimisticShared(!nextShared);
        setError(e instanceof Error ? e.message : "Couldn't update visibility — try again.");
      }
    });
  };

  return (
    <div style={{ opacity: pending ? 0.6 : 1 }}>
      <label className="switch-row">
        <span className="switch">
          <input
            type="checkbox"
            checked={!optimisticShared}
            disabled={pending}
            onChange={(e) => toggle(!e.target.checked)}
          />
          <span className="slider" />
        </span>
        <span>
          Private{" "}
          <span className="tip" title={VISIBILITY_TIP}>ⓘ</span>
        </span>
      </label>
      <div className="help" style={{ marginTop: 10 }}>
        {optimisticShared
          ? "Currently shared with everyone."
          : isCreator
          ? "Currently only you & admins can see it."
          : "Currently only the creator & admins can see it."}
      </div>
      {error && <p style={{ color: "#b3261e", fontSize: "0.85rem", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
