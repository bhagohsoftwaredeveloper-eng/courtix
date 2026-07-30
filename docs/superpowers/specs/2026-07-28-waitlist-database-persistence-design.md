# Courtix — Waitlist persistence to MySQL

**Date:** 2026-07-28
**Status:** approved, ready for implementation planning

A slice of Phase 2 of the five-phase plan in
`2026-07-25-auth-and-login-design.md`. It cuts the launch waitlist over to
MySQL and leaves bookings and open-play joins on the JSON driver. Nothing here
touches availability or the booking POST.

---

## Context

The CTA form under the "Launching across Davao in 2026" eyebrow
(`src/components/WaitlistForm.tsx`, rendered on `/` and `/waitlist`) collects
name, email, phone, city, role, sports and notes. `POST /api/waitlist`
validates it with `waitlistSchema`, drops honeypot hits, and hands the result to
`getStorage().addWaitlist()`.

`getStorage()` returns `jsonStorage`, which appends to `data/waitlist.json`.

The tables the entry belongs in already exist. `WaitlistEntry` and
`WaitlistSport` are in `prisma/schema.prisma` and were created by the `0_init`
migration, which `npm start` applies on every deploy. They have never held a
row.

### Why this matters now

Render's filesystem is ephemeral. Every deploy discards `data/waitlist.json`,
so each signup collected so far has already been lost or is about to be. The
form reports a queue position to the visitor and stores nothing durable behind
it.

### Decisions taken during brainstorming

- **Waitlist only.** Bookings and open-play joins stay on JSON; moving them
  means the `BookingSlot` uniqueness constraint, facility and court-unit
  lookups, and `Payment` rows — a much larger change.
- **No `STORAGE_DRIVER` flag for the waitlist.** `src/lib/server/auth.ts` and
  `src/lib/server/catalog.ts` already call `db` unconditionally, so the app
  cannot run without `DATABASE_URL` regardless. A flag whose unset state
  silently writes to a file that disappears on deploy is a data-loss trap, not
  flexibility.
- **Auto-create the `City` row** when the typed city matches nothing.
- **Keep the 1200 queue offset** the JSON driver uses, so no visitor sees the
  number they were given change.
- **Do not migrate `data/waitlist.json`.** It holds test submissions. The file
  stays on disk, unread.
- **Admin gains notes and a working CSV export.**

---

## 1. Architecture

A new `src/lib/server/waitlist-store.ts` exports `prismaWaitlist`, implementing
the three waitlist methods of the existing `Storage` interface —
`listWaitlist`, `findWaitlistByEmail`, `addWaitlist`.

`getStorage()` composes the two drivers:

```ts
return { ...jsonStorage, ...prismaWaitlist };
```

The interface, the API route, the form and the admin page keep working against
the same `WaitlistEntry` domain type (`src/lib/types.ts`): `city` is a string,
`sports` is `SportSlug[]`, `createdAt` is an ISO string, `role` is lowercase.
Translating Prisma rows into that shape is the entirety of the new module's
job, which is what keeps the change confined to one file plus the one-line
composition.

`jsonStorage` keeps its three waitlist methods. They become dead code the
moment the spread above overrides them, but deleting them would break the
`Storage` interface conformance that documents the swap point. They go when
bookings follow the waitlist to MySQL.

---

## 2. Writing an entry

`addWaitlist` runs inside `db.$transaction`:

**Resolve the city.** `city.findFirst({ where: { name: cityText } })`. MySQL's
default collation is case- and accent-insensitive, so `tagum city` matches the
seeded `Tagum City` row and inherits its real province. On a miss, create
`{ name: cityText, province: "Unknown", status: WAITLIST }`.

The typed text is always stored in `cityText` as well, so a mis-linked or
misspelled city never destroys what the visitor actually wrote.

**Compute the position.** `1200 + (await tx.waitlistEntry.count()) + 1`. Inside
the transaction, so two concurrent signups cannot read the same count.

**Insert.** One `waitlistEntry.create` with nested `WaitlistSport` rows. Each
nested row uses `connectOrCreate` on `Sport`, supplying `name`, `unitLabel` and
`unitLabelPlural` from `src/lib/data/sports.ts` — the same source `prisma/seed.ts`
reads.

That `connectOrCreate` is deliberate. `package.json`'s `start` script is
`prisma migrate deploy && next start`; it never seeds. A production database
can therefore have an empty `Sport` table, and a plain `connect` would fail the
foreign key on the first real signup. Sports are catalog constants, not
transactional data, so creating one on demand is safe and idempotent.

**Field mapping**

| Form field | Column |
|---|---|
| `name` | `name` |
| `email` | `email` (unique, lowercased by the zod schema) |
| `phone` | `phone`, null when blank |
| `city` | `cityText`, plus `cityId` when resolved |
| `role` | `role` — `player`/`owner`/`both` → `PLAYER`/`OWNER`/`BOTH` |
| `sports` | `WaitlistSport` rows |
| `notes` | `notes`, null when blank |
| — | `position`, `createdAt` |

`website` is the honeypot and is discarded by the route before storage is
reached. `userId` stays null until a signup becomes a real account.

---

## 3. Error handling

**Duplicate email.** The route calls `findWaitlistByEmail` first and returns
`alreadyJoined` on a hit. Two submissions of the same address milliseconds
apart still race past that check and hit the unique constraint. `addWaitlist`
catches Prisma's `P2002`, re-reads the row by email, and returns it. The
visitor gets the correct queue position; the response says
`alreadyJoined: false` where a stricter reading would say `true`. Accepted:
the window is milliseconds wide, and the alternative — teaching the route to
recognise Prisma error codes — leaks the driver through the interface that
exists to hide it.

**Database unreachable.** `POST` and `GET /api/waitlist` currently have no
`try`/`catch` around the storage call. A dropped connection returns Next's HTML
error page, `res.json()` throws in the browser, and the form falls through to
its network-failure branch. Both handlers get a `try`/`catch` returning a JSON
503 with a plain message, so the visitor is told the signup did not save rather
than being shown a generic connection error.

---

## 4. Admin portal

`/admin/waitlist` reads `getStorage().listWaitlist()` and is already guarded by
`requireRole("ADMIN", "SUPER_ADMIN")` in the admin layout. It starts showing
database rows with no change at all. Two additions:

**Notes.** The one submitted field the table omits. It renders under the
visitor's name as muted small text, clamped to two lines with the full value in
a `title` attribute — the pattern the phone number already uses under the email
column. Most entries have none, so it costs nothing when empty.

**CSV export.** The `Export CSV` button is presently decorative. It becomes an
anchor pointing at a new `GET /admin/waitlist/export` route handler that calls
`requireRole`, builds the CSV server-side, and responds `text/csv` with
`Content-Disposition: attachment`. Columns: position, name, email, phone, city,
role, sports, notes, joined.

Server-side because the alternative — serialising every entry into the client
bundle for the browser to format — would ship the whole waitlist's personal
data into the page source. The identical dead buttons on `/admin/users` and
`/owner/bookings` are out of scope.

---

## 5. Testing

`vitest` runs without a database, so the logic worth testing is extracted into
two pure functions and tested directly:

- **`toWaitlistEntry(row)`** — Prisma row to domain object. Covers the role
  enum downcast, `cityText` to `city`, `sports` relation to `SportSlug[]`, null
  `phone`/`notes` to `undefined`, and `Date` to ISO string.
- **`toCsv(entries)`** — covers the escaping that free-text `notes` guarantees
  will be exercised: embedded commas, double quotes, newlines.

The transactional parts (city resolution, position, `connectOrCreate`) are not
unit-tested; mocking a Prisma transaction would assert the mock's behaviour
rather than the database's. They are verified by submitting the live form and
reading the row back through `/admin/waitlist` and `npm run db:studio`.

---

## 6. Documentation

`.env.example` currently opens with "Nothing here is required for the local
JSON-store demo to run" and lists `DATABASE_URL` under
`# --- Postgres (only when STORAGE_DRIVER=postgres) ---`. Both statements are
already false — login needs the database — and this change makes them more so.
The file is corrected to present `DATABASE_URL` as a required MySQL connection
string and to scope `STORAGE_DRIVER` to bookings and open plays, which is all
it still governs.

---

## Out of scope

Bookings and open-play joins on MySQL; deleting `jsonStorage`; the
`data/waitlist.json` backfill; emailing signups; linking a `WaitlistEntry` to a
`User` on registration; `waitlistRank` ordering for launch sequencing; the dead
CSV buttons elsewhere in the admin and owner dashboards.
