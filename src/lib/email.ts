import { Resend } from "resend";
import { renderEmail } from "./email-templates";

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
    console.warn("[email] RESEND_API_KEY not set - skipping send:", subject);
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

/** Proposal email - always goes to the logged-in member. */
export async function sendProposalToMember(args: {
  memberEmail: string;
  proposalName: string;
  total: number;
  monthly: number;
  code: string;
  proposalUrl: string;
  pdf?: Buffer;
}) {
  const name = esc(args.proposalName);
  const { subject, html } = await renderEmail("proposal_to_member", {
    proposalName: name,
    total: money(args.total),
    monthly: money(args.monthly),
    proposalUrl: args.proposalUrl,
  });
  await send({
    to: args.memberEmail,
    subject,
    html,
    attachments: args.pdf ? [{ filename: `${name}-proposal.pdf`, content: args.pdf }] : undefined,
  });
}

/** Notify admins on EVERY quote request (proposal or custom). */
export async function notifyAdmins(args: {
  proposalName: string;
  memberEmail: string;
  isCustom: boolean;
  total?: number;
  code: string;
  reasons?: string[];
  manageUrl: string; // link into the app (approve for custom; view for proposals)
}) {
  const to = adminEmails();
  if (to.length === 0) return;

  const name = esc(args.proposalName);
  const who = esc(args.memberEmail);
  const { subject, html } = args.isCustom
    ? await renderEmail("admin_custom_requested", {
        memberEmail: who,
        proposalName: name,
        reasons: esc((args.reasons ?? []).join("; ") || "complex functionality"),
        manageUrl: args.manageUrl,
        code: esc(args.code),
      })
    : await renderEmail("admin_proposal_generated", {
        memberEmail: who,
        proposalName: name,
        total: money(args.total ?? 0),
        manageUrl: args.manageUrl,
        code: esc(args.code),
      });

  await send({ to, subject, html });
}

/** Notify admins once the client has signed - the moment an admin actually
 *  needs to step in and complete the company signature. Held back until then
 *  rather than firing the moment a member requests it, so admins aren't pinged
 *  before there's anything for them to do. */
export async function notifyClientSigned(args: {
  proposalName: string;
  requestedByName: string;
  clientEmail: string;
  manageUrl: string;
}) {
  const to = adminEmails();
  if (to.length === 0) return;

  const name = esc(args.proposalName);
  const who = esc(args.requestedByName);
  const signerEmail = esc(args.clientEmail);

  const { subject, html } = await renderEmail("client_signed", {
    signerEmail,
    proposalName: name,
    requestedByName: who,
    manageUrl: args.manageUrl,
  });
  await send({ to, subject, html });
}

/** Once BOTH parties have signed, tell everyone the proposal is complete: the
 *  member it was prepared for and the Luna Creative admins. The fully signed PDF
 *  is attached when it could be retrieved. */
export async function notifyFullySigned(args: {
  proposalName: string;
  memberName: string;
  memberEmail: string;
  proposalUrl: string;
  pdf?: Buffer;
}) {
  const to = Array.from(new Set([args.memberEmail, ...adminEmails()].filter(Boolean)));
  if (to.length === 0) return;

  const name = esc(args.proposalName);
  const { subject, html } = await renderEmail("proposal_fully_signed", {
    proposalName: name,
    memberName: esc(args.memberName),
    proposalUrl: args.proposalUrl,
  });
  await send({
    to,
    subject,
    html,
    attachments: args.pdf ? [{ filename: `${name}-signed.pdf`, content: args.pdf }] : undefined,
  });
}

/**
 * After an admin approves a custom quote - emailed to the requester (Droptine
 * member), Droptine-branded, with the PDF attached and a link to their quotes.
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
  const { subject, html } = await renderEmail("approved_quote_to_requester", {
    proposalName: name,
    total: money(args.total),
    monthly: money(args.monthly),
    proposalUrl: args.proposalUrl,
    code: esc(args.code),
    dashboardUrl: args.dashboardUrl,
  });
  await send({
    to: args.requesterEmail,
    subject,
    html,
    attachments: args.pdf ? [{ filename: `${name}-quote.pdf`, content: args.pdf }] : undefined,
  });
}
