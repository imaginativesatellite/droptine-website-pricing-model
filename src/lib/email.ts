import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Luna Creative <proposals@notifications.luna-creative.com>";

/** Escape text before placing it in email HTML (client names are user-supplied). */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

async function send({ to, subject, html, attachments }: SendArgs) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", subject);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  });
}

/** Proposal email — always goes to the logged-in staff member. */
export async function sendProposalToStaff(args: {
  staffEmail: string;
  proposalName: string;
  total: number;
  monthly: number;
  code: string;
  proposalUrl: string;
  pdf?: Buffer;
}) {
  const name = esc(args.proposalName);
  await send({
    to: args.staffEmail,
    subject: `Proposal ready: ${args.proposalName}`,
    html:
      `<p>Your proposal for <strong>${name}</strong> is ready.</p>` +
      `<p>One-time build: <strong>${money(args.total)}</strong> &middot; ${money(args.monthly)}/mo hosting &amp; maintenance.</p>` +
      `<p>Link: <a href="${args.proposalUrl}">${args.proposalUrl}</a><br/>Access code: <strong>${esc(args.code)}</strong></p>`,
    attachments: args.pdf ? [{ filename: `${name}-proposal.pdf`, content: args.pdf }] : undefined,
  });
}

/** Notify admins on EVERY quote request (proposal or custom). */
export async function notifyAdmins(args: {
  proposalName: string;
  staffEmail: string;
  isCustom: boolean;
  total?: number;
  code: string;
  reasons?: string[];
  manageUrl: string; // link into the app (approve for custom; view for proposals)
}) {
  const to = adminEmails();
  if (to.length === 0) return;

  const name = esc(args.proposalName);
  const who = esc(args.staffEmail);
  const subject = args.isCustom
    ? `Custom quote requested: ${args.proposalName}`
    : `New proposal generated: ${args.proposalName}`;

  const body = args.isCustom
    ? `<p><strong>${who}</strong> requested a custom quote for <strong>${name}</strong>.</p>` +
      `<p>Reasons: ${esc((args.reasons ?? []).join("; ") || "complex functionality")}.</p>` +
      `<p><a href="${args.manageUrl}">Review &amp; approve in the app →</a></p>` +
      `<p>Reference code: <strong>${esc(args.code)}</strong></p>`
    : `<p><strong>${who}</strong> generated a proposal for <strong>${name}</strong>.</p>` +
      `<p>Total: <strong>${money(args.total ?? 0)}</strong>. ` +
      `<a href="${args.manageUrl}">View in the app →</a></p>` +
      `<p>Reference code: <strong>${esc(args.code)}</strong></p>`;

  await send({ to, subject, html: body });
}

/** Notify admins when staff sends a proposal out for client signature. */
export async function notifySignatureRequested(args: {
  proposalName: string;
  staffName: string;
  clientEmail: string;
  manageUrl: string;
}) {
  const to = adminEmails();
  if (to.length === 0) return;

  const name = esc(args.proposalName);
  const who = esc(args.staffName);
  const clientEmail = esc(args.clientEmail);

  await send({
    to,
    subject: `Signature requested: ${args.proposalName}`,
    html:
      `<p><strong>${who}</strong> sent the proposal for <strong>${name}</strong> to <strong>${clientEmail}</strong> for signature.</p>` +
      `<p><a href="${args.manageUrl}">View in the app →</a></p>`,
  });
}

/**
 * After an admin approves a custom quote — emailed to the requester (Droptine
 * staff), Droptine-branded, with the PDF attached and a link to their quotes.
 */
export async function sendApprovedQuoteToRequester(args: {
  requesterEmail: string;
  proposalName: string;
  total: number;
  monthly: number;
  code: string;
  proposalUrl: string;
  dashboardUrl: string;
  pdf?: Buffer;
}) {
  const name = esc(args.proposalName);
  await send({
    to: args.requesterEmail,
    subject: `Your Droptine quote is ready: ${args.proposalName}`,
    html:
      `<p>Good news — your custom quote for <strong>${name}</strong> has been approved.</p>` +
      `<p>One-time build: <strong>${money(args.total)}</strong> &middot; ${money(args.monthly)}/mo hosting &amp; maintenance.</p>` +
      `<p>The proposal is attached. You can also view it any time here: ` +
      `<a href="${args.proposalUrl}">${args.proposalUrl}</a> (access code <strong>${esc(args.code)}</strong>).</p>` +
      `<p>See all the quotes you've received: <a href="${args.dashboardUrl}">${args.dashboardUrl}</a></p>` +
      `<p>— Droptine</p>`,
    attachments: args.pdf ? [{ filename: `${name}-quote.pdf`, content: args.pdf }] : undefined,
  });
}
