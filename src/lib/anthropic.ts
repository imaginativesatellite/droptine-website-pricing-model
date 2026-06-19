import Anthropic from "@anthropic-ai/sdk";
import { computeQuote, type PricingAnswers } from "./pricing";

/** Plain-English list of what's included, derived from the answers. */
export function describeScope(answers: PricingAnswers): string[] {
  const items: string[] = [];
  if (!answers.ecommerce) items.push(`a ${answers.pageTier ?? "5-9"}-page website`);
  if (answers.ecommerce)
    items.push(
      `an online store${answers.ecommerceShopify ? " on Shopify" : ""}` +
        (answers.ecommerceItems ? ` (${answers.ecommerceItems} items)` : ""),
    );
  if (answers.animalPages)
    items.push(
      answers.animalIndividualPages
        ? `individual animal pages (${answers.animalCount ?? ""})`
        : "an animal listing page",
    );
  if (answers.pedigreePages)
    items.push(
      answers.pedigreeIndividualPages
        ? `individual pedigree/bloodline pages (${answers.pedigreeCount ?? ""})`
        : "a pedigree/bloodline page",
    );
  if (answers.realEstate)
    items.push("a real-estate package (property listings, agent logins, interactive property map)");
  if (answers.blog) items.push("a blog");
  if (answers.news) items.push("a news section");
  if (answers.events) items.push("an events page");
  return items;
}

/**
 * Drafts the human-readable scope summary for a proposal.
 *
 * The Anthropic model writes prose ONLY. It is never given authority over the
 * price — the total is computed deterministically in src/lib/pricing.ts.
 */
export async function generateScopeSummary(input: {
  proposalName: string;
  industry?: string;
  answers: PricingAnswers;
}): Promise<string> {
  // AI is opt-in: it only runs when ENABLE_AI=true AND a key is present.
  // Otherwise we use the deterministic template (no API call, no cost).
  const aiEnabled = process.env.ENABLE_AI === "true";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!aiEnabled || !apiKey) {
    return defaultSummary(input);
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
  const scope = describeScope(input.answers).join("; ") || "a standard website";

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
          `Scope includes: ${scope}\n\n` +
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
  const scope = describeScope(input.answers);
  const scopeLine = scope.length ? ` This includes ${scope.join(", ")}.` : "";
  return (
    `Luna Creative will design and develop a custom Webflow website for ${input.proposalName}, ` +
    `tailored to your goals with a clean, mobile-first design and the standard feature set ` +
    `(mobile optimization, interactive location map, basic SEO, fillable contact form, and photo/video gallery).` +
    scopeLine
  );
}

// Re-export so callers can compute alongside prose if needed.
export { computeQuote };

/**
 * Admin tool: recommend a one-time price for a custom quote, with reasoning,
 * considering the standard breakdown plus the complex functionality requested.
 * Gated behind ENABLE_AI; returns an { error } when AI is off.
 */
export async function recommendCustomPrice(input: {
  proposalName: string;
  lineItems: { label: string; amount: number }[];
  customReasons: string[];
  additionalFunctionality?: string;
  pageCountExact?: string;
  min: number;
  max: number;
}): Promise<{ reasoning: string } | { error: string }> {
  const aiEnabled = process.env.ENABLE_AI_PRICING === "true";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!aiEnabled || !apiKey) {
    return { error: "AI price recommendations are off. Set ENABLE_AI_PRICING=true in the environment to use this." };
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

  const itemized = input.lineItems.map((li) => `- ${li.label}: $${li.amount}`).join("\n") || "(none priced)";

  const msg = await client.messages.create({
    model,
    max_tokens: 500,
    system:
      "You price custom Webflow website builds for Luna Creative (ranch / hunting / breeder clients). " +
      "The standard calculator runs $4,000–$15,000; genuinely complex builds can exceed $15,000. " +
      "Given the standard line items plus the complex/extra functionality requested, recommend ONE one-time " +
      "build price (whole US dollars) and justify it in 2–4 sentences. Start your reply with a line exactly " +
      "like 'Recommended: $12,500' and then the reasoning. Weigh the extra build effort, risk, and ongoing " +
      "maintenance of the complex functionality.",
    messages: [
      {
        role: "user",
        content:
          `Project: ${input.proposalName}\n` +
          `Standard line items:\n${itemized}\n\n` +
          `Why it's custom: ${input.customReasons.join("; ") || "n/a"}\n` +
          (input.pageCountExact ? `Approx. page count requested: ${input.pageCountExact}\n` : "") +
          (input.additionalFunctionality ? `Complex / additional functionality requested:\n${input.additionalFunctionality}\n` : "") +
          `\nRecommend the one-time price and explain why.`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { reasoning: text || "No recommendation returned." };
}
