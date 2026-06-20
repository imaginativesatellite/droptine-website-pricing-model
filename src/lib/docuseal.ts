/**
 * Self-hosted DocuSeal e-signature integration.
 *
 * Opt-in like the Anthropic integration: requires DOCUSEAL_API_KEY. Talks to
 * DOCUSEAL_API_URL, which should point at your own DocuSeal instance's /api
 * endpoint (e.g. a Railway deployment) — DocuSeal's hosted cloud also works
 * if you'd rather not self-host. Field names below are best-effort from
 * DocuSeal's published API examples; verify against your instance's own
 * /api/docs once a key is configured, since we couldn't reach their docs site
 * directly to confirm every field.
 */

const API_KEY = process.env.DOCUSEAL_API_KEY;
const API_URL = (process.env.DOCUSEAL_API_URL ?? "https://api.docuseal.com").replace(/\/$/, "");

export function docusealEnabled(): boolean {
  return Boolean(API_KEY);
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": API_KEY ?? "" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DocuSeal ${path} failed (${res.status}): ${text || res.statusText}`);
  return (text ? JSON.parse(text) : null) as T;
}

// DocuSeal's "create from PDF" endpoint returns one record per submitter; we
// only ever send one. submission_id is what webhooks correlate back to us.
export type DocusealSubmitter = {
  id: number;
  submission_id?: number;
  email: string;
  slug?: string;
  embed_src?: string;
  status?: string;
};

/** Sends a PDF (with {{...}} signature field tags already embedded) out for signature. */
export async function sendPdfForSignature(args: {
  name: string;
  pdf: Buffer;
  submitterEmail: string;
  submitterName?: string;
}): Promise<{ submissionId: string | null; submitter: DocusealSubmitter | null; raw: unknown }> {
  const raw = await call<DocusealSubmitter[] | DocusealSubmitter>("/submissions/pdf", {
    name: args.name,
    documents: [{ name: args.name, file: args.pdf.toString("base64") }],
    submitters: [{ role: "Client", email: args.submitterEmail, name: args.submitterName }],
  });

  const submitter = Array.isArray(raw) ? raw[0] ?? null : raw;
  const submissionId = submitter?.submission_id ?? submitter?.id ?? null;
  return { submissionId: submissionId != null ? String(submissionId) : null, submitter, raw };
}
