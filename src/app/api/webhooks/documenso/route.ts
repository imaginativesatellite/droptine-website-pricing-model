import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { companyEmail, downloadSignedPdf } from "@/lib/documenso";
import { notifyClientSigned, notifyFullySigned } from "@/lib/email";
import { appUrl } from "@/lib/quote";

/**
 * Documenso webhook receiver - updates Quote signature status as the client
 * and the shared company recipient view/sign/decline. Configure this URL
 * (https://<your-app>/api/webhooks/documenso) in your Documenso instance's
 * webhook settings.
 *
 * Payload shape is best-effort (docs.documenso.com returns 403 to automated
 * fetches, so this wasn't verified against a live instance): deliveries carry
 * an `event` name plus a `payload` envelope with a `recipients[]` array. We
 * re-sync state by scanning recipients (matched by email) rather than
 * branching on the exact event name/casing, since that wasn't fully
 * confirmed - adjust here if your instance's real payload differs.
 */

const WEBHOOK_SECRET = process.env.DOCUMENSO_WEBHOOK_SECRET;

type DocumensoWebhookRecipient = {
  email?: string;
  signingStatus?: string;
  signedAt?: string;
};

type DocumensoWebhookPayload = {
  event?: string;
  payload?: {
    id?: number | string;
    status?: string;
    recipients?: DocumensoWebhookRecipient[];
  };
};

export async function POST(req: Request) {
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-documenso-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const body = (await req.json()) as DocumensoWebhookPayload;
  const envelope = body.payload;
  if (!envelope?.id) return new Response("OK", { status: 200 });

  const quote = await prisma.quote.findFirst({
    where: { signatureEnvelopeId: String(envelope.id) },
    include: { client: true, createdBy: true },
  });
  if (!quote) return new Response("OK", { status: 200 });

  const recipients = envelope.recipients ?? [];
  // The first party who signs is the member the proposal was prepared for
  // (Droptine), not their downstream client. We identify them as the recipient
  // that ISN'T the shared company identity, so this works regardless of which
  // email the envelope was addressed to.
  const company = recipients.find((r) => r.email?.toLowerCase() === companyEmail().toLowerCase());
  const member = recipients.find((r) => r.email && r.email.toLowerCase() !== companyEmail().toLowerCase());

  // Compare signing status case-insensitively - the exact casing Documenso
  // sends wasn't confirmed against a live instance, so don't depend on it.
  const status = (r?: DocumensoWebhookRecipient) => (r?.signingStatus ?? "").toUpperCase();
  const clientSignedAt = status(member) === "SIGNED" ? new Date(member!.signedAt ?? Date.now()) : quote.clientSignedAt;
  const companySignedAt = status(company) === "SIGNED" ? new Date(company!.signedAt ?? Date.now()) : quote.companySignedAt;

  const declined = recipients.some((r) => ["REJECTED", "DECLINED"].includes(status(r)));
  const signatureStatus = declined
    ? "DECLINED"
    : clientSignedAt && companySignedAt
    ? "SIGNED"
    : clientSignedAt || companySignedAt
    ? "PARTIALLY_SIGNED"
    : "SENT";

  // Transitions we react to, computed against the state we had BEFORE this update.
  const memberJustSigned = !quote.clientSignedAt && Boolean(clientSignedAt);
  const wasFullySigned = Boolean(quote.clientSignedAt && quote.companySignedAt);
  const nowFullySigned = Boolean(clientSignedAt && companySignedAt);
  const justFullySigned = !wasFullySigned && nowFullySigned;

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      signatureStatus,
      clientSignedAt,
      companySignedAt,
      signatureMeta: body as unknown as Prisma.InputJsonValue,
    },
  });

  // Member signed, but the company signature is still outstanding: ask an admin
  // to sign (this proposal needs both signatures).
  if (memberJustSigned && !companySignedAt) {
    try {
      await notifyClientSigned({
        proposalName: quote.proposalName,
        requestedByName: quote.createdBy.name ?? quote.createdBy.email,
        clientEmail: member?.email ?? quote.createdBy.email,
        manageUrl: `${appUrl()}/quote/${quote.id}`,
      });
    } catch {
      // The signature state is already saved - don't let a notification failure affect the webhook ack.
    }
  }

  // Both parties have now signed: tell everyone it's complete, with the signed PDF.
  if (justFullySigned) {
    try {
      const signedPdf = quote.signatureEnvelopeId
        ? await downloadSignedPdf(quote.signatureEnvelopeId)
        : null;
      await notifyFullySigned({
        proposalName: quote.proposalName,
        memberName: quote.createdBy.name ?? quote.createdBy.email,
        memberEmail: quote.createdBy.email,
        proposalUrl: `${appUrl()}/quote/${quote.id}`,
        pdf: signedPdf ?? undefined,
      });
    } catch {
      // Notification failure must not affect the webhook ack.
    }
  }

  return new Response("OK", { status: 200 });
}
