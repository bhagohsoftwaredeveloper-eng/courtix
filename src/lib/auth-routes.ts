/**
 * Auth helpers with no Next.js, Prisma or React imports.
 *
 * Middleware runs on the Edge runtime and the unit tests run in plain Node, so
 * anything both of those need has to live here rather than in
 * `src/lib/server/auth.ts`.
 */
import type { UserRole } from "@prisma/client";

/** Holds the opaque session token. Read by middleware and by getSession(). */
export const SESSION_COOKIE = "courtix_session";

/** Where a role lands after logging in, and where it gets sent when it opens
 *  someone else's dashboard. */
export function homeFor(role: UserRole): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    case "PLAYER":
    default:
      return "/player-home";
  }
}

/**
 * Validates the `?next=` destination carried through the login redirect.
 *
 * Only same-origin absolute paths survive. A leading "//" or "/\" is
 * protocol-relative — browsers resolve "//evil.com" to another origin — so
 * without this check the login page would be an open redirect.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** A session is over the moment its expiry is reached. */
export function isExpired(expires: Date, now: Date = new Date()): boolean {
  return expires.getTime() <= now.getTime();
}
