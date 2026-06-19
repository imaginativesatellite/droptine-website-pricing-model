"use client";

import { useTransition } from "react";
import { setShared } from "./actions";

export default function VisibilityToggle({ quoteId, shared }: { quoteId: string; shared: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ opacity: pending ? 0.6 : 1 }}>
      <label className="switch-row">
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
      <div className="help" style={{ marginTop: 10 }}>
        {shared ? "Currently shared with everyone." : "Currently only you & admins can see it."}
      </div>
    </div>
  );
}
