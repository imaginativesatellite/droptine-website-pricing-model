"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { QUESTIONNAIRE, type Question, type ShowIf } from "@/lib/questionnaire";
import ClientNameInput from "@/components/ClientNameInput";
import BrandSelect from "@/components/BrandSelect";
import { createQuote } from "./actions";

const DRAFT_KEY = "droptine-quote-draft";

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

// Every visible question must be answered, except the free-text box at the end.
function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (q.type === "boolean") return v === true || v === false;
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== "";
}

export default function NewQuoteForm({ clientNames }: { clientNames: string[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loaded = useRef(false);

  // Restore an in-progress draft from this device (survives a dropped connection).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    } catch {}
  }, [answers]);

  const set = (id: string, value: Answers[string]) => setAnswers((a) => ({ ...a, [id]: value }));
  const questions = QUESTIONNAIRE.filter((q) => visible(q, answers));
  const canSubmit = questions.every((q) => q.id === "additionalFunctionality" || isAnswered(q, answers));

  const submit = () => {
    setError(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    startTransition(async () => {
      const res = await createQuote(answers, shared);
      if (res?.error) {
        setError(res.error);
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(answers)); } catch {}
      }
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

      {error && (
        <p style={{ color: "#b3261e", fontSize: "0.9rem", marginTop: 12 }}>
          {error} Your answers are saved on this device — just press the button again.
        </p>
      )}

      <div className="q" style={{ marginTop: 14, borderBottom: "none" }}>
        <label className="qlabel">Viewable to everybody?</label>
        <div className="help">Off = only you (and admins) can see it. On = visible to all staff.</div>
        <div className="toggle">
          <button type="button" className={shared ? "on" : ""} onClick={() => setShared(true)}>Yes</button>
          <button type="button" className={!shared ? "on" : ""} onClick={() => setShared(false)}>No</button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn-primary" disabled={pending || !canSubmit} onClick={submit}>
          {pending ? "Saving…" : "Generate Proposal"}
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
        <BrandSelect
          id={q.id}
          value={(answers[q.id] as string) ?? ""}
          onChange={(v) => set(q.id, v || undefined)}
          options={q.options}
        />
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
