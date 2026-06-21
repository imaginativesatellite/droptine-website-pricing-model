"use client";

import { useState } from "react";
import { saveTemplate, resetTemplate } from "./actions";
import type { TemplateDef } from "@/lib/email-templates";

type Props = Omit<TemplateDef, "key"> & { templateKey: TemplateDef["key"]; customized: boolean };

/** Fill {{var}} placeholders with a readable sample so the preview reads naturally. */
function previewFill(tpl: string, variables: { name: string }[]): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const known = variables.some((v) => v.name === k);
    return known ? `[${k}]` : "";
  });
}

/** Who each template is addressed to — for the preview's "To" line only. */
function recipientHint(key: TemplateDef["key"]): string {
  switch (key) {
    case "proposal_to_member":
    case "approved_quote_to_requester":
      return "[member email]";
    case "admin_proposal_generated":
    case "admin_custom_requested":
    case "client_signed":
      return "Luna Creative admins";
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
      </div>
      <p className="help" style={{ marginTop: 0 }}>{description}</p>

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
              <li key={v.name}><code>{`{{${v.name}}}`}</code> — {v.description}</li>
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
