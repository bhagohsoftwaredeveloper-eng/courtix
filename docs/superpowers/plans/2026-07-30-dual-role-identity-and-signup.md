# Dual-role Identity & Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one Courtix account be both a player and a court owner, and add the signup flow the app has never had.

**Architecture:** `UserRole` splits into `PlatformRole` (on `User`) and `OrgRole` (on `OrganizationMember`), making `User.role = OWNER` unrepresentable. Owner-ness becomes a single derived predicate — the user has at least one `OrganizationMember` row — surfaced as `SessionUser.isOwner` from the session query that already runs. A pure `portalsFor()` function decides which portal-switcher links each dashboard shows, so the whole matrix is unit-testable without a database.

**Tech Stack:** Next.js 15 (App Router, server actions), React 19, Prisma 6 + MySQL, Zod 3, bcryptjs, Vitest 4, Tailwind 4.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-30-dual-role-identity-and-signup-design.md`. Read it before starting.
- **Money is integer centavos; rates are basis points.** Not touched by this plan, but do not introduce floats anywhere near them.
- **`src/lib/auth-routes.ts` must never import Next, Prisma, or React.** Middleware runs on the Edge runtime and the unit tests run in plain Node; both load this file. Type-only imports from `@prisma/client` are permitted — the existing file already does `import type { UserRole } from "@prisma/client"`.
- **`src/lib/server/*` files start with `import "server-only";`** except `password.ts` and `auth-routes.ts`, which the tests load directly.
- **No email provider exists.** Do not add one, and do not write to `User.emailVerified` or `VerificationToken`.
- **No facility creation in this plan.** Organization creation grants owner access; the facility form is Phase 2.
- **Tailwind classes must be copied from the neighbouring component** being edited. Do not invent new utility combinations — reuse `panel`, `field`, `field-label`, `btn btn-solid`, `btn btn-ghost`, `eyebrow`.
- **Every commit message ends with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```
- **Run the full suite before every commit:** `npx vitest run`. It is 79 tests across 6 files at the start of this plan and must never be left red.
- **Typecheck before every commit:** `npx tsc --noEmit`. It must print nothing.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `PlatformRole` + `OrgRole` enums replace `UserRole` |
| `prisma/migrations/<ts>_split_platform_and_org_roles/migration.sql` | hand-written four-step data-then-DDL migration |
| `prisma/seed.ts` | staff logins: owner becomes `PLAYER` + membership |
| `src/lib/auth-routes.ts` | `homeFor()`, new `portalsFor()` — pure, no Next/Prisma/React |
| `src/lib/server/auth.ts` | `SessionUser.isOwner`, `requirePlatformRole()`, `requireOwner()` |
| `src/lib/slug.ts` | `slugify()` — pure, used by the organization action |
| `src/components/dashboard/DashSidebar.tsx` | renders the optional `portals` section |
| `src/components/AccountMenu.tsx` | owner link in the site-header dropdown |
| `src/app/account/layout.tsx` | passes `portals` |
| `src/app/owner/layout.tsx` | `requireOwner()`, passes `portals` |
| `src/app/admin/layout.tsx` | `requirePlatformRole()`, passes `portals` |
| `src/app/(site)/signup/{page,SignupForm,actions,schema}.tsx\|ts` | signup |
| `src/app/(site)/list-your-court/start/{page,OrganizationForm,actions,schema}.tsx\|ts` | become a host |
| `tests/auth-routes.test.ts` | `homeFor`, `portalsFor` |
| `tests/signup.test.ts` | signup + organization schema validation |
| `tests/slug.test.ts` | `slugify` |

---

## Task 1: Split the role enums

Schema, migration, seed, and the one pure function whose signature changes with them. `homeFor()` is folded in here because `tests/auth-routes.test.ts` asserts `homeFor("OWNER") === "/owner"` today — leaving that for a later task would end this task with a red suite.

**Files:**
- Modify: `prisma/schema.prisma:31-36` (enum `UserRole`), `:194` (`User.role`), `:318` (`OrganizationMember.role`)
- Create: `prisma/migrations/<timestamp>_split_platform_and_org_roles/migration.sql`
- Modify: `prisma/seed.ts:352-368` (owner upsert)
- Modify: `src/lib/auth-routes.ts:8` (type import), `:15-26` (`homeFor`)
- Test: `tests/auth-routes.test.ts:11-18` (`homeFor` describe block)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PlatformRole` = `"PLAYER" | "ADMIN" | "SUPER_ADMIN"` (Prisma-generated)
  - `OrgRole` = `"OWNER" | "STAFF"` (Prisma-generated)
  - `homeFor(role: PlatformRole): string`

- [ ] **Step 1: Replace the enum in the schema**

In `prisma/schema.prisma`, replace the `UserRole` enum:

```prisma
enum UserRole {
  PLAYER
  OWNER
  ADMIN
  SUPER_ADMIN
}
```

with two enums:

```prisma
// Who this account is on the platform. Owner is deliberately absent: it is a
// capability granted by an OrganizationMember row, not a kind of account. A
// court host who also plays is one PLAYER user with a membership.
enum PlatformRole {
  PLAYER
  ADMIN
  SUPER_ADMIN
}

// What this account is inside one organization.
enum OrgRole {
  OWNER
  STAFF
}
```

- [ ] **Step 2: Point the two columns at the new enums**

In `model User`, change:

```prisma
  role          UserRole  @default(PLAYER)
```

to:

```prisma
  role          PlatformRole @default(PLAYER)
```

In `model OrganizationMember`, change:

```prisma
  role   UserRole @default(OWNER) // OWNER or staff (ADMIN within the org)
```

to:

```prisma
  role   OrgRole  @default(OWNER)
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Create the migration without applying it**

Run: `npx prisma migrate dev --create-only --name split_platform_and_org_roles`
Expected: Prisma reports the migration file was created and does **not** apply it. Note the generated directory name — it is `prisma/migrations/<timestamp>_split_platform_and_org_roles/`.

- [ ] **Step 5: Replace the generated SQL with the four-step migration**

Prisma's generated SQL only alters the columns, which fails on live data: MySQL cannot narrow an enum while rows still hold `'OWNER'`. Overwrite `migration.sql` entirely with this. The data migration must precede every `ALTER`.

```sql
-- Split UserRole into PlatformRole (User) and OrgRole (OrganizationMember).
--
-- Data migration runs FIRST. MySQL rejects narrowing an enum while rows still
-- hold a value the new definition lacks, so every 'OWNER' must leave User.role
-- before the ALTER at the bottom.

-- Step 1: an OWNER user with no membership would silently lose owner access,
-- because after this migration owner-ness is derived from OrganizationMember
-- alone. Give each one an organization. Ids are derived from the user id, which
-- is unique, so the generated ids and slugs cannot collide.
INSERT INTO `Organization` (`id`, `slug`, `name`, `contactEmail`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('org_mig_', u.`id`),
  CONCAT('host-', LOWER(u.`id`)),
  u.`name`,
  u.`email`,
  NOW(3),
  NOW(3)
FROM `User` u
WHERE u.`role` = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM `OrganizationMember` m WHERE m.`userId` = u.`id`);

INSERT INTO `OrganizationMember` (`id`, `orgId`, `userId`, `role`)
SELECT
  CONCAT('om_mig_', u.`id`),
  CONCAT('org_mig_', u.`id`),
  u.`id`,
  'OWNER'
FROM `User` u
WHERE u.`role` = 'OWNER'
  AND NOT EXISTS (SELECT 1 FROM `OrganizationMember` m WHERE m.`userId` = u.`id`);

-- Step 2: every former owner is now a player who happens to host.
UPDATE `User` SET `role` = 'PLAYER' WHERE `role` = 'OWNER';

-- Step 3: the old schema recorded org staff as 'ADMIN'. Anything that is
-- neither OWNER nor STAFF after this ('PLAYER', 'SUPER_ADMIN' — values the app
-- never wrote here) falls back to the column default so no row survives the
-- ALTER holding a value OrgRole lacks.
UPDATE `OrganizationMember` SET `role` = 'STAFF' WHERE `role` = 'ADMIN';
UPDATE `OrganizationMember` SET `role` = 'OWNER' WHERE `role` NOT IN ('OWNER', 'STAFF');

-- Step 4: now the columns can be narrowed.
ALTER TABLE `User`
  MODIFY `role` ENUM('PLAYER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'PLAYER';

ALTER TABLE `OrganizationMember`
  MODIFY `role` ENUM('OWNER', 'STAFF') NOT NULL DEFAULT 'OWNER';
```

- [ ] **Step 6: Apply the migration**

Run: `npx prisma migrate dev`
Expected: the migration applies cleanly and Prisma regenerates the client. If it errors on an unknown column, re-read the `Organization` model — `id`, `slug`, `name`, `contactEmail`, `createdAt`, `updatedAt` are the only non-nullable columns it has.

- [ ] **Step 7: Verify no OWNER survives on User, and every former owner kept a membership**

Run:
```bash
npx prisma db execute --stdin <<'SQL'
SELECT
  (SELECT COUNT(*) FROM `User` WHERE `role` = 'PLAYER')            AS players,
  (SELECT COUNT(*) FROM `OrganizationMember` WHERE `role` = 'OWNER') AS owner_memberships;
SQL
```
Expected: `owner_memberships` is at least 1 (the seeded `owner@kitchenline.ph`), and the command exits 0. A non-zero count of `User.role = 'OWNER'` is now impossible — the enum no longer contains it.

- [ ] **Step 8: Fix the seed's owner block**

`prisma/seed.ts:352-360` sets `role: "OWNER"` on a `User`, which no longer typechecks. Replace:

```ts
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
```

with:

```ts
    // A dual-role account: a player on the platform who also hosts. Owner
    // access comes from the OrganizationMember row below, not from this column.
    const owner = await db.user.upsert({
      where: { email: "owner@kitchenline.ph" },
      create: {
        email: "owner@kitchenline.ph",
        name: "Kitchen Line Club",
        role: "PLAYER",
        passwordHash: await demoPassword(),
      },
      update: { role: "PLAYER" },
    });
```

Leave the `organizationMember.upsert` that follows it unchanged — its `role: "OWNER"` is an `OrgRole` now and stays correct.

- [ ] **Step 9: Update the `homeFor` test to the new role set**

In `tests/auth-routes.test.ts`, replace the `homeFor` describe block:

```ts
describe("homeFor", () => {
  it("sends each role to its own dashboard", () => {
    expect(homeFor("PLAYER")).toBe("/account");
    expect(homeFor("OWNER")).toBe("/owner");
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
  });
});
```

with:

```ts
describe("homeFor", () => {
  it("lands players on the player dashboard", () => {
    expect(homeFor("PLAYER")).toBe("/account");
  });

  it("lands platform staff on the admin dashboard", () => {
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
  });

  // Owners land on /account like every other player. Owner-ness is not a
  // platform role and never changes the landing route — the portal switcher
  // in the sidebar is how they reach /owner.
  it("has no owner destination", () => {
    expect(homeFor("PLAYER")).toBe("/account");
  });
});
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: FAIL. `homeFor` still returns `/owner` for a role the type no longer allows, and the file references `"OWNER"` which is not assignable to `PlatformRole`.

- [ ] **Step 11: Narrow `homeFor`**

In `src/lib/auth-routes.ts`, change the type import on line 8:

```ts
import type { UserRole } from "@prisma/client";
```

to:

```ts
import type { PlatformRole } from "@prisma/client";
```

and replace `homeFor`:

```ts
/** Where a role lands after logging in, and where it gets sent when it opens
 *  someone else's dashboard. */
export function homeFor(role: PlatformRole): string {
  // Owners are not a case here. Every account is a player, so an owner lands on
  // /account and switches portals from the sidebar. That keeps this function
  // pure — deciding it here would need a membership lookup, and middleware
  // cannot reach the database.
  return role === "PLAYER" ? "/account" : "/admin";
}
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: PASS.

- [ ] **Step 13: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `src/lib/server/auth.ts`, `src/app/owner/layout.tsx` and `src/app/admin/layout.tsx`, all naming `UserRole` or `requireRole`. These are fixed in Task 3. **Do not fix them here** — record the list and move on.

- [ ] **Step 14: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts src/lib/auth-routes.ts tests/auth-routes.test.ts
git commit -m "$(cat <<'EOF'
feat(schema): split UserRole into PlatformRole and OrgRole

User.role = OWNER contradicted the OrganizationMember table the owner
layout already reads. Owner-ness is now one derived predicate: the user
has a membership row. The platform enum drops OWNER so the contradiction
is unrepresentable rather than merely discouraged.

The migration is hand-written because Prisma's generated SQL narrows the
enum before moving the data, which MySQL rejects on live rows. It also
backfills an organization for any OWNER user that had no membership,
which would otherwise lose access silently.

homeFor() loses its owner branch and stays pure — owners land on
/account and switch portals from the sidebar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `portalsFor()`

The portal-switcher matrix as a pure function, so it is testable without a database or a browser.

**Files:**
- Modify: `src/lib/auth-routes.ts` (append)
- Test: `tests/auth-routes.test.ts` (append)

**Interfaces:**
- Consumes: `PlatformRole` from Task 1.
- Produces:
  ```ts
  export interface Portal { href: string; label: string; icon: string }
  export type PortalId = "player" | "owner" | "admin";
  export function portalsFor(opts: {
    role: PlatformRole;
    isOwner: boolean;
    current: PortalId;
  }): Portal[];
  ```
  The `Portal` shape is structurally identical to `DashSidebar`'s `NavItem`, so a `Portal[]` is assignable to a `NavItem[]` prop without a cast. It is declared here rather than imported from the component because this file must not import React.

- [ ] **Step 1: Write the failing test**

Append to `tests/auth-routes.test.ts`. Add `portalsFor` to the existing import on line 3 — it becomes:

```ts
import { SESSION_COOKIE, homeFor, isExpired, portalsFor, safeNext } from "@/lib/auth-routes";
```

Then append:

```ts
describe("portalsFor", () => {
  // The rule is one line: offer every portal the user holds, except the one
  // they are looking at. Each case below is that rule applied.
  const hrefs = (opts: Parameters<typeof portalsFor>[0]) =>
    portalsFor(opts).map((p) => p.href);

  it("offers nothing to a player who only plays", () => {
    expect(hrefs({ role: "PLAYER", isOwner: false, current: "player" })).toEqual([]);
  });

  it("offers the owner portal to a player who hosts", () => {
    expect(hrefs({ role: "PLAYER", isOwner: true, current: "player" })).toEqual(["/owner"]);
  });

  it("offers the player portal from inside the owner portal", () => {
    expect(hrefs({ role: "PLAYER", isOwner: true, current: "owner" })).toEqual(["/account"]);
  });

  it("offers the player portal to admin staff", () => {
    expect(hrefs({ role: "ADMIN", isOwner: false, current: "admin" })).toEqual(["/account"]);
    expect(hrefs({ role: "SUPER_ADMIN", isOwner: false, current: "admin" })).toEqual(["/account"]);
  });

  // Platform staff are ordinary people who may also play and may also host.
  it("offers both other portals to an admin who hosts", () => {
    expect(hrefs({ role: "ADMIN", isOwner: true, current: "admin" })).toEqual([
      "/account",
      "/owner",
    ]);
  });

  it("offers the admin portal to staff standing in another portal", () => {
    expect(hrefs({ role: "ADMIN", isOwner: false, current: "player" })).toEqual(["/admin"]);
    expect(hrefs({ role: "ADMIN", isOwner: true, current: "owner" })).toEqual([
      "/account",
      "/admin",
    ]);
  });

  it("never offers the portal you are already in", () => {
    for (const current of ["player", "owner", "admin"] as const) {
      const offered = hrefs({ role: "SUPER_ADMIN", isOwner: true, current });
      expect(offered).not.toContain(
        { player: "/account", owner: "/owner", admin: "/admin" }[current],
      );
    }
  });

  it("labels and icons every portal it offers", () => {
    for (const portal of portalsFor({ role: "ADMIN", isOwner: true, current: "player" })) {
      expect(portal.label.length).toBeGreaterThan(0);
      expect(portal.icon.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: FAIL with `portalsFor is not a function` / no exported member `portalsFor`.

- [ ] **Step 3: Implement `portalsFor`**

Append to `src/lib/auth-routes.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-routes.ts tests/auth-routes.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): add portalsFor, the portal-switcher matrix

Offers every portal a user holds except the one they are in. Lives in
auth-routes.ts, which is free of Next, Prisma and React imports, so the
whole matrix is unit-testable without a database.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Session `isOwner` and the three gates

**Files:**
- Modify: `src/lib/server/auth.ts:6` (import), `:19-25` (`SessionUser`), `:46-66` (`getSession`), `:98-105` (`requireRole`)
- Modify: `src/app/owner/layout.tsx:3-4,26-35`
- Modify: `src/app/admin/layout.tsx:3,26`

**Interfaces:**
- Consumes: `PlatformRole`, `homeFor()` from Task 1.
- Produces:
  ```ts
  interface SessionUser {
    id: string; email: string; name: string;
    role: PlatformRole; image: string | null;
    isOwner: boolean;
  }
  function requirePlatformRole(...roles: PlatformRole[]): Promise<SessionUser>;
  function requireOwner(): Promise<{
    user: SessionUser;
    org: { id: string; name: string };
  }>;
  ```
  `requireRole()` is removed. `requireUser()` is unchanged.

- [ ] **Step 1: Add `isOwner` to `SessionUser` and the session query**

In `src/lib/server/auth.ts`, change the import on line 6:

```ts
import { Prisma, type UserRole } from "@prisma/client";
```

to:

```ts
import { Prisma, type PlatformRole } from "@prisma/client";
```

Replace the `SessionUser` interface:

```ts
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
```

Replace the body of `getSession()` after the token check:

```ts
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
```

- [ ] **Step 2: Replace `requireRole` with the two new gates**

In the same file, replace:

```ts
export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  // Signed in as the wrong role: send them to their own dashboard rather than
  // rendering a dead end.
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
```

with:

```ts
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
```

- [ ] **Step 3: Switch the owner layout to `requireOwner()`**

In `src/app/owner/layout.tsx`, replace the imports on lines 3-4:

```ts
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
```

with:

```ts
import { requireOwner } from "@/lib/server/auth";
```

and replace the body's first statements (lines 26-35):

```ts
  const user = await requireRole("OWNER");

  // The sidebar names the facility this owner actually manages.
  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    // An owner can belong to several orgs; order so the sidebar name is stable
    // between requests. Choosing among them properly is a later-phase concern.
    orderBy: { orgId: "asc" },
    select: { org: { select: { name: true } } },
  });
```

with:

```ts
  // requireOwner() is the gate and the lookup: it rejects non-owners and hands
  // back the organization the sidebar names.
  const { user, org } = await requireOwner();
```

Then change the `subtitle` prop from:

```tsx
        subtitle={membership?.org.name ?? "No facility yet"}
```

to:

```tsx
        subtitle={org.name}
```

The `?? "No facility yet"` fallback goes: `requireOwner()` cannot return without an organization, so the branch was unreachable. A brand-new host's organization simply has no facilities yet, which the courts page reports.

- [ ] **Step 4: Switch the admin layout to `requirePlatformRole()`**

In `src/app/admin/layout.tsx`, change line 3:

```ts
import { requireRole } from "@/lib/server/auth";
```

to:

```ts
import { requirePlatformRole } from "@/lib/server/auth";
```

and line 26:

```ts
  const user = await requireRole("ADMIN", "SUPER_ADMIN");
```

to:

```ts
  const user = await requirePlatformRole("ADMIN", "SUPER_ADMIN");
```

- [ ] **Step 5: Confirm nothing else referenced the old symbols**

Run: `grep -rn "requireRole\|UserRole" src/ prisma/`
Expected: no output. Any hit is a call site this task must also update.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output. The errors recorded in Task 1 Step 13 are now resolved.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: all tests pass — 6 files, 79 tests plus the `portalsFor` cases added in Task 2.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/auth.ts src/app/owner/layout.tsx src/app/admin/layout.tsx
git commit -m "$(cat <<'EOF'
feat(auth): derive isOwner in the session, add requireOwner

getSession() now counts the user's org memberships in the query it
already runs, so SessionUser carries isOwner at no extra round trip.

requireRole() splits into requirePlatformRole() for /admin and
requireOwner() for /owner. requireOwner() subsumes the membership lookup
the owner layout was doing separately and returns the organization, so
the unreachable "No facility yet" fallback goes away. A signed-in
non-owner is sent to /list-your-court, which tells them how to become one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Render the portal switcher

**Files:**
- Modify: `src/components/dashboard/DashSidebar.tsx:23-42` (props), `:43-77` (`nav`)
- Modify: `src/app/account/layout.tsx:41-49`
- Modify: `src/app/owner/layout.tsx` (add `portals`)
- Modify: `src/app/admin/layout.tsx` (add `portals`)
- Modify: `src/components/AccountMenu.tsx:10-22`
- Modify: `src/components/SiteNav.tsx:16-20` (widen the `account` prop)

**Interfaces:**
- Consumes: `portalsFor()`, `Portal` from Task 2; `SessionUser.isOwner`, `requireOwner()` from Task 3.
- Produces: `DashSidebar` accepts `portals?: NavItem[]`. `AccountMenu` accepts `account.isOwner: boolean`.

- [ ] **Step 1: Accept and render `portals` in `DashSidebar`**

In `src/components/dashboard/DashSidebar.tsx`, add the prop to the destructured signature and its type. The component's parameter list becomes:

```tsx
export function DashSidebar({
  role,
  subtitle,
  sections,
  portals,
  user,
}: {
  /** Short badge text: "Player", "Owner", "Super Admin". */
  role: string;
  /** Secondary line under the badge — the owner's organization. */
  subtitle?: string;
  sections: NavSection[];
  /** Other portals this account can reach, from portalsFor(). Omitted or empty
   *  renders nothing. */
  portals?: NavItem[];
  user: { name: string; email: string };
}) {
```

Then, inside the `nav` element, after the `{sections.map(...)}` block and before the closing `</nav>`, add:

```tsx
      {portals && portals.length > 0 && (
        <div>
          <p className="mb-2 px-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            Switch portal
          </p>
          <div className="flex flex-col gap-0.5">
            {portals.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                // Never active: a switcher entry always points at a portal
                // other than the one being rendered.
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-line-white"
              >
                <span className="w-4 text-center" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 2: Pass `portals` from the player layout**

In `src/app/account/layout.tsx`, add the import:

```ts
import { portalsFor } from "@/lib/auth-routes";
```

and replace the component body:

```tsx
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar role="Player" sections={NAV} user={{ name: user.name, email: user.email }} />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
```

with:

```tsx
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Player"
        sections={NAV}
        portals={portalsFor({ role: user.role, isOwner: user.isOwner, current: "player" })}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Pass `portals` from the owner layout**

In `src/app/owner/layout.tsx`, add to the imports:

```ts
import { portalsFor } from "@/lib/auth-routes";
```

and add the prop to `DashSidebar`, after `sections={NAV}`:

```tsx
        portals={portalsFor({ role: user.role, isOwner: user.isOwner, current: "owner" })}
```

- [ ] **Step 4: Pass `portals` from the admin layout**

In `src/app/admin/layout.tsx`, add to the imports:

```ts
import { portalsFor } from "@/lib/auth-routes";
```

and add the prop to `DashSidebar`, after `sections={NAV}`:

```tsx
        portals={portalsFor({ role: user.role, isOwner: user.isOwner, current: "admin" })}
```

- [ ] **Step 5: Add the owner link to the site-header dropdown**

In `src/components/AccountMenu.tsx`, replace the props and the `items` list:

```tsx
export function AccountMenu({
  account,
}: {
  /** `href` is the signed-in role's own dashboard, from `homeFor()`. */
  account: { name: string; email: string; href: string };
}) {
  // Dashboard follows the role: an owner lands on /owner and an admin on
  // /admin, not on the player account page. Edit Profile is deliberately fixed
  // — /account/* is guarded by requireUser(), so it is shared by every role.
  const items = [
    { href: account.href, label: "Dashboard" },
    { href: "/account/profile", label: "Edit Profile" },
  ];
```

with:

```tsx
export function AccountMenu({
  account,
}: {
  /** `href` is the signed-in role's own dashboard, from `homeFor()`.
   *  `isOwner` adds the host dashboard, which no role value can imply. */
  account: { name: string; email: string; href: string; isOwner: boolean };
}) {
  // Dashboard follows the platform role: staff land on /admin, everyone else on
  // /account. Owner is additive rather than a role, so it gets its own entry
  // when the account hosts. Edit Profile is deliberately fixed — /account/* is
  // guarded by requireUser(), so it is shared by every role.
  const items = [
    { href: account.href, label: "Dashboard" },
    ...(account.isOwner ? [{ href: "/owner", label: "Owner Dashboard" }] : []),
    { href: "/account/profile", label: "Edit Profile" },
  ];
```

- [ ] **Step 6: Widen the `SiteNav` prop to carry `isOwner`**

In `src/components/SiteNav.tsx`, change the prop type:

```tsx
export function SiteNav({
  account,
}: {
  account: { name: string; email: string; href: string } | null;
}) {
```

to:

```tsx
export function SiteNav({
  account,
}: {
  account: { name: string; email: string; href: string; isOwner: boolean } | null;
}) {
```

- [ ] **Step 7: Fix the `SiteNav` call site**

Run: `grep -rn "SiteNav" src/app/`
Expected: one hit, in `src/app/(site)/layout.tsx`.

In that file, replace the `account` prop:

```tsx
        account={
          user ? { name: user.name, email: user.email, href: homeFor(user.role) } : null
        }
```

with:

```tsx
        account={
          user
            ? {
                name: user.name,
                email: user.email,
                href: homeFor(user.role),
                isOwner: user.isOwner,
              }
            : null
        }
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 10: Verify in the browser**

Run: `npm run dev`

Then, signed in as the seeded `owner@kitchenline.ph`:
1. `/account` — the sidebar shows a "Switch portal" section containing "◆ Owner Dashboard".
2. Click it — `/owner` loads, and its sidebar shows "☺ Player Dashboard".
3. Click that — back on `/account`.
4. The header avatar dropdown lists Dashboard, Owner Dashboard, Edit Profile.

Signed in as a player with no membership: `/account` shows **no** "Switch portal" section, and opening `/owner` directly redirects to `/list-your-court`.

- [ ] **Step 11: Commit**

```bash
git add src/components/dashboard/DashSidebar.tsx src/components/AccountMenu.tsx src/components/SiteNav.tsx "src/app/(site)/layout.tsx" src/app/account/layout.tsx src/app/owner/layout.tsx src/app/admin/layout.tsx
git commit -m "$(cat <<'EOF'
feat(nav): add the portal switcher to all three dashboards

A dual-role account can now move between its portals. DashSidebar takes
an optional portals section; each layout fills it from portalsFor() with
its own portal as `current`, so a switcher entry never points at the page
it is on. The site-header dropdown gains the same owner link.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Signup

**Files:**
- Create: `src/app/(site)/signup/schema.ts`, `actions.ts`, `SignupForm.tsx`, `page.tsx`
- Create: `tests/signup.test.ts`
- Modify: `src/app/(site)/login/page.tsx:37-42`, `src/app/(site)/login/LoginForm.tsx:58-60`

**Interfaces:**
- Consumes: `hashPassword()` from `src/lib/server/password.ts`; `createSession()` from Task 3's file; `safeNext()`, `homeFor()` from Task 1.
- Produces:
  ```ts
  export const SignupInput: z.ZodObject<...>;   // schema.ts
  export interface SignupState { error?: string; name?: string; email?: string }
  export function signupAction(prev: SignupState, formData: FormData): Promise<SignupState>;
  ```

- [ ] **Step 1: Write the failing schema test**

Create `tests/signup.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { SignupInput } from "@/app/(site)/signup/schema";

function parse(over: Partial<Record<string, unknown>> = {}) {
  return SignupInput.safeParse({
    name: "Juan dela Cruz",
    email: "juan@example.ph",
    password: "correct-horse",
    ...over,
  });
}

describe("SignupInput", () => {
  it("accepts a complete signup", () => {
    const result = parse();
    expect(result.success).toBe(true);
  });

  it("trims the name and requires two characters", () => {
    const trimmed = parse({ name: "  Jo  " });
    expect(trimmed.success).toBe(true);
    // Asserted unconditionally: guarding this behind `if (trimmed.success)`
    // would let the check vanish silently the day trimming regresses.
    expect(trimmed.data!.name).toBe("Jo");

    // One character survives the trim but fails the minimum; whitespace alone
    // leaves nothing at all.
    expect(parse({ name: " J " }).success).toBe(false);
    expect(parse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    expect(parse({ name: "a".repeat(81) }).success).toBe(false);
  });

  // The email is the login identifier, so it is stored exactly as the login
  // action will look it up: trimmed and lowercased.
  it("normalises the email", () => {
    const result = parse({ email: "  JUAN@Example.PH  " });
    expect(result.success).toBe(true);
    expect(result.data!.email).toBe("juan@example.ph");
  });

  it("rejects a malformed email", () => {
    expect(parse({ email: "juan" }).success).toBe(false);
    expect(parse({ email: "" }).success).toBe(false);
  });

  it("requires eight password characters", () => {
    expect(parse({ password: "12345678" }).success).toBe(true);
    expect(parse({ password: "1234567" }).success).toBe(false);
  });

  // Passwords are hashed, never trimmed — leading and trailing spaces are
  // legitimate characters the user chose.
  it("does not trim the password", () => {
    const result = parse({ password: "  spaces  " });
    expect(result.success).toBe(true);
    expect(result.data!.password).toBe("  spaces  ");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/signup.test.ts`
Expected: FAIL — cannot resolve `@/app/(site)/signup/schema`.

- [ ] **Step 3: Write the schema**

Create `src/app/(site)/signup/schema.ts`:

```ts
import { z } from "zod";

/** Shared by the form and the action, so the error a visitor sees is the error
 *  the server would produce. The action re-validates regardless. */
export const SignupInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Not trimmed: spaces are characters the user chose, and the hash must cover
  // exactly what they typed.
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SignupInputValues = z.infer<typeof SignupInput>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/signup.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the signup action**

Create `src/app/(site)/signup/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { SignupInput } from "@/app/(site)/signup/schema";
import { safeNext } from "@/lib/auth-routes";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export interface SignupState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear what was typed. */
  name?: string;
  email?: string;
}

const TAKEN = "An account with that email already exists.";

/** Prisma's unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const typedName = String(formData.get("name") ?? "");
  const typedEmail = String(formData.get("email") ?? "");
  const echo = { name: typedName, email: typedEmail };

  const parsed = SignupInput.safeParse({
    name: typedName,
    email: typedEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, ...echo };
  }

  const { name, email, password } = parsed.data;
  const next = safeNext(String(formData.get("next") ?? "")) ?? "/account";

  // Unlike login, signup has to tell the visitor the address is taken — there
  // is no way to report the failure without it. loginAction keeps its single
  // generic message precisely because it does have that choice.
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: TAKEN, ...echo };

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        // role defaults to PLAYER. Every account is a player; hosting is added
        // later by creating an organization.
        data: { name, email, passwordHash },
        select: { id: true },
      });
      // The profile page's "member since" strip reads this row, so it exists
      // from the first request rather than being upserted later.
      await tx.playerProfile.create({ data: { userId: created.id } });
      return created;
    });
    userId = user.id;
  } catch (error) {
    // The findUnique above leaves a race window between the check and the
    // insert. The unique constraint closes it; this reports it the same way.
    if (isUniqueViolation(error)) return { error: TAKEN, ...echo };
    throw error;
  }

  // A fresh account stays signed in — there is no "keep me signed in" choice to
  // honour on a form the visitor is filling in for the first time.
  await createSession(userId, true);

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect(next);
}
```

- [ ] **Step 6: Write the form**

Create `src/app/(site)/signup/SignupForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { signupAction, type SignupState } from "@/app/(site)/signup/actions";

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});

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
        <span className="field-label">Full name</span>
        <input
          type="text"
          name="name"
          required
          defaultValue={state.name}
          className="field"
          placeholder="Juan dela Cruz"
          autoComplete="name"
        />
      </label>
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
          minLength={8}
          className="field"
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-6 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Write the page**

Create `src/app/(site)/signup/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/app/(site)/signup/SignupForm";
import { homeFor, safeNext } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Courtix account to book courts and join open plays across Davao.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  // Already signed in: nothing to create.
  const user = await getSession();
  if (user) redirect(destination ?? homeFor(user.role));

  return (
    <div className="shell flex max-w-[440px] flex-col py-20">
      <p className="eyebrow mb-4">Get on court</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Create your account</h1>
      <p className="mb-8 text-[14px] text-muted">
        Book courts, join open plays, and keep every reference in one place.
      </p>

      <SignupForm next={destination ?? undefined} />

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ball-yellow">
          Log in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Point the login page at signup instead of the waitlist**

In `src/app/(site)/login/page.tsx`, replace the footer paragraph:

```tsx
      <p className="mt-6 text-center text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/waitlist" className="font-bold text-ball-yellow">
          Join the waitlist
        </Link>
      </p>
```

with:

```tsx
      <p className="mt-6 text-center text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-bold text-ball-yellow">
          Create one
        </Link>
      </p>
```

And in `src/app/(site)/login/LoginForm.tsx`, change the in-form link:

```tsx
        <Link href="/waitlist" className="text-[12.5px] font-bold text-ball-yellow">
          Need an account?
        </Link>
```

to:

```tsx
        <Link href="/signup" className="text-[12.5px] font-bold text-ball-yellow">
          Need an account?
        </Link>
```

- [ ] **Step 9: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass.

- [ ] **Step 10: Verify signup end to end**

Run: `npm run dev`

1. Open `/signup`, submit name / a fresh email / an 8-character password.
2. You land on `/account`, greeted by first name, with all stat tiles at 0.
3. Open `/account/profile` — name and email are populated, and "member since" shows the current month. This confirms the `PlayerProfile` row was created.
4. Sign out, then submit `/signup` again with the same email. Expect the inline error "An account with that email already exists." and the typed name and email still in the fields.
5. Open `/signup` while signed in — it redirects to `/account`.
6. Open `/login?next=/account/bookings`, click "Need an account?", sign up, and confirm you land on `/account/bookings`.

- [ ] **Step 11: Commit**

```bash
git add "src/app/(site)/signup" "src/app/(site)/login/page.tsx" "src/app/(site)/login/LoginForm.tsx" tests/signup.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): add signup

The app had no way to create an account — every user came from the seed.
Signup creates a User and its PlayerProfile in one transaction, signs the
visitor in, and honours ?next= through safeNext().

Duplicate emails are caught twice: a lookup, and the P2002 unique
violation that closes the race between that lookup and the insert. Unlike
login, signup must reveal that an address is taken; login keeps its
single generic message.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Become a host

**Files:**
- Create: `src/lib/slug.ts`, `tests/slug.test.ts`
- Create: `src/app/(site)/list-your-court/start/schema.ts`, `actions.ts`, `OrganizationForm.tsx`, `page.tsx`
- Modify: `src/app/(site)/list-your-court/page.tsx` (add the CTA)
- Modify: `src/middleware.ts:22` (matcher)

**Interfaces:**
- Consumes: `requireUser()` from Task 3.
- Produces:
  ```ts
  export function slugify(input: string): string;               // src/lib/slug.ts
  export const OrganizationInput: z.ZodObject<...>;             // schema.ts
  export interface OrganizationState { errors?: Record<string, string> }
  export function createOrganizationAction(
    prev: OrganizationState, formData: FormData,
  ): Promise<OrganizationState>;
  ```

- [ ] **Step 1: Write the failing slug test**

Create `tests/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Kitchen Line Club")).toBe("kitchen-line-club");
  });

  it("drops punctuation rather than encoding it", () => {
    expect(slugify("Hoop House PH!")).toBe("hoop-house-ph");
    expect(slugify("Smash & Rally Co.")).toBe("smash-rally-co");
  });

  it("collapses runs of separators", () => {
    expect(slugify("Tee   Line -- Golf")).toBe("tee-line-golf");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Fairway Bay--  ")).toBe("fairway-bay");
  });

  it("strips accents to their base letters", () => {
    expect(slugify("Café Padel")).toBe("cafe-padel");
  });

  // Facility.slug is the public URL segment, so it must stay a sane length.
  it("caps the length at 60 characters", () => {
    expect(slugify("a".repeat(100))).toHaveLength(60);
  });

  it("never leaves a trailing hyphen after capping", () => {
    // 59 characters, then a space, then more — the cut lands on the separator.
    expect(slugify(`${"a".repeat(59)} bcdef`).endsWith("-")).toBe(false);
  });

  // Callers must handle this: a name of pure punctuation has no slug.
  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/slug.test.ts`
Expected: FAIL — cannot resolve `@/lib/slug`.

- [ ] **Step 3: Implement `slugify`**

Create `src/lib/slug.ts`:

```ts
/**
 * URL segment from a human name — "Kitchen Line Club" to "kitchen-line-club".
 *
 * Pure and dependency-free so it can be unit-tested directly. Returns "" when
 * the input has no alphanumeric characters at all; callers must supply a
 * fallback rather than writing an empty slug.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Strip the combining marks NFKD split off, so "é" becomes "e".
      // Written as escapes, not literal marks, so the source stays legible.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      // The slice can land mid-separator and leave a trailing hyphen.
      .replace(/-+$/g, "")
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/slug.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the failing organization schema test**

Append to `tests/signup.test.ts`. Add the import at the top of the file, below the existing one:

```ts
import { OrganizationInput } from "@/app/(site)/list-your-court/start/schema";
```

Then append:

```ts
describe("OrganizationInput", () => {
  function parse(over: Partial<Record<string, unknown>> = {}) {
    return OrganizationInput.safeParse({
      name: "Kitchen Line Club",
      contactEmail: "host@kitchenline.ph",
      contactPhone: "09171234567",
      ...over,
    });
  }

  it("accepts a complete organization", () => {
    expect(parse().success).toBe(true);
  });

  it("requires a business name of two characters", () => {
    expect(parse({ name: " K " }).success).toBe(false);
    expect(parse({ name: "KL" }).success).toBe(true);
  });

  it("rejects a business name over 120 characters", () => {
    expect(parse({ name: "a".repeat(121) }).success).toBe(false);
  });

  it("normalises the contact email", () => {
    const result = parse({ contactEmail: "  HOST@Kitchenline.PH " });
    expect(result.success).toBe(true);
    expect(result.data!.contactEmail).toBe("host@kitchenline.ph");
  });

  it("rejects a malformed contact email", () => {
    expect(parse({ contactEmail: "host" }).success).toBe(false);
  });

  // Same rule the player profile uses, so one host sees one phone format.
  it("accepts an 11-digit mobile starting 09, or nothing", () => {
    expect(parse({ contactPhone: "09171234567" }).success).toBe(true);
    expect(parse({ contactPhone: "" }).success).toBe(true);
    expect(parse({ contactPhone: "0917123456" }).success).toBe(false);
    expect(parse({ contactPhone: "12345678901" }).success).toBe(false);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/signup.test.ts`
Expected: FAIL — cannot resolve `@/app/(site)/list-your-court/start/schema`.

- [ ] **Step 7: Write the organization schema**

Create `src/app/(site)/list-your-court/start/schema.ts`:

```ts
import { z } from "zod";

/** Shared by the form and the action, so the error a host sees is the error the
 *  server would produce. The action re-validates regardless. */
export const OrganizationInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your business name")
    .max(120, "That name is too long"),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Same rule as the player profile, so a host who plays sees one format.
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^09\d{9}$/.test(v), "Use an 11-digit mobile number starting 09"),
});

export type OrganizationInputValues = z.infer<typeof OrganizationInput>;
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run tests/signup.test.ts`
Expected: PASS — the 8 signup cases plus 6 organization cases.

- [ ] **Step 9: Write the organization action**

Create `src/app/(site)/list-your-court/start/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";

import { OrganizationInput } from "@/app/(site)/list-your-court/start/schema";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { slugify } from "@/lib/slug";

export interface OrganizationState {
  errors?: Record<string, string>;
}

/**
 * A slug nobody else holds. `Organization.slug` is unique, and two hosts can
 * legitimately share a business name, so collisions are expected rather than
 * exceptional.
 */
async function availableSlug(name: string): Promise<string> {
  // A name of pure punctuation slugifies to "" — fall back rather than write it.
  const base = slugify(name) || "host";

  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    const taken = await db.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

export async function createOrganizationAction(
  _prev: OrganizationState,
  formData: FormData,
): Promise<OrganizationState> {
  const user = await requireUser();

  const parsed = OrganizationInput.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { name, contactEmail, contactPhone } = parsed.data;

  // Already a host: the form is not a way to collect organizations.
  const existing = await db.organizationMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) redirect("/owner");

  await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug: await availableSlug(name),
        name,
        contactEmail,
        contactPhone: contactPhone === "" ? null : contactPhone,
      },
      select: { id: true },
    });

    // This row is what grants owner access — getSession() counts it, and
    // requireOwner() reads it. The user's platform role stays PLAYER.
    await tx.organizationMember.create({
      data: { orgId: org.id, userId: user.id, role: "OWNER" },
    });
  });

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect("/owner");
}
```

- [ ] **Step 10: Write the form**

Create `src/app/(site)/list-your-court/start/OrganizationForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type OrganizationState,
} from "@/app/(site)/list-your-court/start/actions";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11.5px] font-semibold text-[#ff9370]">
          {error}
        </span>
      )}
    </label>
  );
}

export function OrganizationForm() {
  const [state, action, pending] = useActionState<OrganizationState, FormData>(
    createOrganizationAction,
    {},
  );
  const errors = state.errors ?? {};

  return (
    <form action={action} className="panel">
      <Field label="Business name" error={errors.name}>
        <input
          type="text"
          name="name"
          required
          className="field"
          placeholder="Kitchen Line Club"
          autoComplete="organization"
        />
      </Field>
      <Field label="Contact email" error={errors.contactEmail}>
        <input
          type="email"
          name="contactEmail"
          required
          className="field"
          placeholder="host@example.ph"
          autoComplete="email"
        />
      </Field>
      <Field label="Contact mobile (optional)" error={errors.contactPhone}>
        <input
          type="tel"
          name="contactPhone"
          className="field"
          placeholder="09171234567"
          autoComplete="tel"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-2 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Setting up…" : "Create host account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 11: Write the page**

Create `src/app/(site)/list-your-court/start/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrganizationForm } from "@/app/(site)/list-your-court/start/OrganizationForm";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Become a host",
  robots: { index: false },
};

export default async function BecomeHostPage() {
  // Middleware only checks that a cookie exists, so the real gate is here.
  const user = await getSession();
  if (!user) redirect("/login?next=/list-your-court/start");
  // Already hosting — the owner dashboard is where they wanted to go.
  if (user.isOwner) redirect("/owner");

  return (
    <div className="shell flex max-w-[520px] flex-col py-20">
      <p className="eyebrow mb-4">List your court</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Become a host</h1>
      <p className="mb-8 text-[14px] text-muted">
        Tell us about your business and we&apos;ll open your host dashboard. You keep your
        player account — the same login gets you both.
      </p>

      <OrganizationForm />
    </div>
  );
}
```

- [ ] **Step 12: Add the CTA to the marketing page, and fix the dashboard link**

`src/app/(site)/list-your-court/page.tsx` has two hero buttons at lines 34-41:

```tsx
            <div className="flex flex-wrap gap-3">
              <Link href="#apply" className="btn btn-solid">
                Apply to list
              </Link>
              <Link href="/owner" className="btn btn-ghost">
                Tour the dashboard
              </Link>
            </div>
```

Replace that block with:

```tsx
            <div className="flex flex-wrap gap-3">
              <Link href="/list-your-court/start" className="btn btn-solid">
                Start hosting now
              </Link>
              <Link href="#apply" className="btn btn-ghost">
                Talk to onboarding
              </Link>
            </div>
```

Two changes, both deliberate:

- **"Start hosting now" is new**, and is the self-serve path this task builds. `#apply` is *not* dead — it targets the section at line 96, which renders `<WaitlistForm />` and promises that "our onboarding team will reach out within two working days" along with the founding-host commission rate. That path still works and is kept as the secondary button; a host who wants the founding rate and a human still has it.
- **"Tour the dashboard" is removed.** It linked to `/owner`, which `requireOwner()` now redirects to `/list-your-court` for anyone who is not already a host — landing the visitor back on the page they clicked from, with no explanation. It was an artefact of the pre-auth demo, when `/owner` was reachable by typing the URL.

Leave the `#apply` section at lines 96-116 and its `<WaitlistForm />` untouched.

- [ ] **Step 13: Extend the middleware matcher**

`/list-your-court/start` needs a session. In `src/middleware.ts`, change:

```ts
  matcher: ["/owner/:path*", "/admin/:path*", "/account/:path*"],
```

to:

```ts
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/account/:path*",
    "/list-your-court/start",
  ],
```

The marketing page itself stays public — only the form is gated.

- [ ] **Step 14: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass across 8 files.

- [ ] **Step 15: Verify becoming a host end to end**

Run: `npm run dev`

1. Sign up a fresh player. Confirm `/account` shows **no** "Switch portal" section.
2. Open `/owner` directly — you are redirected to `/list-your-court`.
3. Click the "List your court" CTA, fill in the form, submit.
4. You land on `/owner`, and the sidebar subtitle shows your business name.
5. The owner sidebar shows "☺ Player Dashboard"; click it and you are back on `/account`, which now shows "◆ Owner Dashboard".
6. Open `/list-your-court/start` again — it redirects to `/owner`.
7. Sign out and open `/list-your-court/start` — you are sent to `/login?next=/list-your-court/start`, and logging in returns you to the form.
8. Create a second host with the **same** business name as the first, using a different account. Both succeed, and the second organization's slug carries a `-1` suffix. Verify with:
   ```bash
   npx prisma db execute --stdin <<'SQL'
   SELECT `slug`, `name` FROM `Organization` ORDER BY `createdAt` DESC LIMIT 5;
   SQL
   ```

- [ ] **Step 16: Commit**

```bash
git add src/lib/slug.ts tests/slug.test.ts tests/signup.test.ts "src/app/(site)/list-your-court" src/middleware.ts
git commit -m "$(cat <<'EOF'
feat(owner): let a player become a host

Creating an organization is what grants owner access: the
OrganizationMember row is the single predicate getSession() counts and
requireOwner() reads. The player keeps their account and their platform
role — the same login now reaches both portals.

Slugs are derived from the business name and suffixed on collision, since
two hosts may legitimately share a name and Organization.slug is unique.

No facility is created. The player and owner pages both still read the
static catalog, so a Facility row would be write-only until phase 2 moves
them onto MySQL.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §1 role model, two enums | 1 |
| §1 `isOwner` in the session query | 3 |
| §2 four-step migration, seed dual-role account | 1 |
| §3 signup | 5 |
| §4 becoming an owner | 6 |
| §5 `homeFor()` narrowed | 1 |
| §5 `requirePlatformRole`, `requireOwner`, gate table | 3 |
| §6 `portalsFor()` | 2 |
| §6 `DashSidebar` portals, `AccountMenu` | 4 |
| §7 `homeFor` / `portalsFor` / signup-schema tests | 1, 2, 5 |
| §7 manual verification | 4 Step 10, 5 Step 10, 6 Step 15 |

**Two deviations from the spec's file table, both deliberate:**

1. The spec lists `prisma/seed-demo.ts` for the dual-role account. The owner and admin logins are actually seeded in **`prisma/seed.ts:346-380`**, and its `role: "OWNER"` would fail to typecheck after Task 1. Task 1 Step 8 fixes that file instead. `seed-demo.ts` only creates `PLAYER` users and needs no change.
2. The spec does not mention `src/middleware.ts` or `src/components/SiteNav.tsx`. Both are required: the new gated route needs a matcher entry (Task 6 Step 13), and `SiteNav` passes the `account` object through to `AccountMenu`, so its prop type has to carry `isOwner` (Task 4 Steps 6–7).

**One product decision the implementer should not make silently.** The spec describes `/list-your-court` as "a static marketing page" that "gains a call to action". It is not purely static: its `#apply` section renders `<WaitlistForm />` and promises that an onboarding team will make contact within two working days, at a founding-host commission rate of 3% instead of 6%. So the page already has a host-acquisition path, and this plan adds a second, self-serve one.

Task 6 Step 12 keeps both — self-serve as the primary button, "Talk to onboarding" as the secondary — because removing a funnel that promises a commission discount is a commercial decision, not an implementation detail. **If the intent was to replace the waitlist path rather than sit alongside it, say so before Task 6 runs.**

The same step also removes the hero's "Tour the dashboard" button, which linked to `/owner`. After Task 3 that link redirects any non-host back to `/list-your-court` — the page they clicked from. It was an artefact of the pre-auth demo and cannot be made to work for a visitor who is not already a host.

**One spec ambiguity resolved:** §6's matrix lists "Player, user is not an owner → nothing", which reads as though the player portal never offers anything. The section's stated rule — "offers every portal the user holds except the one they are currently in" — means an **admin** standing in the player portal is offered `/admin`. Task 2 implements the stated rule and tests that case explicitly.

**Placeholder scan:** no TBD/TODO. Every code step carries complete code. Task 6 Step 12 is the only step that says "find the existing button" rather than quoting it, because the CTA's exact markup is not known without opening the file; the replacement markup is given in full.

**Type consistency:** `PlatformRole` (Task 1) is consumed by `portalsFor` (2), `SessionUser`/`requirePlatformRole` (3), and the three layouts (4). `Portal` (2) is structurally `NavItem` (4) — `{ href, label, icon }` in both. `SessionUser.isOwner` (3) is read in Task 4 Steps 2–4 and Task 6 Step 11. `slugify` (6) returns `string` and its `""` case is handled by `availableSlug`. `requireOwner()` returns `{ user, org: { id, name } }`; Task 3 Step 3 uses `org.name`, and `id` is selected for Phase 4's org-scoped queries.
