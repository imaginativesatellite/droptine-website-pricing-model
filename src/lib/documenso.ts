/**
 * Self-hosted Documenso e-signature integration (documenso/documenso, AGPL-3.0).
 * Opt-in: requires DOCUMENSO_API_KEY + DOCUMENSO_COMPANY_EMAIL. DOCUMENSO_API_URL
 * is your instance's base URL with no /api suffix (e.g. a Railway deployment),
 * or https://app.documenso.com if you'd rather use their hosted cloud.
 *
 * Two recipients sign sequentially per quote: the client, then a shared
 * "company" identity (DOCUMENSO_COMPANY_EMAIL/NAME) that any logged-in admin
 * can complete — see confirmCompanySignature in quote/[id]/actions.ts for how
 * we record *which* admin actually did it (Documenso only sees the one shared
 * recipient, not our app's individual admin accounts).
 *
 * We embed signing by iframing each recipient's own signing-page URL
 * (`/sign/{token}`, the same page Documenso would otherwise email them a link
 * to) rather than using Documenso's official embed npm packages or `/embed/`
 * routes — those are a separately-licensed product feature on top of the
 * AGPL core, and bundling that SDK into a closed-source app raises the kind
 * of "combined work" question the AGPL is built around. A plain iframe at a
 * normal page URL on our own self-hosted instance avoids that question.
 *
 * Field placement is coordinate-based against a dedicated, fixed-layout
 * "Signatures" page we always render last — see lib/signature-layout.ts.
 * Field/endpoint names below are best-effort from Documenso's public docs and
 * source (their docs site returns 403 to automated fetches, so this wasn't
 * verified against a live instance); check your own deploy's /developers/api
 * docs if something doesn't line up.
 */
import { SIGNATURE_FIELDS } from "./signature-layout";

const API_KEY = process.env.DOCUMENSO_API_KEY;
const API_URL = (process.env.DOCUMENSO_API_URL ?? "https://app.documenso.com").replace(/\/$/, "");
const COMPANY_EMAIL = process.env.DOCUMENSO_COMPANY_EMAIL ?? "";
const COMPANY_NAME = process.env.DOCUMENSO_COMPANY_NAME ?? "Luna Creative LLC";

export function documensoEnabled(): boolean {
  return Boolean(API_KEY && COMPANY_EMAIL);
}

export function companyEmail(): string {
  return COMPANY_EMAIL;
}

/** The recipient's own signing page on our instance — embedded via iframe. */
export function documensoSignUrl(token: string): string {
  return `${API_URL}/sign/${token}`;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: API_KEY ?? "" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Documenso ${path} failed (${res.status}): ${text || res.statusText}`);
  return (text ? JSON.parse(text) : null) as T;
}

type DocumensoRecipient = { id: number; email: string; token?: string; signingUrl?: string };
type EnvelopeResponse = { id: number | string; recipients?: DocumensoRecipient[] };

function field(type: "SIGNATURE" | "DATE", box: { page: number; positionX: number; positionY: number; width: number; height: number }) {
  return { type, page: box.page, positionX: box.positionX, positionY: box.positionY, width: box.width, height: box.height };
}

function tokenFor(recipients: DocumensoRecipient[] | undefined, email: string): string | null {
  return recipients?.find((r) => r.email.toLowerCase() === email.toLowerCase())?.token ?? null;
}

/** Creates a two-recipient envelope (client, then the shared company
 *  identity) from a rendered proposal PDF and immediately sends it, returning
 *  each party's signing token for building their embedded signing iframe. */
export async function sendEnvelopeForSignature(args: {
  title: string;
  pdf: Buffer;
  clientEmail: string;
  clientName: string;
}): Promise<{ envelopeId: string; clientToken: string | null; companyToken: string | null; raw: unknown }> {
  const payload = {
    title: args.title,
    type: "DOCUMENT",
    recipients: [
      {
        email: args.clientEmail,
        name: args.clientName,
        role: "SIGNER",
        signingOrder: 1,
        fields: [field("SIGNATURE", SIGNATURE_FIELDS.client.signature), field("DATE", SIGNATURE_FIELDS.client.date)],
      },
      {
        email: COMPANY_EMAIL,
        name: COMPANY_NAME,
        role: "SIGNER",
        signingOrder: 2,
        fields: [field("SIGNATURE", SIGNATURE_FIELDS.company.signature), field("DATE", SIGNATURE_FIELDS.company.date)],
      },
    ],
  };

  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  form.append("files", new Blob([new Uint8Array(args.pdf)], { type: "application/pdf" }), `${args.title}.pdf`);

  const created = await call<EnvelopeResponse>("/api/v2/envelope/create", { method: "POST", body: form });

  const distributed = await call<EnvelopeResponse>("/api/v2/envelope/distribute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ envelopeId: created.id }),
  });

  const recipients = distributed.recipients ?? created.recipients;

  return {
    envelopeId: String(created.id),
    clientToken: tokenFor(recipients, args.clientEmail),
    companyToken: tokenFor(recipients, COMPANY_EMAIL),
    raw: distributed,
  };
}
