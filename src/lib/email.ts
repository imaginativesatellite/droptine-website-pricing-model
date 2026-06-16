import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Luna Creative <proposals@notifications.luna-creative.com>";

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
  code: string;
  proposalUrl: string;
  pdf?: Buffer;
}) {
  await send({
    to: args.staffEmail,
    subject: `Proposal ready: ${args.proposalName}`,
    html:
      `<p>Your proposal for <strong>${args.proposalName}</strong> is ready.</p>` +
      `<p>One-time build: <strong>$${args.total.toLocaleString()}</strong> &middot; $169/mo hosting &amp; maintenance.</p>` +
      `<p>Private link: <a href="${args.proposalUrl}">${args.proposalUrl}</a><br/>Access code: <strong>${args.code}</strong></p>`,
    attachments: args.pdf ? [{ filename: `${args.proposalName}-proposal.pdf`, content: args.pdf }] : undefined,
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
}) {
  const to = adminEmails();
  if (to.length === 0) return;

  const subject = args.isCustom
    ? `Custom quote requested: ${args.proposalName}`
    : `New proposal generated: ${args.proposalName}`;

  const body = args.isCustom
    ? `<p><strong>${args.staffEmail}</strong> requested a custom quote for <strong>${args.proposalName}</strong>.</p>` +
      `<p>Reasons: ${(args.reasons ?? []).join("; ") || "complex functionality"}.</p>` +
      `<p>Needs manual follow-up. Reference code: <strong>${args.code}</strong></p>`
    : `<p><strong>${args.staffEmail}</strong> generated a proposal for <strong>${args.proposalName}</strong>.</p>` +
      `<p>Total: <strong>$${(args.total ?? 0).toLocaleString()}</strong>. Reference code: <strong>${args.code}</strong></p>`;

  await send({ to, subject, html: body });
}
