"use client";

import { Fragment, useEffect, useState } from "react";
import { Globe, ShoppingCart, FileText, PawPrint, Newspaper, FolderOpen, PlusCircle, Sparkles, Clock, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";
import { QUESTIONNAIRE, isFollowUp, isVisible, splitLabel, type Question } from "@/lib/questionnaire";
import BrandSelect from "@/components/BrandSelect";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { computeClientPrice, MAX_INCREMENTS, type ClientPrice, type Markup } from "@/lib/portal";
import type { PricingAnswers } from "@/lib/pricing";

// --- Approved client-facing copy (Phase 3 picks) ---
const REVEAL_LABEL = "See your price";
const CAPTION = "Here's what it takes to bring your website to life.";
const FOLLOWUP_MESSAGE = "Let's talk — we'll put together a custom quote for this.";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Existing site": Globe,
  "E-commerce": ShoppingCart,
  "Pages": FileText,
  "Animals & pedigrees": PawPrint,
  "Content": Newspaper,
  "Add-ons": PlusCircle,
  "Turnaround Time": Clock,
  "Custom": Sparkles,
};
const FALLBACK_SECTION_ICON: LucideIcon = FolderOpen;
const DEFAULT_ANSWERS: Answers = { rushTurnaround: "no-preference" };

type Answers = Record<string, string | boolean | string[] | undefined>;
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (q.type === "boolean") return v === true || v === false;
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== "";
}

// "(custom quote)" is internal jargon - strip it from option labels shown to a
// client (the answer still routes to the follow-up screen on submit).
function clientOptionLabel(label: string): string {
  return label.replace(/\s*\(custom quote\)\s*$/i, "");
}

export default function PortalQuote({ markup, demandPct }: { markup: Markup; demandPct: number }) {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [increments, setIncrements] = useState(0);
  const [result, setResult] = useState<ClientPrice | null>(null);

  const set = (id: string, value: Answers[string]) => setAnswers((a) => ({ ...a, [id]: value }));
  const questions = QUESTIONNAIRE.filter((q) => isVisible(q, answers));
  const canSubmit = questions.every((q) => q.id === "additionalFunctionality" || isAnswered(q, answers));

  const inc = () => setIncrements((n) => Math.min(MAX_INCREMENTS, n + 1));
  const dec = () => setIncrements((n) => Math.max(0, n - 1));

  // Keyboard nudge (discreet on a laptop): ↑/→ add, ↓/← remove. Disabled while
  // typing in a field, and once the price is showing.
  useEffect(() => {
    if (result) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); inc(); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); dec(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  const submit = () => {
    setResult(computeClientPrice(answers as PricingAnswers, markup, demandPct, increments));
  };
  const startOver = () => {
    setAnswers(DEFAULT_ANSWERS);
    setIncrements(0);
    setResult(null);
  };

  const businessName = String(answers.proposalName ?? "").trim();

  if (result) {
    return (
      <div className="container portal-result">
        <div className="pr-name">{businessName}</div>
        {result.requiresFollowUp ? (
          <p className="pr-followup">{FOLLOWUP_MESSAGE}</p>
        ) : (
          <>
            <p className="pr-caption">{CAPTION}</p>
            <div className="pr-price">{money(result.build)}</div>
            <div className="pr-monthly">+ {money(result.monthly)}/mo hosting &amp; maintenance</div>
          </>
        )}
        <button type="button" className="pr-restart" onClick={startOver}>Start over</button>
      </div>
    );
  }

  return (
    <>
      <IncrementRail count={increments} max={MAX_INCREMENTS} onInc={inc} onDec={dec} />
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card qform">
          {questions.map((q, i) => {
            const showHeader = q.section && q.section !== questions[i - 1]?.section;
            const followUp = isFollowUp(q, questions[i - 1]);
            const hasFollowUp = Boolean(questions[i + 1] && isFollowUp(questions[i + 1], q));
            const qClass = ["q", followUp && "q-followup", hasFollowUp && "q-has-followup"].filter(Boolean).join(" ");
            const labelParts = splitLabel({ label: q.clientLabel ?? q.label, emphasize: q.emphasize });
            const help = q.clientHelp ?? q.help;
            return (
              <Fragment key={q.id}>
                {showHeader && (() => {
                  const SectionIcon = SECTION_ICONS[q.section!] ?? FALLBACK_SECTION_ICON;
                  return (
                    <h3 className="section-head">
                      <SectionIcon size={15} aria-hidden /> {q.section}
                    </h3>
                  );
                })()}
                <div className={qClass}>
                  <label className="qlabel" htmlFor={q.id}>
                    {labelParts.map((p, idx) => (p.bold ? <strong key={idx}>{p.text}</strong> : p.text))}
                    {q.id !== "additionalFunctionality" && <span className="req">*</span>}
                  </label>
                  {help && <div className="help">{help}</div>}
                  {renderInput(q, answers, set)}
                </div>
              </Fragment>
            );
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="button" className="btn-primary" disabled={!canSubmit} onClick={submit}>
            {REVEAL_LABEL}
          </button>
        </div>
      </div>
    </>
  );
}

// Fixed, far-left, vertically centered rail: a quiet up/down control with a
// stack of light-gray dashes showing how many increments have been added. It
// stays mid-screen on scroll so the operator can nudge the price unobtrusively.
function IncrementRail({ count, max, onInc, onDec }: { count: number; max: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="increment-rail" aria-hidden>
      <button type="button" className="ir-arrow" onClick={onInc} disabled={count >= max} tabIndex={-1} aria-label="Increase">
        <ChevronUp size={16} />
      </button>
      <div className="ir-dashes">
        {Array.from({ length: count }).map((_, i) => <span key={i} className="ir-dash" />)}
      </div>
      <button type="button" className="ir-arrow" onClick={onDec} disabled={count <= 0} tabIndex={-1} aria-label="Decrease">
        <ChevronDown size={16} />
      </button>
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
          options={q.options.map((o) => ({ ...o, label: clientOptionLabel(o.label) }))}
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
                {clientOptionLabel(o.label)}
              </label>
            );
          })}
        </div>
      );
    case "longtext":
      // The internal placeholder mentions "custom quote" routing - the client
      // version relies on clientHelp instead, so don't echo that jargon here.
      return (
        <AutoGrowTextarea id={q.id} value={(answers[q.id] as string) ?? ""} onChange={(v) => set(q.id, v)} />
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
