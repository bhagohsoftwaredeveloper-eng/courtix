# Courtix Auth & Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Courtix a working email/password login with database-backed sessions, so `/player-home`, `/owner` and `/admin` are reachable only by the right role.

**Architecture:** Opaque session tokens stored in the `session` table the Prisma schema already carries; the cookie holds 32 random bytes and nothing else. Middleware does a cheap cookie-presence redirect on the Edge runtime; the real authorization check is `requireRole()` running on the Node runtime inside each protected layout, against MySQL. Pure helpers (`homeFor`, `safeNext`, `isExpired`) and password hashing live in modules with no Next.js imports so they can be unit-tested in plain Node.

**Tech Stack:** Next.js 15 (App Router, React 19 server actions), Prisma 6 + MySQL, bcryptjs, zod 3, vitest.

**Spec:** [`docs/superpowers/specs/2026-07-25-auth-and-login-design.md`](../specs/2026-07-25-auth-and-login-design.md)

## Global Constraints

- Working directory is `d:\Courtix`. Shell is PowerShell; `&&` is not available — chain with `;` or separate calls.
- Money stays integer centavos, rates stay basis points. This phase touches neither.
- Never log a password, a password hash, or a session token.
- The three credential failures (unknown email, wrong password, null `passwordHash`) must all return the identical string `"Email or password is incorrect"`.
- `secure` on the session cookie is `process.env.NODE_ENV === "production"` — never hardcoded `true`, or login breaks on `http://localhost`.
- Seeded accounts are created only when `process.env.NODE_ENV !== "production"`.
- The session cookie name is `courtix_session`, defined once in `src/lib/auth-routes.ts` and imported everywhere else.
- `cookies()` is async in Next 15 — always `await cookies()`.
- `redirect()` throws to unwind; never call it inside a `try` block.
- Match the surrounding code style: comments explain *why*, not *what*; existing Tailwind class conventions (`btn btn-solid`, `panel`, `field`, `text-muted`, `text-ball-yellow`) are reused rather than replaced.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/auth-routes.ts` | Pure, dependency-free: `SESSION_COOKIE`, `homeFor`, `safeNext`, `isExpired`. Imported by middleware (Edge), server code, and tests. |
| `src/lib/server/db.ts` | `PrismaClient` singleton surviving dev hot-reload. |
| `src/lib/server/password.ts` | `hashPassword`, `verifyPassword`. bcryptjs only — no Next imports, so vitest can load it. |
| `src/lib/server/auth.ts` | Session lifecycle against the DB and the cookie jar: `createSession`, `getSession`, `destroySession`, `requireUser`, `requireRole`. |
| `src/lib/server/player.ts` | `getCurrentPlayer()`, now a session-backed DB query (moved from `src/lib/data/player.ts`). |
| `src/app/(site)/login/actions.ts` | `loginAction`, `logoutAction` server actions. |
| `src/app/(site)/login/LoginForm.tsx` | Client form with inline error via `useActionState`. |
| `src/middleware.ts` | Cookie-presence redirect for `/owner`, `/admin`, `/player-home`. |
| `vitest.config.ts` | Node environment, `@` alias. |
| `tests/auth-routes.test.ts` | Unit tests for the pure helpers. |
| `tests/password.test.ts` | Unit tests for hashing. |

**Modified**

| File | Change |
|---|---|
| `prisma/schema.prisma` | `User.passwordHash String?` |
| `prisma/seed.ts` | Password hashes; owner and admin accounts; `OrganizationMember` link |
| `src/app/(site)/login/page.tsx` | Real server component wrapping `LoginForm` |
| `src/app/(site)/layout.tsx` | Becomes async, reads the session, passes it to `SiteNav` |
| `src/components/SiteNav.tsx` | Accepts `user`; "Sign in" points at `/login` instead of `/player-home` |
| `src/components/dashboard/DashSidebar.tsx` | Accepts `user`; sign-out button |
| `src/app/owner/layout.tsx` | `requireRole("OWNER")`; real org name |
| `src/app/admin/layout.tsx` | `requireRole("ADMIN", "SUPER_ADMIN")` |
| `src/app/(site)/player-home/page.tsx` | `await getCurrentPlayer()` from the new module |
| `src/app/(site)/open-plays/[id]/page.tsx` | `await getCurrentPlayer()`, null-safe prefill |
| `package.json` | `bcryptjs`, `vitest`; `test` script; lint covers `tests` |

**Deleted**

| File | Why |
|---|---|
| `src/lib/data/player.ts` | Replaced by `src/lib/server/player.ts` — it is a database query now, not static data |

---

## Task 1: Version control baseline

`d:\Courtix` is not a git repository, so none of the commit steps below can run until it is one. `.gitignore` already excludes `node_modules`, `.next`, `.env*` (keeping `.env.example`) and `/data/*.json`.

**Files:**
- Modify: none (repository metadata only)

**Interfaces:**
- Consumes: nothing
- Produces: a git repository on branch `main` with a baseline commit, so every later task can commit

- [ ] **Step 1: Confirm the repository is absent**

Run: `git -C d:/Courtix rev-parse --is-inside-work-tree`
Expected: `fatal: not a git repository (or any of the parent directories): .git`

If it prints `true` instead, the repo already exists — skip to Step 4.

- [ ] **Step 2: Initialise the repository**

```bash
git -C d:/Courtix init -b main
```

- [ ] **Step 3: Verify .env is ignored before anything is staged**

Run: `git -C d:/Courtix check-ignore -v .env`
Expected: `.gitignore:10:.env*	.env`

If this prints nothing, STOP — `.env` holds the database password and must not be committed. Fix `.gitignore` first.

- [ ] **Step 4: Create the baseline commit**

```bash
git -C d:/Courtix add -A
git -C d:/Courtix commit -m "chore: baseline commit of the Courtix app

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verify the working tree is clean and .env is untracked**

Run: `git -C d:/Courtix status --short; git -C d:/Courtix ls-files .env`
Expected: no output from either — a clean tree, and `.env` not tracked.

---

## Task 2: Pure auth helpers, with vitest

The routing and validation logic that both the Edge middleware and the Node server need. It has no Next.js or Prisma runtime imports, which is what makes it testable and what lets middleware import it.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/auth-routes.ts`
- Test: `tests/auth-routes.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SESSION_COOKIE: "courtix_session"`
  - `homeFor(role: UserRole): string`
  - `safeNext(next: string | null | undefined): string | null`
  - `isExpired(expires: Date, now?: Date): boolean`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest --no-audit --no-fund
```

- [ ] **Step 2: Add the vitest config**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the "@/*" -> "./src/*" mapping in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 3: Add the test script and widen lint**

In `package.json`, inside `"scripts"`, change the `lint` line and add `test`:

```json
    "lint": "eslint src scripts prisma tests",
    "test": "vitest run",
```

- [ ] **Step 4: Write the failing test**

Create `tests/auth-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { SESSION_COOKIE, homeFor, isExpired, safeNext } from "@/lib/auth-routes";

describe("SESSION_COOKIE", () => {
  it("is the name middleware and the server both look for", () => {
    expect(SESSION_COOKIE).toBe("courtix_session");
  });
});

describe("homeFor", () => {
  it("sends each role to its own dashboard", () => {
    expect(homeFor("PLAYER")).toBe("/player-home");
    expect(homeFor("OWNER")).toBe("/owner");
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
  });
});

describe("safeNext", () => {
  it("keeps a same-origin path", () => {
    expect(safeNext("/owner")).toBe("/owner");
    expect(safeNext("/owner/bookings?date=2026-07-25")).toBe("/owner/bookings?date=2026-07-25");
  });

  it("rejects anything that could leave the site", () => {
    // "//evil.com" is protocol-relative: the browser treats it as absolute.
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext("owner")).toBeNull();
  });

  it("treats absent input as no destination", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
  });
});

describe("isExpired", () => {
  const now = new Date("2026-07-25T12:00:00Z");

  it("is false while the session still has time", () => {
    expect(isExpired(new Date("2026-07-25T12:00:01Z"), now)).toBe(false);
  });

  it("is true once the expiry has passed", () => {
    expect(isExpired(new Date("2026-07-25T11:59:59Z"), now)).toBe(true);
  });

  it("is true exactly at the expiry instant", () => {
    expect(isExpired(new Date("2026-07-25T12:00:00Z"), now)).toBe(true);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/auth-routes"`.

- [ ] **Step 6: Write the implementation**

Create `src/lib/auth-routes.ts`:

```ts
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 8 tests across 4 suites.

- [ ] **Step 8: Verify lint and types are clean**

Run: `npm run lint; npm run typecheck`
Expected: no output from either.

- [ ] **Step 9: Commit**

```bash
git -C d:/Courtix add package.json package-lock.json vitest.config.ts src/lib/auth-routes.ts tests/auth-routes.test.ts
git -C d:/Courtix commit -m "feat(auth): add pure auth route helpers and vitest

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Password hashing

**Files:**
- Create: `src/lib/server/password.ts`
- Test: `tests/password.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean>`

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs --no-audit --no-fund
```

- [ ] **Step 2: Write the failing test**

Create `tests/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/server/password";

describe("hashPassword", () => {
  it("produces a bcrypt hash, never the plaintext", async () => {
    const hash = await hashPassword("demo1234");
    expect(hash).not.toBe("demo1234");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("salts, so the same password hashes differently each time", async () => {
    expect(await hashPassword("demo1234")).not.toBe(await hashPassword("demo1234"));
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    expect(await verifyPassword("demo1234", await hashPassword("demo1234"))).toBe(true);
  });

  it("rejects the wrong password", async () => {
    expect(await verifyPassword("wrong", await hashPassword("demo1234"))).toBe(false);
  });

  // A user with no password set, or a corrupted row, must fail the login —
  // a throw here would 500 the login page instead.
  it("returns false for a null hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", null)).toBe(false);
  });

  it("returns false for an undefined hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", undefined)).toBe(false);
  });

  it("returns false for a malformed hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", "not-a-bcrypt-hash")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/server/password"`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/server/password.ts`:

```ts
/**
 * Password hashing. Deliberately free of Next.js imports so the unit tests can
 * load it directly — `src/lib/server/auth.ts` is the module that touches
 * cookies and the database.
 */
import bcrypt from "bcryptjs";

const ROUNDS = 10;

/**
 * Compared against when the email doesn't exist, so a failed login takes the
 * same time whether or not the account is real. Without it, response timing
 * tells an attacker which addresses are registered.
 */
const DUMMY_HASH = bcrypt.hashSync("courtix-nonexistent-account", ROUNDS);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  } catch {
    // A malformed hash in the database must fail the login, not crash the page.
    return false;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — both test files green.

- [ ] **Step 6: Verify types, adding bcryptjs types only if needed**

Run: `npm run typecheck`

If it passes, continue. If it reports `Could not find a declaration file for module 'bcryptjs'`, the installed version does not bundle types — run `npm install -D @types/bcryptjs --no-audit --no-fund` and run `npm run typecheck` again.

Expected (eventually): no output.

- [ ] **Step 7: Run lint**

Run: `npm run lint`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git -C d:/Courtix add package.json package-lock.json src/lib/server/password.ts tests/password.test.ts
git -C d:/Courtix commit -m "feat(auth): add bcrypt password hashing

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Schema column and Prisma client singleton

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/server/db.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `db` — a shared `PrismaClient`
  - `User.passwordHash` column in MySQL

- [ ] **Step 1: Add the column**

In `prisma/schema.prisma`, in `model User`, add `passwordHash` immediately after the `image` line:

```prisma
  image         String?
  // Nullable: OAuth accounts and pre-auth seed rows have no password.
  passwordHash  String?
  role          UserRole  @default(PLAYER)
```

- [ ] **Step 2: Push the schema and regenerate the client**

```bash
npm run db:push
npx prisma generate
```

Expected: `Your database is now in sync with your Prisma schema.` then `✔ Generated Prisma Client`.

- [ ] **Step 3: Verify the column exists in MySQL**

Create `prisma/_check.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = await db.$queryRawUnsafe(
  "SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='courtix' AND TABLE_NAME='user' AND COLUMN_NAME='passwordHash'",
);
console.log(JSON.stringify(rows));
await db.$disconnect();
```

Run: `node prisma/_check.mjs`
Expected: `[{"COLUMN_NAME":"passwordHash","IS_NULLABLE":"YES"}]`

Then delete it: `Remove-Item d:/Courtix/prisma/_check.mjs`

- [ ] **Step 4: Write the Prisma singleton**

Create `src/lib/server/db.ts`:

```ts
import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Next's dev server re-evaluates modules on every hot reload. Without stashing
 * the client on globalThis, each reload opens another connection pool until
 * MySQL starts refusing connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 6: Commit**

```bash
git -C d:/Courtix add prisma/schema.prisma src/lib/server/db.ts
git -C d:/Courtix commit -m "feat(auth): add User.passwordHash and a Prisma client singleton

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Session lifecycle

**Files:**
- Create: `src/lib/server/auth.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/server/db`; `SESSION_COOKIE`, `homeFor`, `isExpired` from `@/lib/auth-routes`
- Produces:
  - `interface SessionUser { id: string; email: string; name: string; role: UserRole; image: string | null }`
  - `createSession(userId: string, remember: boolean): Promise<void>`
  - `getSession(): Promise<SessionUser | null>`
  - `destroySession(): Promise<void>`
  - `requireUser(): Promise<SessionUser>`
  - `requireRole(...roles: UserRole[]): Promise<SessionUser>`

There is no unit test for this task: every function reads or writes the Next cookie jar, which only exists inside a request. It is covered by the manual flow checks in Task 12.

- [ ] **Step 1: Write the implementation**

Create `src/lib/server/auth.ts`:

```ts
import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

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
      // Any other failure may mean the row is still live, so it must surface
      // instead of reporting a false sign-out.
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
```

- [ ] **Step 2: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 3: Commit**

```bash
git -C d:/Courtix add src/lib/server/auth.ts
git -C d:/Courtix commit -m "feat(auth): add database-backed session lifecycle

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Seeded accounts

**Files:**
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `hashPassword` from `@/lib/server/password`
- Produces: three login-capable accounts in MySQL

- [ ] **Step 1: Add the import**

In `prisma/seed.ts`, add to the import block, keeping alphabetical order within the `@/` group:

```ts
import { hashPassword } from "@/lib/server/password";
```

- [ ] **Step 2: Give the demo player a password**

In `prisma/seed.ts`, find the `db.user.upsert` inside the "demo player" section and replace it with:

```ts
  // Read the existing hash first: the upsert must only fill a missing one, so
  // that a password changed since the last seed survives a re-seed.
  const existing = await db.user.findUnique({
    where: { email: demo.email },
    select: { passwordHash: true },
  });

  const user = await db.user.upsert({
    where: { email: demo.email },
    create: {
      email: demo.email,
      name: demo.name,
      phone: demo.phone,
      role: "PLAYER",
      passwordHash: await demoPassword(),
    },
    update: {
      name: demo.name,
      phone: demo.phone,
      passwordHash: existing?.passwordHash ?? (await demoPassword()),
    },
  });
```

- [ ] **Step 3: Add the demo-password helper and the two staff accounts**

In `prisma/seed.ts`, add this helper next to the other helpers near the top of the file (after `monthYear`):

```ts
/**
 * Seeded accounts exist so the three dashboards can be opened locally. They are
 * skipped entirely in production — a published password on a live platform is
 * a back door, not a convenience.
 */
const DEMO_PASSWORD = "demo1234";
const isProduction = process.env.NODE_ENV === "production";

let demoHash: string | null = null;
async function demoPassword(): Promise<string | null> {
  if (isProduction) return null;
  demoHash ??= await hashPassword(DEMO_PASSWORD);
  return demoHash;
}
```

Then, immediately after the `savedCourt` loop at the end of `main()` and before the `console.log`, add:

```ts
  // ------------------------------------------------------------ staff logins
  if (!isProduction) {
    const ownerOrg = await db.organization.findUnique({
      where: { slug: "kitchen-line-club" },
      select: { id: true, name: true },
    });

    const owner = await db.user.upsert({
      where: { email: "owner@kitchenline.ph" },
      create: {
        email: "owner@kitchenline.ph",
        name: "Kitchen Line Club",
        role: "OWNER",
        passwordHash: await demoPassword(),
      },
      update: { role: "OWNER" },
    });

    if (ownerOrg) {
      await db.organizationMember.upsert({
        where: { orgId_userId: { orgId: ownerOrg.id, userId: owner.id } },
        create: { orgId: ownerOrg.id, userId: owner.id, role: "OWNER" },
        update: {},
      });
    }

    await db.user.upsert({
      where: { email: "admin@courtix.ph" },
      create: {
        email: "admin@courtix.ph",
        name: "Courtix Admin",
        role: "SUPER_ADMIN",
        passwordHash: await demoPassword(),
      },
      update: { role: "SUPER_ADMIN" },
    });
  }
```

- [ ] **Step 4: Add the accounts to the summary log**

In `prisma/seed.ts`, in the `console.log` array at the end of `main()`, replace the line `"  1 demo player + profile",` with:

```ts
      "  1 demo player + profile",
      isProduction ? "  staff logins skipped (production)" : "  3 login accounts (password: demo1234)",
```

- [ ] **Step 5: Run the seed**

Run: `npm run db:seed`
Expected: the usual summary, now ending with `3 login accounts (password: demo1234)`.

- [ ] **Step 6: Verify the three accounts have hashes**

Create `prisma/_check.mjs`:

```js
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({
  where: { email: { in: ["jomar.r@example.ph", "owner@kitchenline.ph", "admin@courtix.ph"] } },
  select: { email: true, role: true, passwordHash: true },
});
console.log(users.map((u) => `${u.email} ${u.role} hashed=${Boolean(u.passwordHash)}`).join("\n"));
const members = await db.organizationMember.count();
console.log("organizationMember rows:", members);
await db.$disconnect();
```

Run: `node prisma/_check.mjs`
Expected:
```
admin@courtix.ph SUPER_ADMIN hashed=true
jomar.r@example.ph PLAYER hashed=true
owner@kitchenline.ph OWNER hashed=true
organizationMember rows: 1
```

Then delete it: `Remove-Item d:/Courtix/prisma/_check.mjs`

- [ ] **Step 7: Re-run the seed to confirm it stays idempotent**

Run: `npm run db:seed`
Expected: identical summary, exit code 0, no unique-constraint errors.

- [ ] **Step 8: Verify lint and types**

Run: `npm run lint; npm run typecheck`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git -C d:/Courtix add prisma/seed.ts
git -C d:/Courtix commit -m "feat(auth): seed player, owner and admin login accounts

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Login server actions

**Files:**
- Create: `src/app/(site)/login/actions.ts`

**Interfaces:**
- Consumes: `db`, `verifyPassword`, `createSession`, `destroySession`, `homeFor`, `safeNext`
- Produces:
  - `interface LoginState { error?: string; email?: string }`
  - `loginAction(prev: LoginState, formData: FormData): Promise<LoginState>`
  - `logoutAction(): Promise<void>`

- [ ] **Step 1: Write the implementation**

Create `src/app/(site)/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { homeFor, safeNext } from "@/lib/auth-routes";
import { createSession, destroySession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";

const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
  next: z.string().optional(),
});

export interface LoginState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear what was typed. */
  email?: string;
}

/**
 * One message for every credential failure. Distinguishing "no such account"
 * from "wrong password" tells an attacker which emails are registered.
 */
const GENERIC_FAILURE = "Email or password is incorrect";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const typedEmail = String(formData.get("email") ?? "");

  const parsed = LoginInput.safeParse({
    email: typedEmail,
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email: typedEmail };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true },
  });

  // Runs even when the user is missing — verifyPassword falls back to a dummy
  // hash so a failed login costs the same time either way.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !ok) return { error: GENERIC_FAILURE, email: typedEmail };

  await createSession(user.id, parsed.data.remember);

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect(safeNext(parsed.data.next) ?? homeFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
```

- [ ] **Step 2: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 3: Commit**

```bash
git -C d:/Courtix add "src/app/(site)/login/actions.ts"
git -C d:/Courtix commit -m "feat(auth): add login and logout server actions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Login page and form

**Files:**
- Create: `src/app/(site)/login/LoginForm.tsx`
- Modify: `src/app/(site)/login/page.tsx`

**Interfaces:**
- Consumes: `loginAction`, `LoginState`, `getSession`, `homeFor`, `safeNext`
- Produces: `<LoginForm next?: string />`

- [ ] **Step 1: Write the client form**

Create `src/app/(site)/login/LoginForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/(site)/login/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="panel">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p
          // Announced to screen readers the moment the action returns.
          role="alert"
          className="mb-4 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] font-semibold text-[#ff9370]"
        >
          {state.error}
        </p>
      )}

      <label className="mb-4 block">
        <span className="field-label">Email</span>
        <input
          type="email"
          name="email"
          required
          defaultValue={state.email}
          className="field"
          placeholder="you@example.ph"
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <input
          type="password"
          name="password"
          required
          className="field"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            name="remember"
            className="h-3.5 w-3.5 accent-[var(--color-ball-yellow)]"
          />
          Keep me signed in
        </label>
        <Link href="/waitlist" className="text-[12.5px] font-bold text-ball-yellow">
          Need an account?
        </Link>
      </div>

      <button type="submit" disabled={pending} className="btn btn-solid mt-6 w-full py-3.5 text-sm disabled:opacity-60">
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Rewrite the page**

Replace the whole of `src/app/(site)/login/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(site)/login/LoginForm";
import { homeFor, safeNext } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Courtix account to manage bookings, courts, and payouts.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  // Already signed in: don't make them log in twice.
  const user = await getSession();
  if (user) redirect(destination ?? homeFor(user.role));

  return (
    <div className="shell flex max-w-[440px] flex-col py-20">
      <p className="eyebrow mb-4">Welcome back</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Log in</h1>
      <p className="mb-8 text-[14px] text-muted">
        Manage your bookings, courts, and payouts in one place.
      </p>

      <LoginForm next={destination ?? undefined} />

      <p className="mt-6 text-center text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/waitlist" className="font-bold text-ball-yellow">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
```

Note what left: the panel of direct links to `/player-home`, `/owner` and `/admin`. Those are what auth replaces.

- [ ] **Step 3: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 4: Commit**

```bash
git -C d:/Courtix add "src/app/(site)/login"
git -C d:/Courtix commit -m "feat(auth): wire the login page to the login action

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Middleware

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE` from `@/lib/auth-routes`
- Produces: redirect-to-login behaviour on `/owner/*`, `/admin/*`, `/player-home`

- [ ] **Step 1: Write the middleware**

Create `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-routes";

/**
 * A cheap gate, not the security control.
 *
 * Middleware runs on the Edge runtime, where Prisma cannot reach MySQL — so
 * this only checks that a session cookie is present. Anyone can forge that
 * cookie; requireRole() in each protected layout does the real check against
 * the database and rejects them there.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/owner/:path*", "/admin/:path*", "/player-home"],
};
```

- [ ] **Step 2: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 3: Commit**

```bash
git -C d:/Courtix add src/middleware.ts
git -C d:/Courtix commit -m "feat(auth): redirect signed-out visitors away from dashboards

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Dashboard gates and sign-out

**Files:**
- Modify: `src/components/dashboard/DashSidebar.tsx`
- Modify: `src/app/owner/layout.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `requireRole`, `SessionUser`, `logoutAction`, `db`
- Produces: `<DashSidebar role={string} items={NavItem[]} user={{ name: string; email: string }} />`

- [ ] **Step 1: Add the user prop and sign-out to the sidebar**

In `src/components/dashboard/DashSidebar.tsx`, add the import below the existing ones:

```tsx
import { logoutAction } from "@/app/(site)/login/actions";
```

Change the component signature to accept the user:

```tsx
export function DashSidebar({
  role,
  items,
  user,
}: {
  role: string;
  items: NavItem[];
  user: { name: string; email: string };
}) {
```

Add this above the `return (` — it is used in both the mobile sheet and the desktop rail:

```tsx
  const account = (
    <div className="border-t border-line-white/8 pt-3">
      <p className="truncate px-3 text-[12.5px] font-semibold text-line-white">{user.name}</p>
      <p className="mb-2 truncate px-3 text-[11px] text-muted">{user.email}</p>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-[10px] px-3 py-2 text-left text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
        >
          Sign out
        </button>
      </form>
    </div>
  );
```

In the mobile sheet, replace the `← Back to site` link with:

```tsx
          <Link href="/" className="mt-3 mb-3 block text-[12.5px] font-bold text-ball-yellow">
            ← Back to site
          </Link>
          {account}
```

In the desktop rail, replace the trailing `← Back to site` link with:

```tsx
        <div className="mt-auto">
          <Link
            href="/"
            className="block px-3 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
          >
            ← Back to site
          </Link>
          {account}
        </div>
```

- [ ] **Step 2: Gate the owner layout**

Replace the `OwnerLayout` function in `src/app/owner/layout.tsx` with:

```tsx
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("OWNER");

  // The sidebar names the facility this owner actually manages.
  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    select: { org: { select: { name: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role={`Owner · ${membership?.org.name ?? "No facility yet"}`}
        items={NAV}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
```

And add these imports at the top of that file:

```tsx
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
```

- [ ] **Step 3: Gate the admin layout**

Replace the `AdminLayout` function in `src/app/admin/layout.tsx` with:

```tsx
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Super Admin · Platform"
        items={NAV}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
```

And add this import at the top of that file:

```tsx
import { requireRole } from "@/lib/server/auth";
```

- [ ] **Step 4: Verify lint, types and tests**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, tests pass.

- [ ] **Step 5: Commit**

```bash
git -C d:/Courtix add src/components/dashboard/DashSidebar.tsx src/app/owner/layout.tsx src/app/admin/layout.tsx
git -C d:/Courtix commit -m "feat(auth): gate the owner and admin dashboards by role

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Session-aware site nav and player identity

`getCurrentPlayer()` stops being static data and becomes a database query, so it moves out of `src/lib/data/` into `src/lib/server/`.

**Files:**
- Create: `src/lib/server/player.ts`
- Delete: `src/lib/data/player.ts`
- Modify: `src/app/(site)/layout.tsx`
- Modify: `src/components/SiteNav.tsx`
- Modify: `src/app/(site)/player-home/page.tsx`
- Modify: `src/app/(site)/open-plays/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSession`, `db`, `homeFor`, the `Player` type from `@/lib/types`
- Produces: `getCurrentPlayer(): Promise<Player | null>`

- [ ] **Step 1: Write the session-backed player query**

Create `src/lib/server/player.ts`:

```ts
import "server-only";

import type { Player, SportSlug } from "@/lib/types";
import { getSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const SKILL_LABEL = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-03-01 -> "Mar 2026", the format the profile strip renders. */
function monthYearLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * The signed-in player, assembled from the session plus their profile row.
 * Returns null when nobody is signed in — /open-plays/[id] is public and just
 * skips prefilling the join form.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      phone: true,
      playerProfile: {
        select: {
          skill: true,
          rating: true,
          memberSince: true,
          homeCity: { select: { name: true } },
          favourites: { select: { sportId: true } },
        },
      },
    },
  });
  const profile = user?.playerProfile;

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    phone: user?.phone ?? "",
    city: profile?.homeCity?.name ?? "",
    skill: SKILL_LABEL[profile?.skill ?? "BEGINNER"],
    rating: profile?.rating ? Number(profile.rating) : 0,
    favouriteSports: (profile?.favourites.map((f) => f.sportId) ?? []) as SportSlug[],
    // Saved courts key on facility cuids while the static COURTS catalog keys
    // on integers, so the two can't be joined yet. Phase 2 unifies the ids and
    // this comes back.
    savedCourtIds: [],
    memberSince: profile ? monthYearLabel(profile.memberSince) : "",
  };
}
```

- [ ] **Step 2: Delete the static player module**

```bash
Remove-Item d:/Courtix/src/lib/data/player.ts
```

- [ ] **Step 3: Pass the session into the site nav**

Replace the whole of `src/app/(site)/layout.tsx` with:

```tsx
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { homeFor } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

// Reading the session cookie opts these pages out of static rendering. Phase 2
// makes them database-driven anyway.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <>
      <SiteNav
        account={user ? { name: user.name, href: homeFor(user.role) } : null}
      />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 4: Render the account in the nav**

In `src/components/SiteNav.tsx`, change the signature:

```tsx
export function SiteNav({ account }: { account: { name: string; href: string } | null }) {
```

Replace the desktop "Sign in" link — which currently points at `/player-home` — with:

```tsx
          {account ? (
            <Link href={account.href} className="btn btn-ghost hidden sm:inline-flex">
              {account.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
              Sign in
            </Link>
          )}
```

And replace the mobile "Sign in" link with:

```tsx
            <Link
              href={account ? account.href : "/login"}
              className="rounded-lg px-3 py-3 text-[15px] font-semibold text-muted hover:bg-card hover:text-line-white sm:hidden"
            >
              {account ? account.name.split(" ")[0] : "Sign in"}
            </Link>
```

- [ ] **Step 5: Update player-home**

In `src/app/(site)/player-home/page.tsx`:

Change the import line

```tsx
import { getCurrentPlayer } from "@/lib/data/player";
```

to

```tsx
import { getCurrentPlayer } from "@/lib/server/player";
```

and add `import { redirect } from "next/navigation";` to the import block.

Then change

```tsx
  const player = getCurrentPlayer();
```

to

```tsx
  const player = await getCurrentPlayer();
  // Middleware already bounced signed-out visitors; this narrows the type and
  // covers a cookie that named a dead session.
  if (!player) redirect("/login?next=/player-home");
```

- [ ] **Step 6: Update the open-play detail page**

In `src/app/(site)/open-plays/[id]/page.tsx`:

Change the import line

```tsx
import { getCurrentPlayer } from "@/lib/data/player";
```

to

```tsx
import { getCurrentPlayer } from "@/lib/server/player";
```

Change

```tsx
  const player = getCurrentPlayer();
```

to

```tsx
  // Public page: a signed-out visitor just gets an empty form.
  const player = await getCurrentPlayer();
```

And change the `defaults` prop to:

```tsx
            defaults={{
              name: player?.name ?? "",
              email: player?.email ?? "",
              phone: player?.phone ?? "",
            }}
```

- [ ] **Step 7: Verify nothing still imports the deleted module**

Run: `npm run typecheck`
Expected: no output. A `Cannot find module '@/lib/data/player'` error means an import was missed — fix it and re-run.

- [ ] **Step 8: Verify lint and tests**

Run: `npm run lint; npm test`
Expected: lint silent, tests pass.

- [ ] **Step 9: Commit**

```bash
git -C d:/Courtix add src/lib/server/player.ts src/lib/data/player.ts "src/app/(site)/layout.tsx" src/components/SiteNav.tsx "src/app/(site)/player-home/page.tsx" "src/app/(site)/open-plays"
git -C d:/Courtix commit -m "feat(auth): read the signed-in player from the session

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: End-to-end verification

Everything above is unit-tested or type-checked; these flows span middleware, cookies and layouts, so they are checked against the running app.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-25-auth-and-login-design.md` (tick the done list)

**Interfaces:**
- Consumes: the whole phase
- Produces: a verified phase 1

- [ ] **Step 1: Build, to catch anything only the production compiler sees**

Run: `npm run build`
Expected: `✓ Compiled successfully`, and the route list includes `ƒ Middleware`.

- [ ] **Step 2: Start the dev server**

Run in the background: `npm run dev`
Wait for `✓ Ready`.

- [ ] **Step 3: Check the signed-out redirect**

Visit `http://localhost:3000/admin`.
Expected: redirected to `http://localhost:3000/login?next=%2Fadmin`.

- [ ] **Step 4: Check the admin login and the next-param round trip**

On that page, log in as `admin@courtix.ph` / `demo1234`.
Expected: lands on `/admin`, sidebar footer shows "Courtix Admin" and `admin@courtix.ph`.

- [ ] **Step 5: Check role separation**

Visit `http://localhost:3000/owner` while still signed in as the admin.
Expected: redirected to `/admin` — the admin's own home, not a 403.

- [ ] **Step 6: Check sign-out**

Click "Sign out" in the sidebar.
Expected: lands on `/`, the nav shows "Sign in", and visiting `/admin` again redirects to `/login?next=%2Fadmin`.

- [ ] **Step 7: Check the owner**

Log in at `/login` as `owner@kitchenline.ph` / `demo1234`.
Expected: lands on `/owner`; the sidebar reads `Owner · Kitchen Line Club`.

- [ ] **Step 8: Check the player**

Sign out, then log in as `jomar.r@example.ph` / `demo1234`.
Expected: lands on `/player-home`; the greeting reads "Jomar"; the rating tile shows `3.5`, "Intermediate · DUPR"; "You play" shows `Pickleball · Badminton`; "Member since" shows `Mar 2026` and `Tagum City`. Suggested courts falls back to top-rated (the known saved-courts gap).

- [ ] **Step 9: Check the player can't reach the dashboards**

Visit `http://localhost:3000/owner`, then `http://localhost:3000/admin`.
Expected: both redirect to `/player-home`.

- [ ] **Step 10: Check a wrong password**

Sign out, then submit `jomar.r@example.ph` with password `wrong`.
Expected: stays on `/login`, shows `Email or password is incorrect`, the email field still holds the typed address, and no cookie is set.

- [ ] **Step 11: Check an unknown email gives the identical message**

Submit `nobody@example.ph` / `whatever`.
Expected: the exact same `Email or password is incorrect`.

- [ ] **Step 12: Check the open-redirect guard**

Visit `http://localhost:3000/login?next=//evil.com` and log in as the player.
Expected: lands on `/player-home`, never on `evil.com`.

- [ ] **Step 13: Stop the dev server and run the full check**

Run: `npm run lint; npm run typecheck; npm test`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 14: Tick the spec's definition of done**

In `docs/superpowers/specs/2026-07-25-auth-and-login-design.md`, change every `- [ ]` in sections 7 and 9 to `- [x]`.

- [ ] **Step 15: Commit**

```bash
git -C d:/Courtix add docs/superpowers/specs/2026-07-25-auth-and-login-design.md
git -C d:/Courtix commit -m "docs: mark phase 1 auth verified

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage.** Session mechanism → Tasks 4, 5. Authorization split between middleware and layouts → Tasks 9, 10. All five new modules from spec § 3 → Tasks 2, 3, 4, 5, 7, 8, 9, 11. Seeded accounts with the production guard → Task 6. Error handling table → Tasks 3, 7 (generic message, dummy-hash timing, null-hash safety), 12 (checked in the browser). Testing table → Tasks 2, 3; manual flows → Task 12. The known saved-courts gap is implemented in Task 11 and confirmed in Task 12 Step 8.

**Deviation from the spec, deliberate.** Spec § 3 puts `hashPassword`/`verifyPassword` and the pure helpers inside `src/lib/server/auth.ts`. They are split into `src/lib/auth-routes.ts` and `src/lib/server/password.ts` instead, because `auth.ts` imports `next/headers` and `server-only`, which cannot load in vitest or on the Edge runtime — middleware needs `SESSION_COOKIE` and the tests need both. Same behaviour, testable boundaries.

**Type consistency.** `SessionUser` (Task 5) is what `requireRole` returns and what Task 10 destructures for `user={{ name, email }}`. `LoginState` (Task 7) is the state type in Task 8's `useActionState`. `getCurrentPlayer(): Promise<Player | null>` (Task 11) matches both call sites updated in that same task. `SESSION_COOKIE` is defined once in Task 2 and imported by Tasks 5 and 9.
