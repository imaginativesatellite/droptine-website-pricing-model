"use client";

import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { QUESTIONNAIRE, isFollowUp, isVisible, splitLabel, type Question } from "@/lib/questionnaire";
import ClientNameInput from "@/components/ClientNameInput";
import BrandSelect from "@/components/BrandSelect";
import { VISIBILITY_TIP } from "@/lib/quote";
import { createQuote } from "./actions";

const DRAFT_KEY = "droptine-quote-draft";

type Answers = Record<string, string | boolean | string[] | undefined>;

// Every visible question must be answered, except the free-text box at the end.
function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (q.type === "boolean") return v === true || v === false;
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== "";
}

export default function NewQuoteForm({ clientNames, defaultShared }: { clientNames: string[]; defaultShared: boolean }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [shared, setShared] = useState(defaultShared);
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
  const questions = QUESTIONNAIRE.filter((q) => isVisible(q, answers));
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

  const clearAll = () => {
    setAnswers({});
    setError(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <button type="button" className="clear-all-link" onClick={clearAll}>
          Clear
        </button>
      </div>
      <div className="card qform">
        {questions.map((q, i) => {
          const showHeader = q.section && q.section !== questions[i - 1]?.section;
          const followUp = isFollowUp(q, questions[i - 1]);
          const hasFollowUp = Boolean(questions[i + 1] && isFollowUp(questions[i + 1], q));
          const qClass = ["q", followUp && "q-followup", hasFollowUp && "q-has-followup"].filter(Boolean).join(" ");
          return (
            <Fragment key={q.id}>
              {showHeader && <h3 className="section-head">{q.section}</h3>}
              <div className={qClass}>
                <label className="qlabel" htmlFor={q.id}>
                  {splitLabel(q).map((p, idx) => (p.bold ? <strong key={idx}>{p.text}</strong> : p.text))}
                  {q.id !== "additionalFunctionality" && <span className="req">*</span>}
                </label>
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
            </Fragment>
          );
        })}
      </div>

      {error && (
        <p style={{ color: "#b3261e", fontSize: "0.9rem", marginTop: 12 }}>
          {error} Your answers are saved on this device — just press the button again.
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <label className="switch-row">
          <span className="switch">
            <input type="checkbox" checked={!shared} onChange={(e) => setShared(!e.target.checked)} />
            <span className="slider" />
          </span>
          <span>
            Private{" "}
            <span className="tip" title={VISIBILITY_TIP}>ⓘ</span>
          </span>
        </label>
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
    default: {
      const numeric = "numeric" in q && q.numeric;
      return (
        <input
          id={q.id}
          type={q.type}
          inputMode={numeric ? "numeric" : undefined}
          placeholder={q.placeholder}
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => set(q.id, numeric ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)}
        />
      );
    }
  }
}
