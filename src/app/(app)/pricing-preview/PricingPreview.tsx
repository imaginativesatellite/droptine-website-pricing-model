"use client";

import { useMemo, useState } from "react";
import { QUESTIONNAIRE, type Question, type ShowIf } from "@/lib/questionnaire";
import { computeQuote, type PricingAnswers } from "@/lib/pricing";

type Answers = Record<string, string | boolean | undefined>;

function visible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true;
  const conds: ShowIf[] = Array.isArray(q.showIf) ? q.showIf : [q.showIf];
  return conds.every((c) => {
    const v = answers[c.field];
    if (typeof c.equals === "boolean") return c.equals ? v === true : !v;
    return v === c.equals;
  });
}

const money = (n: number) => `$${n.toLocaleString()}`;

export default function PricingPreview() {
  const [answers, setAnswers] = useState<Answers>({});
  const [discount, setDiscount] = useState<number>(0);

  const set = (id: string, value: string | boolean | undefined) =>
    setAnswers((a) => ({ ...a, [id]: value }));

  const result = useMemo(() => computeQuote(answers as PricingAnswers), [answers]);

  const scopeQuestions = QUESTIONNAIRE.filter((q) => q.group === "scope" && visible(q, answers));

  const discounted = Math.max(0, result.total - (discount || 0));

  return (
    <div className="container">
      <span className="badge">Preview · pricing only</span>
      <h1>Pricing preview</h1>
      <p className="lede">
        Change the options on the left and watch the price update live. This is a sandbox to
        validate the pricing model — it doesn&apos;t save anything.
      </p>

      <div className="grid">
        {/* Questions */}
        <div className="card">
          {scopeQuestions.map((q) => (
            <div className="q" key={q.id}>
              <label className="qlabel" htmlFor={q.id}>
                {q.label}
              </label>
              {q.help && <div className="help">{q.help}</div>}
              {renderInput(q, answers, set)}
            </div>
          ))}
        </div>

        {/* Live summary */}
        <div className="summary">
          <div className="card">
            <h2>Estimate</h2>

            {result.requiresCustomQuote ? (
              <div className="custom-banner">
                <h3>Custom quote required</h3>
                <ul>
                  {result.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                {result.lineItems.map((li, i) => (
                  <div className="line" key={i}>
                    <span>{li.label}</span>
                    <span className="amt">{money(li.amount)}</span>
                  </div>
                ))}

                {discount > 0 && (
                  <>
                    <div className="line">
                      <span>Subtotal</span>
                      <span className="amt">{money(result.total)}</span>
                    </div>
                    <div className="line" style={{ color: "var(--good)" }}>
                      <span>Discount</span>
                      <span className="amt">−{money(discount)}</span>
                    </div>
                  </>
                )}

                <div className="total">
                  <span>Total</span>
                  <span className="big">{money(discounted)}</span>
                </div>
                <div className="monthly">+ {money(result.monthly)}/mo hosting &amp; maintenance</div>

                <div className="q" style={{ marginTop: 18 }}>
                  <label className="qlabel" htmlFor="discount">
                    Discount (admin) — preview
                  </label>
                  <div className="help">Shown to the client as a line item off the subtotal.</div>
                  <input
                    id="discount"
                    type="text"
                    inputMode="numeric"
                    value={discount ? String(discount) : ""}
                    placeholder="0"
                    onChange={(e) => setDiscount(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderInput(
  q: Question,
  answers: Answers,
  set: (id: string, v: string | boolean | undefined) => void,
) {
  switch (q.type) {
    case "boolean":
      return (
        <div className="toggle">
          <button type="button" className={answers[q.id] === true ? "on" : ""} onClick={() => set(q.id, true)}>
            Yes
          </button>
          <button type="button" className={answers[q.id] === false ? "on" : ""} onClick={() => set(q.id, false)}>
            No
          </button>
        </div>
      );
    case "single":
      return (
        <select value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value || undefined)}>
          <option value="">Select…</option>
          {q.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "multi":
      return (
        <div>
          {q.options.map((o) => {
            const arr = ((answers[q.id] as unknown as string[]) ?? []) as string[];
            const checked = arr.includes(o.value);
            return (
              <label key={o.value} style={{ display: "block", fontSize: "0.9rem", padding: "3px 0" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((v) => v !== o.value) : [...arr, o.value];
                    set(q.id, next as unknown as string);
                  }}
                  style={{ width: "auto", marginRight: 8 }}
                />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    case "longtext":
      return (
        <textarea
          id={q.id}
          placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => set(q.id, e.target.value)}
        />
      );
    default:
      return (
        <input
          id={q.id}
          type={q.type}
          placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => set(q.id, e.target.value)}
        />
      );
  }
}
