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

        <label className="qlabel" htmlFor={`subject-${key}`}>Subject</label>
        <input
          id={`subject-${key}`}
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ width: "100%", marginBottom: 14 }}
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
        <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{previewFill(subject, variables)}</div>
          <div dangerouslySetInnerHTML={{ __html: previewFill(body, variables) }} />
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
