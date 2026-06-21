"use client";

import { useActionState, useMemo, useState } from "react";
import { saveDemandAdjustment, type FormState } from "./actions";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const PREVIEW_LEVELS = [15000, 12500, 10000, 7500, 5000];

export default function DemandAdjustmentForm({ initialPct }: { initialPct: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDemandAdjustment, undefined);
  const [magnitude, setMagnitude] = useState(String(Math.abs(initialPct)));
  const [direction, setDirection] = useState(initialPct < 0 ? "decrease" : "increase");

  const pct = (Number(magnitude) || 0) * (direction === "decrease" ? -1 : 1);

  const preview = useMemo(
    () => PREVIEW_LEVELS.map((level) => {
      const amount = Math.round((level * pct) / 100);
      return { level, amount, final: Math.max(0, level + amount) };
    }),
    [pct],
  );

  return (
    <form action={action}>
      <p className="help" style={{ marginBottom: 12 }}>
        Nudges every new or recomputed quote total by a percentage — for slow or busy stretches.
        Visible to admins only; members never see why a price moved.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="q" style={{ paddingTop: 0, borderBottom: "none", flex: "0 0 120px" }}>
          <label className="qlabel" htmlFor="magnitude">Percent</label>
          <input
            id="magnitude"
            name="magnitude"
            type="text"
            inputMode="numeric"
            value={magnitude}
            onChange={(e) => setMagnitude(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <div className="q" style={{ paddingTop: 0, borderBottom: "none", flex: "0 0 160px" }}>
          <label className="qlabel" htmlFor="direction">Direction</label>
          <select id="direction" name="direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={pending} style={{ marginBottom: 1 }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      {state && (
        <p style={{ fontSize: "0.9rem", margin: "10px 0 0", color: state.ok ? "var(--good)" : "#b3261e" }}>
          {state.message}
        </p>
      )}

      <table className="simple" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Price level</th>
            <th className="amt">Adjustment</th>
            <th className="amt">Final price</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((row) => (
            <tr key={row.level}>
              <td>{money(row.level)}</td>
              <td className="amt">{row.amount === 0 ? "—" : `${row.amount > 0 ? "+" : ""}${money(row.amount)}`}</td>
              <td className="amt">{money(row.final)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </form>
  );
}
