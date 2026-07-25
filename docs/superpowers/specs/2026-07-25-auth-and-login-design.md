# Courtix — Auth & login (Phase 1)

**Date:** 2026-07-25
**Status:** approved, ready for implementation planning

Phase 1 of five. It delivers a working login and role-based access control, and
unblocks every phase after it. Nothing here reads or writes booking data.

---

## Context

The app has a full frontend, a seeded MySQL database (40 tables, catalog data
loaded), and no auth at all. `/owner` and `/admin` are reachable by typing the
URL; they are `noindex`, which is not a security control.
`src/app/(site)/login/page.tsx` renders an email/password form whose submit does
nothing, and offers plain links into the three dashboards instead.

### The five phases

| # | Phase | Blocks |
|---|---|---|
| **1** | **Auth & sessions — this document** | everything |
| 2 | Prisma data layer; public pages, availability and booking POST cut over to MySQL; static catalog and JSON driver deleted | 3, 4, 5 |
| 3 | Demo seed — 60 days of bookings, payments, payouts, reviews, disputes | 4, 5 |
| 4 | `/player-home` and seven `/owner/*` pages on real queries, scoped to the session's org, with write actions | — |
| 5 | Seven `/admin/*` pages on platform aggregates, with approvals, disputes, payouts, settings, audit logging | — |

### Decisions already taken

- **Password auth on `User`**, not Auth.js. Magic links need a mail provider and
  OAuth needs credentials; neither can work offline, and login must work today.
- **Full CRUD per role** in phases 4–5, so the roles are genuinely distinct.
- **MySQL is the only data source** after phase 2 — the JSON driver goes.

---

## 1. Session mechanism

Opaque, database-backed sessions in the `session` table the schema already
carries for NextAuth. No JWT, therefore no signing secret to manage or rotate,
and a session is revoked by deleting one row.

```
POST /login
  → look up user by email
  → bcrypt.compare(password, user.passwordHash)
  → session.create({ sessionToken: 32 random bytes hex, userId, expires })
  → Set-Cookie: courtix_session=<token>
       httpOnly · sameSite=lax · path=/ · secure when NODE_ENV=production
  → redirect
```

The cookie carries a 256-bit random token and nothing else. All state lives in
the row, so tampering with the cookie yields a token that isn't in the table.

**TTL** comes from the existing "Keep me signed in" checkbox: 30 days when
checked, 1 day when not. The cookie's `maxAge` and the row's `expires` are set
from the same value.

`getSession()` reads the cookie, loads the row with its user, and returns null
when the row is missing or `expires` has passed — deleting the expired row as it
goes. There is no sliding expiry; a session ends at its original expiry.

### Schema change

```prisma
model User {
  // ...
  passwordHash String?   // null = this account cannot password-log-in
}
```

Nullable on purpose: OAuth accounts added later have no password, and every user
seeded before this phase has none either. Applied with `npm run db:push`.

---

## 2. Where authorization happens

**Middleware is a redirect, not a security control.**

Next.js runs middleware on the Edge runtime, where Prisma cannot reach MySQL.
So `src/middleware.ts` checks only that the session cookie *exists* and bounces
to `/login?next=<pathname>` when it doesn't. It never decides who you are.

The real gate is `requireRole()` in each protected layout, running on the Node
runtime against the database. A forged or stale cookie gets past middleware and
is rejected there.

```
src/middleware.ts          cookie present?                    cheap redirect
src/app/owner/layout.tsx   requireRole("OWNER")               real gate
src/app/admin/layout.tsx   requireRole("ADMIN","SUPER_ADMIN") real gate
/player-home               requireUser()                      real gate
```

Signed in with the wrong role redirects to that role's own home rather than
rendering a 403 dead-end.

### Role → home

| Role | Home |
|---|---|
| `PLAYER` | `/player-home` |
| `OWNER` | `/owner` |
| `ADMIN`, `SUPER_ADMIN` | `/admin` |

---

## 3. Components

### New

| File | Responsibility | Depends on |
|---|---|---|
| `src/lib/server/db.ts` | `PrismaClient` singleton, surviving dev hot-reload via a global. Phase 2 onward reuses it. | `@prisma/client` |
| `src/lib/server/auth.ts` | The whole auth surface: `hashPassword`, `verifyPassword`, `createSession`, `getSession`, `requireUser`, `requireRole`, `destroySession`, `homeFor(role)` | `db.ts`, `bcryptjs`, `next/headers` |
| `src/app/(site)/login/actions.ts` | `loginAction`, `logoutAction` — server actions; the only callers of `createSession`/`destroySession` | `auth.ts` |
| `src/app/(site)/login/LoginForm.tsx` | Client form; `useActionState` renders the error inline and keeps the typed email | `actions.ts` |
| `src/middleware.ts` | Cookie-presence redirect; matcher `/owner/:path*`, `/admin/:path*`, `/player-home` | — |

`auth.ts` is the only module that knows how a session is represented. Everything
else asks it who the user is. Swapping to Auth.js later means rewriting that one
file.

### Changed

| File | Change |
|---|---|
| `src/app/(site)/login/page.tsx` | Server component: redirect to your home if already signed in, else render `LoginForm`. The "accounts aren't wired up" panel of dashboard links is deleted. |
| `src/app/owner/layout.tsx` | `await requireRole("OWNER")`; sidebar shows the real org name from `OrganizationMember`; sign-out added |
| `src/app/admin/layout.tsx` | `await requireRole("ADMIN", "SUPER_ADMIN")`; sign-out added |
| `src/components/dashboard/DashSidebar.tsx` | Accepts the signed-in user; renders a sign-out button calling `logoutAction` |
| `src/components/SiteNav.tsx` | Its "Sign in" button currently links to `/player-home` — becomes `/login`, or the user's name linking to their home when signed in. Session is passed down as a prop from `(site)/layout.tsx`, not fetched client-side. |
| `src/lib/data/player.ts` | `getCurrentPlayer()` becomes async and session-backed: identity, skill, rating, city and favourite sports from `user` + `playerprofile` + `playersport` |
| `prisma/schema.prisma` | `User.passwordHash` |
| `prisma/seed.ts` | Password hashes and the two new accounts |
| `package.json` | `bcryptjs`, `@types/bcryptjs`, `vitest`; `test` script |

---

## 4. Seeded accounts

Added to `prisma/seed.ts` behind `NODE_ENV !== "production"`, so a production
seed can never create an account with a published password.

| Email | Password | Role | Extra |
|---|---|---|---|
| `jomar.r@example.ph` | `demo1234` | `PLAYER` | the demo player that already exists; gains a hash |
| `owner@kitchenline.ph` | `demo1234` | `OWNER` | + `OrganizationMember` → Kitchen Line Club |
| `admin@courtix.ph` | `demo1234` | `SUPER_ADMIN` | — |

Idempotent like the rest of the seed: upsert on email, and the hash is only
written when `passwordHash` is null, so a changed password survives a re-seed.

---

## 5. Data flow

```
Browser
  │
  ├── GET /owner ─────────────────────────────────────────────
  │     middleware: cookie?  no → 307 /login?next=/owner
  │                          yes ↓
  │     owner/layout: requireRole("OWNER")
  │        → getSession() → session row + user
  │        → null or wrong role → redirect(homeFor(role) or /login)
  │        → ok → render, sidebar shows org name
  │
  ├── POST loginAction ───────────────────────────────────────
  │     zod parse (email, password, remember, next)
  │     user = findUnique({ email })
  │     ok = user?.passwordHash && await verifyPassword(...)
  │        → !ok  → { error: "Email or password is incorrect" }
  │        → ok   → createSession(user, remember)
  │                 redirect(safeNext(next) ?? homeFor(user.role))
  │
  └── POST logoutAction ──────────────────────────────────────
        destroySession() → delete row, clear cookie → redirect("/")
```

---

## 6. Error handling

| Case | Behaviour |
|---|---|
| Unknown email | Generic *"Email or password is incorrect"* |
| Wrong password | Same message |
| User exists but `passwordHash` is null | Same message |
| Malformed input | Zod message under the field |
| Expired session row | Treated as signed out; row deleted; redirect to `/login` |
| Cookie present, row gone | Same as signed out |
| `next` param not starting with `/` | Ignored; falls back to `homeFor(role)` |

The three credential failures share one message deliberately — distinguishing
them tells an attacker which emails have accounts.

A failed login still runs a bcrypt comparison against a dummy hash when the user
doesn't exist, so response time doesn't reveal whether an email is registered.

---

## 7. Testing

The project has no test framework. This phase adds **vitest**, configured for
Node, covering the pieces where a bug is silent rather than loud:

| Test | Why |
|---|---|
| `hashPassword` → `verifyPassword` round-trip; wrong password fails | The core credential check |
| `verifyPassword` against a null/garbage hash returns false, never throws | A throw here would 500 the login page |
| `safeNext()` accepts `/owner`, rejects `//evil.com`, `https://evil.com`, `javascript:` | Open-redirect guard |
| `homeFor()` covers all four roles | A missed role would strand a user |
| Session expiry: a row with `expires` in the past reads as signed out | Sessions must actually end |

Run with `npm test`.

Flows verified by running the app, since they span middleware, layouts and
cookies:

- [ ] Log in as each of the three accounts → lands on the right home
- [ ] `/admin` signed out → redirected to `/login?next=/admin`, and after login lands on `/admin`
- [ ] `/owner` signed in as the player → redirected to `/player-home`
- [ ] Sign out → cookie cleared, `/owner` redirects to login again
- [ ] Wrong password → inline error, email preserved, no redirect
- [ ] `npm run lint` and `npm run typecheck` clean

---

## 8. Out of scope

Deliberately excluded from phase 1:

- Rate limiting on login attempts — needs a store; phase 5's concern
- Password reset / change password
- Registration — accounts come from the seed and, later, the admin users page
- OAuth and magic links
- Sliding session expiry
- CSRF tokens beyond `sameSite=lax` (Next server actions are POST-only and
  same-origin)

### Known temporary gap

`/player-home`'s saved-courts suggestions go empty this phase. `savedcourt` keys
on facility cuids while the static `COURTS` catalog keys on integers, so the two
cannot be joined yet. Phase 2 unifies the ids and the row returns. Everything
else on that page keeps working from the static catalog.

---

## 9. Definition of done

- [ ] `User.passwordHash` in the schema and pushed
- [ ] Three seeded accounts log in and land on the right home
- [ ] `/owner` and `/admin` unreachable signed out, and unreachable by the wrong role
- [ ] Sign-out works from both dashboards
- [ ] `SiteNav` reflects signed-in state
- [ ] vitest suite passes; `npm run lint` and `npm run typecheck` clean
