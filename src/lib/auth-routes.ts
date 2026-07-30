/**
 * Auth helpers with no Next.js, Prisma or React imports.
 *
 * Middleware runs on the Edge runtime and the unit tests run in plain Node, so
 * anything both of those need has to live here rather than in
 * `src/lib/server/auth.ts`.
 */
import type { PlatformRole } from "@prisma/client";

/** Holds the opaque session token. Read by middleware and by getSession(). */
export const SESSION_COOKIE = "courtix_session";

/** Where a role lands after logging in, and where it gets sent when it opens
 *  someone else's dashboard. */
export function homeFor(role: PlatformRole): string {
  // Owners are not a case here. Every account is a player, so an owner lands on
  // /account and switches portals from the sidebar. That keeps this function
  // pure — deciding it here would need a membership lookup, and middleware
  // cannot reach the database.
  return role === "PLAYER" ? "/account" : "/admin";
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
  // Browsers strip tab, CR and LF before parsing a URL, so "/\t/evil.com"
  // resolves to "//evil.com". Judge the string the browser will actually see.
  const cleaned = next.replace(/[\t\r\n]/g, "");
  if (!cleaned.startsWith("/")) return null;
  if (cleaned.startsWith("//") || cleaned.startsWith("/\\")) return null;
  return cleaned;
}

/** A session is over the moment its expiry is reached. */
export function isExpired(expires: Date, now: Date = new Date()): boolean {
  return expires.getTime() <= now.getTime();
}
