"use client";

import { useTransition } from "react";
import { setShared } from "./actions";

export default function VisibilityToggle({ quoteId, shared }: { quoteId: string; shared: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="switch-row" style={{ opacity: pending ? 0.6 : 1 }}>
      <span className="switch">
        <input
          type="checkbox"
          checked={!shared}
          disabled={pending}
          onChange={(e) => startTransition(() => setShared(quoteId, !e.target.checked))}
        />
        <span className="slider" />
      </span>
      <span>
        Private{" "}
        <span className="tip" title="When on, only you and admins can see this quote. When off, it's visible to all staff.">ⓘ</span>
      </span>
    </label>
  );
}
