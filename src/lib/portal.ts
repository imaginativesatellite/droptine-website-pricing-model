/**
 * Client-facing Presentation Mode - shared helpers.
 *
 * Pricing stays deterministic: src/lib/pricing.ts computes Luna Creative's price
 * with no knowledge of markup. The markup here is a separate layer applied ONLY
 * to quotes generated in the client portal (origin = CLIENT), never to the Luna
 * engine itself.
 */

/** Default markup, mirrored by the schema column defaults (see schema.prisma). */
export const DEFAULT_MARKUP = {
  website: 5000,
  websiteIsPercent: false,
  monthly: 50,
  increment: 500,
} as const;

/** Most increments the price arrows can add on the client questionnaire. */
export const MAX_INCREMENTS = 20;

export type Markup = {
  website: number;
  websiteIsPercent: boolean;
  monthly: number;
  increment: number;
};

/** A member's saved markup, falling back to the defaults for any missing field. */
export function readMarkup(u: Partial<Markup> | null | undefined): Markup {
  return {
    website: u?.website ?? DEFAULT_MARKUP.website,
    websiteIsPercent: u?.websiteIsPercent ?? DEFAULT_MARKUP.websiteIsPercent,
    monthly: u?.monthly ?? DEFAULT_MARKUP.monthly,
    increment: u?.increment ?? DEFAULT_MARKUP.increment,
  };
}

/**
 * Who can use the client portal + markup tools: every admin, plus any member
 * with the per-account flag turned on (the pilot today, everyone later). Kept
 * dependency-free so it's safe to import from client components too.
 */
export function canUseClientPortal(user: { role: string; clientPortalEnabled?: boolean }): boolean {
  return user.role === "ADMIN" || user.clientPortalEnabled === true;
}
