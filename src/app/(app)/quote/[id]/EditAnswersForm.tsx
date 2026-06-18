"use client";

import { useState, useTransition } from "react";
import { QUESTIONNAIRE, type Question, type ShowIf } from "@/lib/questionnaire";
import ClientNameInput from "@/components/ClientNameInput";
import { editAnswers } from "./actions";

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

export default function EditAnswersForm({
  quoteId,
  initialAnswers,
  clientNames,
}: {
  quoteId: string;
  initialAnswers: Answers;
  clientNames: string[];
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (id: string, value: Answers[string]) => setAnswers((a) => ({ ...a, [id]: value }));
  const questions = QUESTIONNAIRE.filter((q) => visible(q, answers));
  const proposalName = String(answers.proposalName ?? "").trim();

  const submit = () => {
    setError(null);
    startTransition(() => {
      void editAnswers(quoteId, answers);
    });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="card">
        {questions.map((q) => (
          <div className="q" key={q.id}>
            <label className="qlabel" htmlFor={q.id}>{q.label}</label>
            {q.help && <div className="help">{q.help}</div>}
            {q.id === "proposalName" ? (
              <ClientNameInput
                id={q.id}
                value={String(answers[q.id] ?? "")}
                placeholder={(q as { placeholder?: string }).placeholder}
                suggestions={clientNames}
                onChange={(v) => set(q.id, v)}
              />
            ) : (
              renderInput(q, answers, set)
            )}
          </div>
        ))}
      </div>

      {error && <p style={{ color: "#b3261e", fontSize: "0.9rem", marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn-primary" disabled={pending || !proposalName} onClick={submit}>
          {pending ? "Saving…" : "Save answers"}
        </button>
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
                <input type="checkbox" checked={checked}
                  onChange={() => set(q.id, checked ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                  style={{ width: "auto", marginRight: 8 }} />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    case "longtext":
      return <textarea id={q.id} placeholder={q.placeholder} value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />;
    default:
      return (
        <input id={q.id} type={q.type} placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      );
  }
}
