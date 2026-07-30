# Courtix — Dual-role identity & signup (Phase 1.5)

**Date:** 2026-07-30
**Status:** approved, ready for implementation planning

Sits between Phase 1 (auth & sessions, shipped) and Phase 2 (the Prisma data
layer) of the five-phase plan in `2026-07-25-auth-and-login-design.md`. It makes
one account able to be both a player and an owner, and adds the signup flow the
app has never had.

Nothing here touches bookings, availability, the static catalog, or the JSON
driver. Those are Phase 2.

---

## Context

Phase 1 delivered opaque database sessions and role-based access control. It
gated each dashboard on a single `User.role` value:

| Route | Gate | File |
|---|---|---|
| `/account/*` | `requireUser()` | `src/app/account/layout.tsx` |
| `/owner/*` | `requireRole("OWNER")` | `src/app/owner/layout.tsx` |
| `/admin/*` | `requireRole("ADMIN", "SUPER_ADMIN")` | `src/app/admin/layout.tsx` |

`homeFor(role)` in `src/lib/auth-routes.ts` maps a role to exactly one
destination, and `requireRole()` redirects there when the role does not match.

### The contradiction this fixes

`UserRole` is a single enum on `User`, so an account is a player *or* an owner —
never both. But the schema already models owner-ness relationally:

```prisma
model OrganizationMember {
  orgId  String
  userId String
  role   UserRole @default(OWNER) // OWNER or staff (ADMIN within the org)
}
```

`src/app/owner/layout.tsx` already queries that table for the sidebar's facility
name, and already handles the no-membership case with a `"No facility yet"`
label. So the app carries two disagreeing answers to "is this user an owner":
the `User.role` column that `requireRole("OWNER")` reads, and the
`OrganizationMember` rows that the layout reads.

A court host who also plays — the common case in a pilot city — cannot exist.

### Why this matters now

There is no signup flow at all. `/login` authenticates against seeded rows and
nothing creates a user. Every account in the system was made by
`prisma/seed-demo.ts`.

That makes this the last cheap moment to settle the role model. Phase 2 binds
bookings to a player identity (`Booking.playerId`), and Phase 4 scopes seven
owner pages to the session's organization. Changing what a role means after
either of those lands means revisiting both.

### Decisions taken during brainstorming

- **Every account is a player. Owner is an additive capability.** There is no
  role picker at signup, and no separate owner account type.
- **Owner-ness is derived from `OrganizationMember`, never stored on `User`.**
  One source of truth, so the contradiction above cannot recur.
- **Split `UserRole` into two enums** so `User.role = OWNER` is unrepresentable
  rather than merely discouraged.
- **Owner portal access is granted on organization creation, not on admin
  approval.** `FacilityStatus` still governs whether a facility is publicly
  searchable; it does not govern portal access. Gating the portal on approval is
  a chicken-and-egg: the owner cannot supply the facility detail the approval
  needs.
- **Login always lands on `/account`** for players and owners alike, with an
  explicit portal switcher in the sidebar. `homeFor()` stays a pure function —
  no database call — because owner-ness never changes the landing route.
- **No email verification.** There is no mail provider in the dependency tree.
  `User.emailVerified` and the `VerificationToken` table stay unused.
- **Organization creation only — no facility form.** See Out of scope.

---

## 1. The role model

> Every account is a player. Being an owner is something an account *has*, not
> something it *is*.

```
User (role: PLAYER)                        → /account
User (role: PLAYER) + OrganizationMember   → /account + /owner
User (role: ADMIN)                         → /admin + /account
```

### Schema

`UserRole` is replaced by two enums with disjoint responsibilities:

```prisma
enum PlatformRole {   // who this account is on the platform
  PLAYER
  ADMIN
  SUPER_ADMIN
}

enum OrgRole {        // what this account is inside one organization
  OWNER
  STAFF
}

model User {
  role PlatformRole @default(PLAYER)
}

model OrganizationMember {
  role OrgRole @default(OWNER)
}
```

`OWNER` leaves the platform enum entirely. Owner-ness is exactly one predicate:

```
isOwner  ⟺  the user has at least one OrganizationMember row
```

### Where `isOwner` is computed

`getSession()` already runs one query joining `session → user`. It gains a count
of the user's memberships in that same query, and `SessionUser` gains
`isOwner: boolean`:

```ts
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  image: string | null;
  isOwner: boolean;   // derived: memberships > 0
}
```

Every protected layout already calls `getSession()` or `requireUser()`, so the
sidebar gets what it needs to render the switcher with no additional round trip.

A denormalised boolean column on `User` was rejected: it would need syncing on
every membership insert and delete, which is the same class of dual-source bug
this document exists to remove.

---

## 2. Migration

The auto-generated Prisma migration would fail. Existing `User` rows hold
`role = 'OWNER'`, and MySQL cannot drop an enum value that rows still use. The
migration is hand-written SQL in this order:

1. **Backfill.** For every `User` with `role = 'OWNER'` that has no
   `OrganizationMember` row, create an `Organization` and the membership. Without
   this step those accounts lose owner access silently.
2. **Reassign platform roles.** `UPDATE User SET role = 'PLAYER' WHERE role = 'OWNER'`.
3. **Remap org roles.** The existing schema comment records org staff as
   `'ADMIN'`, so `UPDATE OrganizationMember SET role = 'STAFF' WHERE role = 'ADMIN'`.
   Any row not already `'OWNER'` or `'STAFF'` after that statement —
   `'PLAYER'` or `'SUPER_ADMIN'`, neither of which the app writes here — is set
   to `'OWNER'`, the column's existing default, so no row survives the `ALTER`
   holding a value the new enum lacks.
4. **Alter the columns** to the new enum types.

Data migration precedes every `ALTER`. Reversing that order fails on live data.

`prisma/seed-demo.ts` is updated to produce a dual-role account — a user with
`role = PLAYER` and an `OrganizationMember` row — so the switcher has something
to exercise.

---

## 3. Signup — `/signup`

Mirrors the file layout of `/login`: `page.tsx`, `SignupForm.tsx`, `actions.ts`,
`schema.ts`, under `src/app/(site)/signup/`.

**Fields:** name, email, password. No role selection.

**Validation** (`schema.ts`, Zod, matching `LoginInput`'s trim/lowercase style):

| Field | Rule |
|---|---|
| name | trimmed, min 2 characters |
| email | trimmed, lowercased, valid address |
| password | min 8 characters |

**Action:**

```
POST /signup
  → validate
  → hash password with the existing src/lib/server/password.ts
  → $transaction: create User (role PLAYER) + PlayerProfile
  → createSession(user.id, remember: true)
  → redirect(safeNext(next) ?? "/account")
```

`PlayerProfile` is created in the same transaction because the profile page's
`memberSince` strip reads it.

**Duplicate email** is handled twice: a pre-check lookup, and a catch on Prisma
`P2002` from the unique constraint. The pre-check alone leaves a race window
between the lookup and the insert. Both paths return the same message.

Unlike `/login`, signup necessarily reveals whether an email is registered —
the user has to be told. `loginAction`'s `GENERIC_FAILURE` behaviour is
unchanged.

`?next=` is carried through `safeNext()`, which already rejects
protocol-relative and non-same-origin destinations.

---

## 4. Becoming an owner

`/list-your-court` is a static marketing page today. It gains a call to action
pointing at a new `/list-your-court/start`:

```
/list-your-court  → [ Become a host ]
   → /list-your-court/start   (requireUser)
        form: organization name, contact email, contact phone
        → $transaction: Organization + OrganizationMember(role: OWNER)
        → redirect /owner
```

The new organization has no facilities. `/owner` renders its existing
`"No facility yet"` subtitle, and its pages continue to read the static demo
data they read today.

An already-signed-in user reaches the form directly. A visitor is sent to
`/login?next=/list-your-court/start` by middleware, and can sign up from there.

---

## 5. Gates and routing

Three helpers in `src/lib/server/auth.ts`:

```ts
requireUser(): Promise<SessionUser>
requirePlatformRole(...roles: PlatformRole[]): Promise<SessionUser>
requireOwner(): Promise<{ user: SessionUser; org: { id: string; name: string } }>
```

`requireRole()` is replaced by `requirePlatformRole()`. `requireOwner()`
subsumes both the gate and the membership lookup that
`src/app/owner/layout.tsx` performs today, returning the organization the
sidebar names.

| Route | Gate | On failure |
|---|---|---|
| `/account/*` | `requireUser()` — unchanged | `/login` |
| `/admin/*` | `requirePlatformRole("ADMIN", "SUPER_ADMIN")` | `homeFor(role)` |
| `/owner/*` | `requireOwner()` | `/list-your-court` |

A non-owner who opens `/owner` is sent to `/list-your-court` rather than
`/account`, because that page tells them how to become one.

`homeFor()` loses its `OWNER` branch and stays free of database access:

```ts
export function homeFor(role: PlatformRole): string {
  return role === "PLAYER" ? "/account" : "/admin";
}
```

`src/middleware.ts` is unchanged. It still only checks that a session cookie is
present, and its matcher already covers all three portals.

---

## 6. The portal switcher

`DashSidebar` takes a new optional prop:

```ts
portals?: NavItem[]   // rendered as a titled "Switch portal" section
```

Which portals each surface offers:

| Current portal | Switcher shows |
|---|---|
| Player, user is an owner | ▸ Owner Dashboard |
| Player, user is not an owner | *nothing* |
| Owner | ▸ Player Dashboard |
| Admin, user is not an owner | ▸ Player Dashboard |
| Admin, user is an owner | ▸ Player Dashboard · ▸ Owner Dashboard |

The two conditions are independent: `portalsFor()` offers every portal the user
holds except the one they are currently in. Platform staff are ordinary people
who may also play and may also host, so an admin who owns an organization sees
all three surfaces.

Switcher entries always point at a *different* portal, so `DashSidebar`'s
existing active-link matching never highlights one. No change to that logic.

`src/components/AccountMenu.tsx`, the site-header dropdown, gains the same owner
link when `isOwner`.

**Isolation.** The decision of which portals to offer is a pure function placed
in `src/lib/auth-routes.ts`:

```ts
portalsFor({ role, isOwner, current }): NavItem[]
```

That file is documented as free of Next, Prisma and React imports so middleware
and plain-Node tests can both use it. Putting the matrix there makes the whole
switcher unit-testable without a database.

---

## 7. Testing

The existing suite is 79 tests across 6 files, all pure functions, run by
vitest. New coverage follows the same shape:

| Unit | Cases |
|---|---|
| `homeFor()` | each `PlatformRole` |
| `portalsFor()` | every row of the matrix in section 6, including the admin-who-owns case |
| signup schema | name, email and password rules; whitespace and case handling |

Not unit-testable, and therefore verified by hand against a real database:

- the migration, run forward on a database holding `role = 'OWNER'` rows,
  including an owner with no membership (the backfill path)
- signup creating `User` + `PlayerProfile`, then landing on `/account`
- `/list-your-court/start` granting owner access, then `/owner` loading
- switching player → owner → player in both directions
- a non-owner opening `/owner` and landing on `/list-your-court`

---

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | add `PlatformRole`, `OrgRole`; drop `UserRole` |
| `prisma/migrations/<ts>_split_platform_and_org_roles/` | hand-written SQL, four steps |
| `prisma/seed-demo.ts` | dual-role demo account |
| `src/lib/server/auth.ts` | `isOwner` in session; `requirePlatformRole`, `requireOwner` |
| `src/lib/auth-routes.ts` | `homeFor()` narrowed; new `portalsFor()` |
| `src/app/(site)/signup/` | new — page, form, action, schema |
| `src/app/(site)/list-your-court/page.tsx` | add the become-a-host CTA |
| `src/app/(site)/list-your-court/start/` | new — organization form and action |
| `src/app/owner/layout.tsx` | `requireOwner()`; pass `portals` |
| `src/app/admin/layout.tsx` | `requirePlatformRole()`; pass `portals` |
| `src/app/account/layout.tsx` | pass `portals` when `isOwner` |
| `src/components/dashboard/DashSidebar.tsx` | render the `portals` section |
| `src/components/AccountMenu.tsx` | owner link when `isOwner` |
| `src/app/(site)/login/page.tsx` | link to `/signup` |
| `tests/auth-routes.test.ts` | `homeFor`, `portalsFor` |
| `tests/signup.test.ts` | new — schema validation |

---

## Out of scope

- **The facility form.** Creating a real `Facility` row would be write-only
  work: the player pages read the static `COURTS` constant and the owner pages
  read static demo data, so nothing would display it. It belongs with Phase 2,
  which moves both onto MySQL.
- **Email verification.** No mail provider exists. `User.emailVerified` and
  `VerificationToken` stay unused.
- **Password reset.** Same reason.
- **Scoping owner pages to the organization.** The seven `/owner/*` pages keep
  reading static demo data. That is Phase 4.
- **Org staff invitations.** `OrgRole.STAFF` exists in the enum and is written by
  the migration's remap, but nothing creates a staff member yet.
- **Everything in Phase 2:** the static catalog, id unification, the JSON
  driver, `Booking`/`BookingSlot`, real availability, and booking cancellation.
