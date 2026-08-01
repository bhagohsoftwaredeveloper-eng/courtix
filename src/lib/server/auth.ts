import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, type PlatformRole } from "@prisma/client";

import { SESSION_COOKIE, homeFor, isExpired } from "@/lib/auth-routes";
import { db } from "@/lib/server/db";

/**
 * Sessions are opaque rows, not signed tokens: the cookie carries 256 bits of
 * randomness and every other fact lives in the `session` table. That means no
 * signing secret to manage, and revoking a session is deleting a row.
 */
const DAY_SECONDS = 60 * 60 * 24;
const REMEMBER_SECONDS = DAY_SECONDS * 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  image: string | null;
  /**
   * Whether this account hosts courts — it has at least one
   * OrganizationMember row. Derived here rather than stored on User so there
   * is exactly one source of truth, and resolved in the session query that
   * already runs so the portal switcher costs no extra round trip.
   */
  isOwner: boolean;
}

/** Only callable from a server action — Next forbids setting cookies while
 *  rendering. */
export async function createSession(userId: string, remember: boolean): Promise<void> {
  const maxAge = remember ? REMEMBER_SECONDS : DAY_SECONDS;
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + maxAge * 1000);

  await db.session.create({ data: { sessionToken, userId, expires } });

  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    // Never hardcode true: a secure cookie is dropped on http://localhost.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await db.session.findUnique({
    where: { sessionToken: token },
    select: {
      expires: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          image: true,
          // A count, not the rows: nothing here needs which organizations, only
          // whether there are any.
          _count: { select: { memberships: true } },
        },
      },
    },
  });
  if (!row) return null;

  if (isExpired(row.expires)) {
    // Sweep it on the way past so dead rows don't accumulate.
    await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
    return null;
  }

  const { _count, ...user } = row.user;
  return { ...user, isOwner: _count.memberships > 0 };
}

// Prisma's "record to delete does not exist" error — the only failure mode
// where the row being gone already satisfies the caller's intent.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.session.delete({ where: { sessionToken: token } });
    } catch (error) {
      // Already-deleted rows are fine — the token stops working either way.
      // Anything else (connection loss, timeout, ...) may mean the row is
      // still live, so it must surface instead of reporting a false sign-out.
      if (!isRecordNotFound(error)) throw error;
    }
  }
  jar.delete(SESSION_COOKIE);
}

/** The real gate. Middleware only checks that a cookie exists; this checks that
 *  it names a live session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Gate for /admin — platform staff only. */
export async function requirePlatformRole(...roles: PlatformRole[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  // Signed in as the wrong role: send them to their own dashboard rather than
  // rendering a dead end.
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/**
 * Gate for /owner. Returns the organization alongside the user, because every
 * owner page needs it and the layout was querying for it separately anyway.
 *
 * A signed-in non-owner goes to /list-your-court rather than /account: that
 * page tells them how to become a host, which is what they were reaching for.
 */
export async function requireOwner(): Promise<{
  user: SessionUser;
  org: { id: string; name: string };
}> {
  const user = await getSession();
  if (!user) redirect("/login");

  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    // An owner can belong to several orgs; order so the sidebar name is stable
    // between requests. Choosing among them properly is a later-phase concern.
    orderBy: { orgId: "asc" },
    select: { org: { select: { id: true, name: true } } },
  });
  if (!membership) redirect("/list-your-court");

  return { user, org: membership.org };
}
