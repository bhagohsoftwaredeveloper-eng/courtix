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

/** One entry in the sidebar's "Switch portal" section. Structurally identical
 *  to DashSidebar's NavItem, declared here because this file must not import
 *  React. */
export interface Portal {
  href: string;
  label: string;
  icon: string;
}

export type PortalId = "player" | "owner" | "admin";

/**
 * Which other portals this user can reach from where they are standing.
 *
 * One rule: offer every portal the user holds, minus the current one. The three
 * conditions are independent — an admin who hosts is offered all three surfaces,
 * because platform staff are ordinary people who may also play and may also own
 * courts.
 *
 * Pure and database-free by design: `isOwner` is resolved once by getSession()
 * and passed in, so the sidebar costs no extra query.
 */
export function portalsFor({
  role,
  isOwner,
  current,
}: {
  role: PlatformRole;
  isOwner: boolean;
  current: PortalId;
}): Portal[] {
  const out: Portal[] = [];

  // Every account is a player, so this portal is always held.
  if (current !== "player") {
    out.push({ href: "/account", label: "Player Dashboard", icon: "☺" });
  }
  if (isOwner && current !== "owner") {
    out.push({ href: "/owner", label: "Owner Dashboard", icon: "◆" });
  }
  if (role !== "PLAYER" && current !== "admin") {
    out.push({ href: "/admin", label: "Admin Dashboard", icon: "⚑" });
  }

  return out;
}
