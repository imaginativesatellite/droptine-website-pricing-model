import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { companyEmail } from "@/lib/documenso";
import { notifyClientSigned } from "@/lib/email";
import { appUrl } from "@/lib/quote";

/**
 * Documenso webhook receiver — updates Quote signature status as the client
 * and the shared company recipient view/sign/decline. Configure this URL
 * (https://<your-app>/api/webhooks/documenso) in your Documenso instance's
 * webhook settings.
 *
 * Payload shape is best-effort (docs.documenso.com returns 403 to automated
 * fetches, so this wasn't verified against a live instance): deliveries carry
 * an `event` name plus a `payload` envelope with a `recipients[]` array. We
 * re-sync state by scanning recipients (matched by email) rather than
 * branching on the exact event name/casing, since that wasn't fully
 * confirmed — adjust here if your instance's real payload differs.
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
  const clientEmail = quote.client.email?.toLowerCase();
  const client = clientEmail ? recipients.find((r) => r.email?.toLowerCase() === clientEmail) : undefined;
  const company = recipients.find((r) => r.email?.toLowerCase() === companyEmail().toLowerCase());

  const clientSignedAt = client?.signingStatus === "SIGNED" ? new Date(client.signedAt ?? Date.now()) : quote.clientSignedAt;
  const companySignedAt = company?.signingStatus === "SIGNED" ? new Date(company.signedAt ?? Date.now()) : quote.companySignedAt;

  const declined = recipients.some((r) => r.signingStatus === "REJECTED" || r.signingStatus === "DECLINED");
  const signatureStatus = declined
    ? "DECLINED"
    : clientSignedAt && companySignedAt
    ? "SIGNED"
    : clientSignedAt || companySignedAt
    ? "PARTIALLY_SIGNED"
    : "SENT";

  const justSigned = !quote.clientSignedAt && clientSignedAt;

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      signatureStatus,
      clientSignedAt,
      companySignedAt,
      signatureMeta: body as unknown as Prisma.InputJsonValue,
    },
  });

  if (justSigned && quote.client.email) {
    try {
      await notifyClientSigned({
        proposalName: quote.proposalName,
        requestedByName: quote.createdBy.name ?? quote.createdBy.email,
        clientEmail: quote.client.email,
        manageUrl: `${appUrl()}/quote/${quote.id}`,
      });
    } catch {
      // The signature state is already saved — don't let a notification failure affect the webhook ack.
    }
  }

  return new Response("OK", { status: 200 });
}
