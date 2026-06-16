import Anthropic from "@anthropic-ai/sdk";
import { featureLabel, type PricingAnswers } from "./pricing";

/**
 * Drafts the human-readable scope summary for a proposal.
 *
 * The Anthropic model writes prose ONLY. It is never given authority over the
 * price — the total is computed deterministically in src/lib/pricing.ts and
 * passed in here purely as context so the wording is consistent.
 */
export async function generateScopeSummary(input: {
  proposalName: string;
  industry?: string;
  answers: PricingAnswers;
  total: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback so the app works before the key is configured.
    return defaultSummary(input);
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  const features = (input.answers.features ?? []).map(featureLabel).join(", ") || "standard features";

  const msg = await client.messages.create({
    model,
    max_tokens: 500,
    system:
      "You write concise, professional website-proposal scope summaries for Luna Creative, " +
      "a web design studio building Webflow sites for the ranch, hunting, and breeder community. " +
      "Write 2-3 short paragraphs. Do NOT mention or invent any prices, hours, or dollar amounts. " +
      "Be confident and benefit-focused, not salesy.",
    messages: [
      {
        role: "user",
        content:
          `Project: ${input.proposalName}\n` +
          `Industry: ${input.industry ?? "n/a"}\n` +
          `Included functionality: ${features}\n\n` +
          "Write the scope summary describing what we'll build.",
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || defaultSummary(input);
}

function defaultSummary(input: { proposalName: string; answers: PricingAnswers }): string {
  const features = (input.answers.features ?? []).map(featureLabel);
  const featureLine = features.length
    ? ` Included functionality: ${features.join(", ")}.`
    : "";
  return (
    `Luna Creative will design and develop a custom Webflow website for ${input.proposalName}, ` +
    `tailored to your goals with a clean, mobile-first design and the standard feature set ` +
    `(mobile optimization, interactive location map, basic SEO, fillable contact form, and photo/video gallery).` +
    featureLine
  );
}
