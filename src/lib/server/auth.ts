import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, type UserRole } from "@prisma/client";

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
  role: UserRole;
  image: string | null;
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
      user: { select: { id: true, email: true, name: true, role: true, image: true } },
    },
  });
  if (!row) return null;

  if (isExpired(row.expires)) {
    // Sweep it on the way past so dead rows don't accumulate.
    await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
    return null;
  }

  return row.user;
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

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  // Signed in as the wrong role: send them to their own dashboard rather than
  // rendering a dead end.
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
