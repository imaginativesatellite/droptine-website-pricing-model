import { cookies } from "next/headers";

/**
 * Client-facing Presentation Mode is tracked by a single httpOnly cookie. It's a
 * UI lock for an in-person, already-authenticated Droptine session (a client at
 * a trade show shouldn't wander into the internal app), not a security boundary
 * on its own - the route guards in the (app) and /portal layouts enforce it, and
 * leaving requires the exit PIN.
 */
export const PRESENTATION_COOKIE = "presentation_mode";

/** True when the current request is in Presentation Mode. */
export async function isPresentationMode(): Promise<boolean> {
  const store = await cookies();
  return store.get(PRESENTATION_COOKIE)?.value === "1";
}
