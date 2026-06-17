"use client";

import { useMemo, useState, useTransition } from "react";
import { QUESTIONNAIRE, type Question, type ShowIf } from "@/lib/questionnaire";
import { computeQuote, type PricingAnswers } from "@/lib/pricing";
import { createQuote } from "./actions";

type Answers = Record<string, string | boolean | string[] | undefined>;

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

export default function NewQuoteForm() {
  const [answers, setAnswers] = useState<Answers>({});
  const [pending, startTransition] = useTransition();

  const set = (id: string, value: Answers[string]) => setAnswers((a) => ({ ...a, [id]: value }));

  const result = useMemo(() => computeQuote(answers as PricingAnswers), [answers]);
  const questions = QUESTIONNAIRE.filter((q) => visible(q, answers));
  const proposalName = String(answers.proposalName ?? "").trim();

  const submit = () => startTransition(() => createQuote(answers));

  return (
    <div className="grid">
      <div className="card">
        {questions.map((q) => (
          <div className="q" key={q.id}>
            <label className="qlabel" htmlFor={q.id}>{q.label}</label>
            {q.help && <div className="help">{q.help}</div>}
            {renderInput(q, answers, set)}
          </div>
        ))}
      </div>

      <div className="summary">
        <div className="card">
          <h2>Estimate</h2>
          {result.requiresCustomQuote ? (
            <div className="custom-banner">
              <h3>Custom quote</h3>
              <ul>{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
                We&apos;ll review this and follow up with pricing.
              </p>
            </div>
          ) : (
            <>
              {result.lineItems.map((li, i) => (
                <div className="line" key={i}>
                  <span>{li.label}</span>
                  <span className="amt">{money(li.amount)}</span>
                </div>
              ))}
              <div className="total">
                <span>Total</span>
                <span className="big">{money(result.total)}</span>
              </div>
              <div className="monthly">+ {money(result.monthly)}/mo hosting &amp; maintenance</div>
            </>
          )}

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 18, width: "100%" }}
            disabled={pending || !proposalName}
            onClick={submit}
          >
            {pending
              ? "Saving…"
              : result.requiresCustomQuote
                ? "Request custom quote"
                : "Generate proposal"}
          </button>
          {!proposalName && (
            <p className="help" style={{ marginTop: 8 }}>Enter a project / business name to continue.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function renderInput(q: Question, answers: Answers, set: (id: string, v: Answers[string]) => void) {
  switch (q.type) {
    case "boolean":
      return (
        <div className="toggle">
          <button type="button" className={answers[q.id] === true ? "on" : ""} onClick={() => set(q.id, true)}>Yes</button>
          <button type="button" className={answers[q.id] === false ? "on" : ""} onClick={() => set(q.id, false)}>No</button>
        </div>
      );
    case "single":
      return (
        <select value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value || undefined)}>
          <option value="">Select…</option>
          {q.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "multi":
      return (
        <div>
          {q.options.map((o) => {
            const arr = (answers[q.id] as string[]) ?? [];
            const checked = arr.includes(o.value);
            return (
              <label key={o.value} style={{ display: "block", fontSize: "0.9rem", padding: "3px 0" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => set(q.id, checked ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
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
        <textarea id={q.id} placeholder={q.placeholder} value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      );
    default:
      return (
        <input id={q.id} type={q.type} placeholder={q.placeholder} value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      );
  }
}
