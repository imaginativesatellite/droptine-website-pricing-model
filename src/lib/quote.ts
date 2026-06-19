import type { Quote } from "@prisma/client";

/** Base URL of the deployed app, for building shareable proposal links. */
export function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    process.env.APP_URL?.replace(/\/$/, "") ??
    "https://dwpm.luna-creative.com"
  );
}

export function proposalUrl(code: string): string {
  return `${appUrl()}/proposal/${code}`;
}

type PriceParts = Pick<Quote, "computedTotal" | "overrideTotal" | "discount">;

/** The total before discount (admin override wins over the computed total). */
export function subtotal(q: PriceParts): number {
  return q.overrideTotal ?? q.computedTotal;
}

/** The final price the client pays: (override ?? computed) − discount, floored at 0. */
export function finalPrice(q: PriceParts): number {
  return Math.max(0, subtotal(q) - (q.discount ?? 0));
}

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Proposals are valid for 60 days from validFrom (reset on admin reactivation). */
export const VALID_DAYS = 60;

export function expiresAt(q: { validFrom: Date }): Date {
  return new Date(q.validFrom.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000);
}

export function isExpired(q: { validFrom: Date }): boolean {
  return expiresAt(q).getTime() < Date.now();
}
