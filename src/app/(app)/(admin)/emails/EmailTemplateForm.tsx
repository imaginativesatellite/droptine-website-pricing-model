"use client";

import { useState, useTransition } from "react";
import { saveTemplate, resetTemplate, setTemplateEnabled } from "./actions";
import type { TemplateDef } from "@/lib/email-templates";

type Props = Omit<TemplateDef, "key"> & { templateKey: TemplateDef["key"]; customized: boolean; enabled: boolean };

/** Quick on/off switch for a template. Off means the email is never sent. */
function EnabledToggle({ templateKey, enabled }: { templateKey: TemplateDef["key"]; enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next); // optimistic
    setErr(null);
    startTransition(async () => {
      try {
        await setTemplateEnabled(templateKey, next);
      } catch (e) {
        setOn(!next); // revert on failure
        setErr(e instanceof Error ? e.message : "Couldn't save - try again.");
      }
    });
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={pending}
        title={on ? "This email is on - click to stop sending it" : "This email is off - click to start sending it"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          background: "none",
          cursor: pending ? "default" : "pointer",
          padding: 0,
          opacity: pending ? 0.6 : 1,
        }}
      >
        <span
          style={{
            width: 38,
            height: 22,
            borderRadius: 999,
            background: on ? "var(--good)" : "var(--line)",
            position: "relative",
            transition: "background 0.15s",
            flex: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: on ? 18 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.15s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          />
        </span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: on ? "var(--good)" : "var(--muted)" }}>
          {on ? "On" : "Off"}
        </span>
      </button>
      {err && <span className="help" style={{ color: "#b3261e", maxWidth: 260, textAlign: "right" }}>{err}</span>}
    </span>
  );
}

/** Fill {{var}} placeholders with a readable sample so the preview reads naturally. */
function previewFill(tpl: string, variables: { name: string }[]): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const known = variables.some((v) => v.name === k);
    return known ? `[${k}]` : "";
  });
}

/** Who each template is addressed to - for the preview's "To" line only. */
function recipientHint(key: TemplateDef["key"]): string {
  switch (key) {
    case "proposal_to_member":
    case "approved_quote_to_requester":
      return "[member email]";
    case "admin_proposal_generated":
    case "admin_custom_requested":
    case "client_signed":
      return "Luna Creative admins";
    case "proposal_fully_signed":
      return "Member + Luna Creative admins";
  }
}

export default function EmailTemplateForm(props: Props) {
  const { templateKey: key, name, description, variables } = props;
  const [subject, setSubject] = useState(props.subject);
  const [body, setBody] = useState(props.body);

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        {props.customized && <span className="pill gold">Customized</span>}
        <span style={{ marginLeft: "auto" }}>
          <EnabledToggle templateKey={key} enabled={props.enabled} />
        </span>
      </div>
      <p className="help" style={{ marginTop: 0 }}>{description}</p>
      {!props.enabled && (
        <p className="help" style={{ marginTop: 0, color: "var(--muted)" }}>
          This email is currently <strong>off</strong> and won&apos;t be sent.
        </p>
      )}

      <form action={saveTemplate}>
        <input type="hidden" name="key" value={key} />

        <label className="qlabel" htmlFor={`subject-${key}`} style={{ display: "block", marginTop: 18 }}>Subject</label>
        <input
          id={`subject-${key}`}
          type="text"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <label className="qlabel" htmlFor={`body-${key}`}>Body (HTML)</label>
        <textarea
          id={`body-${key}`}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width: "100%", minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: "0.82rem" }}
        />

        <div style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "10px 0" }}>
          Available variables (wrap in double braces, e.g. <code>{"{{proposalName}}"}</code>):
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {variables.map((v) => (
              <li key={v.name}><code>{`{{${v.name}}}`}</code> - {v.description}</li>
            ))}
          </ul>
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, margin: "12px 0 6px" }}>
          Preview
        </div>
        {/* Faux email-client window so this reads as a rendered message, not an
            editable field: a tinted From/To/Subject header above the body. */}
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)", padding: "10px 14px", fontSize: "0.82rem", lineHeight: 1.6 }}>
            <div><span style={{ color: "var(--muted)", display: "inline-block", width: 58 }}>From</span> Luna Creative</div>
            <div><span style={{ color: "var(--muted)", display: "inline-block", width: 58 }}>To</span> {recipientHint(key)}</div>
            <div><span style={{ color: "var(--muted)", display: "inline-block", width: 58 }}>Subject</span> <strong>{previewFill(subject, variables)}</strong></div>
          </div>
          <div style={{ background: "#fff", padding: "14px 16px" }} dangerouslySetInnerHTML={{ __html: previewFill(body, variables) }} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>

      {props.customized && (
        <form action={resetTemplate.bind(null, key)} style={{ marginTop: 10 }}>
          <button type="submit" className="btn-secondary">Reset to default</button>
        </form>
      )}
    </div>
  );
}
