import { prisma } from "./db";

/**
 * Transactional email templates.
 *
 * The built-in defaults below are the source of truth for wording. Admins can
 * override any template's subject/body from the admin "Emails" tab; an override
 * is stored as an `EmailTemplate` row and takes precedence at send time. If no
 * override exists, the default here is used - so the app always sends sensible
 * copy even with an empty table.
 *
 * Bodies are HTML with {{variable}} placeholders filled in at send time (see
 * `fillTemplate`). User-supplied values (names, emails, codes) are HTML-escaped
 * by the caller before substitution.
 */
export type TemplateKey =
  | "proposal_to_member"
  | "admin_proposal_generated"
  | "admin_custom_requested"
  | "client_signed"
  | "proposal_fully_signed"
  | "approved_quote_to_requester";

export type TemplateVar = { name: string; description: string };

export type TemplateDef = {
  key: TemplateKey;
  name: string;
  description: string;
  variables: TemplateVar[];
  subject: string;
  body: string;
};

export const EMAIL_TEMPLATES: TemplateDef[] = [
  {
    key: "proposal_to_member",
    name: "Proposal ready (to member)",
    description: "Sent to the member who generated an auto-priced proposal, with the PDF attached.",
    variables: [
      { name: "proposalName", description: "The proposal / project name" },
      { name: "total", description: "One-time build price, formatted (e.g. $8,500)" },
      { name: "monthly", description: "Monthly cost, formatted" },
      { name: "proposalUrl", description: "Link to the private proposal page" },
    ],
    subject: "Your proposal is ready: {{proposalName}}",
    body:
      `<p>Your proposal for <strong>{{proposalName}}</strong> is ready.</p>` +
      `<p>One-time build <strong>{{total}}</strong> &middot; {{monthly}}/mo.</p>` +
      `<p><a href="{{proposalUrl}}">View your proposal</a></p>` +
      `<p>- Luna Creative</p>`,
  },
  {
    key: "admin_proposal_generated",
    name: "New proposal generated (to admins)",
    description: "Notifies Luna Creative admins whenever a member generates an auto-priced proposal.",
    variables: [
      { name: "memberEmail", description: "Email of the member who generated it" },
      { name: "proposalName", description: "The proposal / project name" },
      { name: "total", description: "One-time build price, formatted" },
      { name: "manageUrl", description: "Link to view the quote in the app" },
    ],
    subject: "New proposal: {{proposalName}}",
    body:
      `<p><strong>{{memberEmail}}</strong> generated a proposal for <strong>{{proposalName}}</strong> ({{total}}).</p>` +
      `<p><a href="{{manageUrl}}">View in the app</a></p>`,
  },
  {
    key: "admin_custom_requested",
    name: "Custom quote requested (to admins)",
    description: "Notifies admins when a member's request routes to a custom quote awaiting approval. Sent high priority (action needed).",
    variables: [
      { name: "memberEmail", description: "Email of the member who requested it" },
      { name: "proposalName", description: "The proposal / project name" },
      { name: "reasons", description: "Why it routed to custom (semicolon-separated)" },
      { name: "manageUrl", description: "Link to review & approve in the app" },
    ],
    subject: "Custom quote requested: {{proposalName}}",
    body:
      `<p><strong>{{memberEmail}}</strong> requested a custom quote for <strong>{{proposalName}}</strong>.</p>` +
      `<p>Reason: {{reasons}}</p>` +
      `<p><a href="{{manageUrl}}">Review &amp; approve</a></p>`,
  },
  {
    key: "client_signed",
    name: "Signature needed (to admins)",
    description: "Sent to admins after the member signs, so Luna Creative can add its signature. Sent high priority (action needed).",
    variables: [
      { name: "signerEmail", description: "Email of whoever signed the proposal" },
      { name: "proposalName", description: "The proposal / project name" },
      { name: "manageUrl", description: "Link to add Luna Creative's signature" },
    ],
    subject: "Signature needed: {{proposalName}}",
    body:
      `<p><strong>{{signerEmail}}</strong> signed the proposal for <strong>{{proposalName}}</strong>.</p>` +
      `<p><a href="{{manageUrl}}">Add Luna Creative's signature</a></p>`,
  },
  {
    key: "proposal_fully_signed",
    name: "Signed & complete (to both parties)",
    description: "Sent to the member and Luna Creative admins once BOTH parties have signed. The signed PDF is attached when available.",
    variables: [
      { name: "proposalName", description: "The proposal / project name" },
      { name: "proposalUrl", description: "Link to the proposal page" },
    ],
    subject: "Signed & complete: {{proposalName}}",
    body:
      `<p>The proposal for <strong>{{proposalName}}</strong> is signed by both parties and complete.</p>` +
      `<p>The signed copy is attached. <a href="{{proposalUrl}}">View it here</a></p>` +
      `<p>- Luna Creative</p>`,
  },
  {
    key: "approved_quote_to_requester",
    name: "Custom quote approved (to member)",
    description: "Sent to the member after an admin approves their custom quote, with the PDF attached.",
    variables: [
      { name: "proposalName", description: "The proposal / project name" },
      { name: "total", description: "One-time build price, formatted" },
      { name: "monthly", description: "Monthly cost, formatted" },
      { name: "proposalUrl", description: "Link to the private proposal page" },
    ],
    subject: "Your quote is ready: {{proposalName}}",
    body:
      `<p>Your custom quote for <strong>{{proposalName}}</strong> has been approved.</p>` +
      `<p>One-time build <strong>{{total}}</strong> &middot; {{monthly}}/mo.</p>` +
      `<p>The proposal is attached. <a href="{{proposalUrl}}">View it here</a>.</p>` +
      `<p>- Luna Creative</p>`,
  },
];

export const TEMPLATE_MAP: Record<TemplateKey, TemplateDef> = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [t.key, t]),
) as Record<TemplateKey, TemplateDef>;

/** Replace {{var}} placeholders. Unknown placeholders collapse to empty string. */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in vars ? vars[k] : ""));
}

/** Effective subject/body for a key: admin override if present, else the default. */
export async function resolveTemplate(key: TemplateKey): Promise<{ subject: string; body: string }> {
  const def = TEMPLATE_MAP[key];
  let override: { subject: string; body: string } | null = null;
  try {
    override = await prisma.emailTemplate.findUnique({ where: { key }, select: { subject: true, body: true } });
  } catch {
    // table may not exist yet (pre-migration) - fall back to defaults
  }
  return { subject: override?.subject ?? def.subject, body: override?.body ?? def.body };
}

/** Render a template by key with the given variables into { subject, html }. */
export async function renderEmail(key: TemplateKey, vars: Record<string, string>): Promise<{ subject: string; html: string }> {
  const { subject, body } = await resolveTemplate(key);
  return { subject: fillTemplate(subject, vars), html: fillTemplate(body, vars) };
}

/** For the admin UI: every template with its current effective copy + whether it's been customized. */
export async function getEffectiveTemplates(): Promise<(TemplateDef & { customized: boolean })[]> {
  let overrides: { key: string; subject: string; body: string }[] = [];
  try {
    overrides = await prisma.emailTemplate.findMany();
  } catch {
    overrides = [];
  }
  const map = new Map(overrides.map((o) => [o.key, o]));
  return EMAIL_TEMPLATES.map((def) => {
    const o = map.get(def.key);
    return { ...def, subject: o?.subject ?? def.subject, body: o?.body ?? def.body, customized: !!o };
  });
}
