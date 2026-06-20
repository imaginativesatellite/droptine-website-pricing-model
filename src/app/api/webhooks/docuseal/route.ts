import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * DocuSeal webhook receiver — updates Quote signature status as the client
 * views/signs/declines. Configure this URL (https://<your-app>/api/webhooks/docuseal)
 * in your DocuSeal instance's webhook settings.
 *
 * Payload shape is best-effort (DocuSeal's docs site wasn't reachable while
 * building this): each event is submitter-centric with a nested `submission`
 * object. We match on `submission.id` against the `signatureSubmissionId` we
 * stored when sending it out. Adjust field names here if your instance's
 * actual payload differs once you can inspect a real webhook delivery.
 */

const WEBHOOK_SECRET = process.env.DOCUSEAL_WEBHOOK_SECRET;

type DocusealWebhookPayload = {
  event_type?: string;
  data?: {
    id?: number | string;
    submission_id?: number | string;
    email?: string;
    status?: string;
    completed_at?: string;
    declined_at?: string;
    submission?: {
      id?: number | string;
      status?: string;
      combined_document_url?: string;
      audit_log_url?: string;
      url?: string;
    };
    documents?: { name?: string; url?: string }[];
  };
};

export async function POST(req: Request) {
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-docuseal-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload = (await req.json()) as DocusealWebhookPayload;
  const data = payload.data;
  if (!data) return new Response("OK", { status: 200 });

  const submissionId = data.submission?.id ?? data.submission_id;
  if (submissionId == null) return new Response("OK", { status: 200 });

  const quote = await prisma.quote.findFirst({ where: { signatureSubmissionId: String(submissionId) } });
  if (!quote) return new Response("OK", { status: 200 });

  const eventType = payload.event_type ?? "";
  const documentUrl = data.submission?.combined_document_url ?? data.documents?.[0]?.url ?? null;

  const signatureMeta = payload as unknown as Prisma.InputJsonValue;

  if (eventType === "form.viewed") {
    await prisma.quote.update({ where: { id: quote.id }, data: { signatureStatus: "VIEWED", signatureMeta } });
  } else if (eventType === "form.completed") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        signatureStatus: "SIGNED",
        signatureSignedAt: data.completed_at ? new Date(data.completed_at) : new Date(),
        signedDocumentUrl: documentUrl,
        signatureMeta,
      },
    });
  } else if (eventType === "form.declined") {
    await prisma.quote.update({ where: { id: quote.id }, data: { signatureStatus: "DECLINED", signatureMeta } });
  }

  return new Response("OK", { status: 200 });
}
