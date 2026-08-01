# Waitlist Database Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every submission of the "Launching across Davao in 2026" waitlist form is written to MySQL, and the admin portal shows all of it including notes, with a working CSV export.

**Architecture:** A new Prisma-backed module implements only the three waitlist methods of the existing `Storage` interface; `getStorage()` spreads it over `jsonStorage` so bookings and open plays are untouched. The pure row-to-domain mapping and CSV formatting live in a separate non-`server-only` module so `vitest` can import them without a database.

**Tech Stack:** Next.js 15 (App Router, RSC), Prisma 6 + MySQL, TypeScript, Zod, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-07-28-waitlist-database-persistence-design.md`

## Global Constraints

- **`server-only` is poison for tests.** Any module importing `"server-only"` throws when `vitest` imports it. Pure, tested helpers must live in a file that does NOT import it. This is why `src/lib/waitlist.ts` and `src/lib/server/waitlist-store.ts` are separate files.
- **The `Storage` interface does not change.** `src/lib/server/storage.ts:25-49` is the contract; the API route, the form and the admin page all speak `WaitlistEntry` from `src/lib/types.ts:88-100` (`city: string`, `sports: SportSlug[]`, `role` lowercase, `createdAt` ISO string).
- **Queue position formula is `1200 + count + 1`**, matching `src/lib/server/storage.ts:92`. Do not change the offset.
- **Prisma error checks follow `src/lib/server/auth.ts:70-72`**: `error instanceof Prisma.PrismaClientKnownRequestError && error.code === "..."`.
- **Auto-created cities get `province: "Unknown"`, `status: "WAITLIST"`.**
- **Sports are `connectOrCreate`, never plain `connect`** — `npm start` runs `prisma migrate deploy` but never seeds, so the `Sport` table can be empty in production.
- Run commands from `d:\Courtix`. Tests: `npm test`. Types: `npm run typecheck`. Lint: `npm run lint`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/waitlist.ts` | **Create.** Pure: `WaitlistRow` shape, `toWaitlistEntry`, `waitlistCsv`. No `server-only`, no Prisma import, no I/O. |
| `tests/waitlist.test.ts` | **Create.** Unit tests for both pure functions. |
| `src/lib/server/waitlist-store.ts` | **Create.** Prisma driver: city resolution, position, nested sport writes, P2002 recovery. |
| `src/lib/server/storage.ts` | **Modify.** `getStorage()` composes `jsonStorage` with `prismaWaitlist`. |
| `src/app/api/waitlist/route.ts` | **Modify.** Wrap storage calls so a database outage returns JSON 503, not an HTML error page. |
| `src/app/admin/waitlist/export/route.ts` | **Create.** Authenticated CSV download. |
| `src/app/admin/waitlist/page.tsx` | **Modify.** Render notes; point the Export CSV button at the route. |
| `.env.example` | **Modify.** Correct the stale claim that no variable is required. |

---

### Task 1: Pure waitlist helpers

The mapping and CSV logic, with no database and no `server-only`, so it is testable.

**Files:**
- Create: `src/lib/waitlist.ts`
- Test: `tests/waitlist.test.ts`

**Interfaces:**
- Consumes: `WaitlistEntry`, `WaitlistRole`, `SportSlug` from `src/lib/types.ts`.
- Produces:
  - `interface WaitlistRow` — structural shape of a `WaitlistEntry` DB row with `sports: { sportId: string }[]`.
  - `toWaitlistEntry(row: WaitlistRow): WaitlistEntry`
  - `waitlistCsv(entries: WaitlistEntry[]): string`
  - `const ROLE_TO_DB: Record<WaitlistRole, "PLAYER" | "OWNER" | "BOTH">`

- [ ] **Step 1: Write the failing tests**

Create `tests/waitlist.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ROLE_TO_DB, toWaitlistEntry, waitlistCsv, type WaitlistRow } from "@/lib/waitlist";
import type { WaitlistEntry } from "@/lib/types";

function row(over: Partial<WaitlistRow> = {}): WaitlistRow {
  return {
    id: "wl_1",
    name: "Juan dela Cruz",
    email: "juan@example.ph",
    phone: "09171234567",
    cityText: "Tagum City",
    role: "PLAYER",
    notes: null,
    position: 1201,
    createdAt: new Date("2026-07-28T02:30:00.000Z"),
    sports: [{ sportId: "pickleball" }, { sportId: "badminton" }],
    ...over,
  };
}

function entry(over: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: "wl_1",
    name: "Juan dela Cruz",
    email: "juan@example.ph",
    phone: "09171234567",
    city: "Tagum City",
    role: "player",
    sports: ["pickleball"],
    position: 1201,
    createdAt: "2026-07-28T02:30:00.000Z",
    ...over,
  };
}

describe("toWaitlistEntry", () => {
  it("maps a row onto the domain shape the app already renders", () => {
    expect(toWaitlistEntry(row())).toEqual({
      id: "wl_1",
      name: "Juan dela Cruz",
      email: "juan@example.ph",
      phone: "09171234567",
      city: "Tagum City",
      role: "player",
      sports: ["pickleball", "badminton"],
      notes: undefined,
      position: 1201,
      createdAt: "2026-07-28T02:30:00.000Z",
    });
  });

  it("lowercases every role the enum can hold", () => {
    expect(toWaitlistEntry(row({ role: "OWNER" })).role).toBe("owner");
    expect(toWaitlistEntry(row({ role: "BOTH" })).role).toBe("both");
  });

  it("turns nullable columns into undefined, not null", () => {
    const mapped = toWaitlistEntry(row({ phone: null, notes: null }));
    expect(mapped.phone).toBeUndefined();
    expect(mapped.notes).toBeUndefined();
  });

  it("keeps notes when present", () => {
    expect(toWaitlistEntry(row({ notes: "I run a Saturday league." })).notes).toBe(
      "I run a Saturday league.",
    );
  });

  it("reads sports out of the join rows", () => {
    expect(toWaitlistEntry(row({ sports: [] })).sports).toEqual([]);
  });
});

describe("ROLE_TO_DB", () => {
  it("is the exact inverse of the mapping toWaitlistEntry applies", () => {
    expect(ROLE_TO_DB).toEqual({ player: "PLAYER", owner: "OWNER", both: "BOTH" });
  });
});

describe("waitlistCsv", () => {
  it("writes a header row even when there is nothing to export", () => {
    expect(waitlistCsv([])).toBe("Position,Name,Email,Phone,City,Role,Sports,Notes,Joined");
  });

  it("writes one line per entry", () => {
    const lines = waitlistCsv([entry(), entry({ id: "wl_2", position: 1202 })]).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      "1201,Juan dela Cruz,juan@example.ph,09171234567,Tagum City,player,pickleball,,2026-07-28T02:30:00.000Z",
    );
  });

  it("quotes cells containing a comma", () => {
    const line = waitlistCsv([entry({ notes: "Tagum, Davao del Norte" })]).split("\r\n")[1];
    expect(line).toContain('"Tagum, Davao del Norte"');
  });

  it("doubles embedded quotes", () => {
    const line = waitlistCsv([entry({ notes: 'He said "book it"' })]).split("\r\n")[1];
    expect(line).toContain('"He said ""book it"""');
  });

  it("quotes cells containing a newline", () => {
    const line = waitlistCsv([entry({ notes: "line one\nline two" })]);
    expect(line).toContain('"line one\nline two"');
  });

  it("leaves blank cells for missing phone and notes", () => {
    const line = waitlistCsv([entry({ phone: undefined, notes: undefined })]).split("\r\n")[1];
    expect(line).toBe(
      "1201,Juan dela Cruz,juan@example.ph,,Tagum City,player,pickleball,,2026-07-28T02:30:00.000Z",
    );
  });

  it("separates multiple sports without breaking the column", () => {
    const line = waitlistCsv([entry({ sports: ["pickleball", "badminton"] })]).split("\r\n")[1];
    expect(line).toContain("pickleball; badminton");
  });

  it("defuses a formula so the admin's spreadsheet cannot execute it", () => {
    const line = waitlistCsv([entry({ notes: "=1+1" })]).split("\r\n")[1];
    expect(line).toContain("'=1+1");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/waitlist.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/waitlist"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/waitlist.ts`:

```ts
import type { SportSlug, WaitlistEntry, WaitlistRole } from "@/lib/types";

/**
 * Pure waitlist helpers. This module deliberately imports neither `server-only`
 * nor `@prisma/client`, so the mapping and the CSV escaping can be unit-tested
 * without a database — see `tests/waitlist.test.ts`.
 */

/** The DB enum values, as the `WaitlistRole` enum in prisma/schema.prisma spells them. */
export type WaitlistRoleDb = "PLAYER" | "OWNER" | "BOTH";

/**
 * Structural shape of a `WaitlistEntry` row loaded with its sport join rows.
 * Declared by hand rather than derived from Prisma so this file stays free of
 * the client import.
 */
export interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cityText: string;
  role: WaitlistRoleDb;
  notes: string | null;
  position: number;
  createdAt: Date;
  sports: { sportId: string }[];
}

export const ROLE_TO_DB: Record<WaitlistRole, WaitlistRoleDb> = {
  player: "PLAYER",
  owner: "OWNER",
  both: "BOTH",
};

const ROLE_FROM_DB: Record<WaitlistRoleDb, WaitlistRole> = {
  PLAYER: "player",
  OWNER: "owner",
  BOTH: "both",
};

/**
 * A database row as the rest of the app already expects it: the free-text city
 * rather than the linked one, lowercase role, sport slugs, ISO timestamp.
 * Nullable columns become `undefined` because `WaitlistEntry` marks them
 * optional, and `null` would render as the word "null".
 */
export function toWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    city: row.cityText,
    role: ROLE_FROM_DB[row.role],
    sports: row.sports.map((s) => s.sportId as SportSlug),
    notes: row.notes ?? undefined,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

const CSV_HEADERS = [
  "Position",
  "Name",
  "Email",
  "Phone",
  "City",
  "Role",
  "Sports",
  "Notes",
  "Joined",
];

/**
 * RFC 4180 CSV, CRLF-delimited, for the admin export.
 *
 * `notes` is free text a stranger typed, so it drives both escaping rules here:
 * quoting for commas/quotes/newlines, and the leading apostrophe on anything
 * starting with a formula character — otherwise opening the download in Excel
 * would execute it.
 */
export function waitlistCsv(entries: WaitlistEntry[]): string {
  const rows = entries.map((e) => [
    String(e.position),
    e.name,
    e.email,
    e.phone ?? "",
    e.city,
    e.role,
    e.sports.join("; "),
    e.notes ?? "",
    e.createdAt,
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string): string {
  const defused = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(defused) ? `"${defused.replace(/"/g, '""')}"` : defused;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/waitlist.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/waitlist.ts tests/waitlist.test.ts
git commit -m "feat(waitlist): add pure row mapping and CSV helpers"
```

---

### Task 2: The Prisma waitlist driver

**Files:**
- Create: `src/lib/server/waitlist-store.ts`
- Modify: `src/lib/server/storage.ts` (the `getStorage` function, lines 167-175)

**Interfaces:**
- Consumes: `toWaitlistEntry`, `ROLE_TO_DB`, `WaitlistRow` from Task 1; `db` from `src/lib/server/db.ts`; `SPORTS` from `src/lib/data/sports.ts`; the `Storage` type from `src/lib/server/storage.ts`.
- Produces: `prismaWaitlist: Pick<Storage, "listWaitlist" | "findWaitlistByEmail" | "addWaitlist">`

There is no unit test here. Mocking a Prisma transaction would assert the mock, not MySQL; this task is verified live in Task 6.

- [ ] **Step 1: Write the driver**

Create `src/lib/server/waitlist-store.ts`:

```ts
import "server-only";

import { Prisma } from "@prisma/client";

import { SPORTS } from "@/lib/data/sports";
import { db } from "@/lib/server/db";
import { ROLE_TO_DB, toWaitlistEntry } from "@/lib/waitlist";
import type { Storage } from "@/lib/server/storage";
import type { SportSlug } from "@/lib/types";

/**
 * The MySQL half of `Storage`. Only the waitlist lives here; bookings and
 * open-play joins are still served by the JSON driver in `storage.ts`, which
 * spreads this object over itself.
 *
 * `import type { Storage }` is erased at compile time, so the two modules
 * referencing each other is a type-level cycle only.
 */
type WaitlistStore = Pick<Storage, "listWaitlist" | "findWaitlistByEmail" | "addWaitlist">;

/** Every read returns the sport join rows — `toWaitlistEntry` requires them. */
const WITH_SPORTS = { sports: { select: { sportId: true } } } as const;

/**
 * The pitch demo has always reported a queue that already has weight, and
 * visitors have been handed numbers from this range. Changing it would make a
 * position someone screenshotted disagree with the one in the database.
 */
const POSITION_OFFSET = 1200;

/** Prisma's unique-constraint violation. Mirrors `isRecordNotFound` in auth.ts. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * `npm start` runs `prisma migrate deploy` and never seeds, so a production
 * database can have an empty `Sport` table. Sports are catalog constants rather
 * than transactional data, so the first signup mentioning one may create it —
 * from the same source `prisma/seed.ts` reads, so the two can't disagree.
 */
function sportSeed(slug: SportSlug) {
  const sport = SPORTS.find((s) => s.slug === slug);
  if (!sport) throw new Error(`Unknown sport slug: ${slug}`);

  return {
    id: sport.slug,
    name: sport.name,
    unitLabel: sport.unitLabel,
    unitLabelPlural: sport.unitLabelPlural,
    fromPriceCents: Math.round(sport.fromPrice * 100),
  };
}

/**
 * Link the typed city to a `City` row so the launch-order reports can join on
 * it. MySQL's default collation is case-insensitive, so "tagum city" finds the
 * seeded "Tagum City" and inherits its real province; anything unrecognised
 * gets a new row with `province: "Unknown"` for an admin to correct later.
 *
 * The raw text is stored in `cityText` either way — a mis-link must never lose
 * what the visitor actually wrote.
 */
async function resolveCityId(tx: Prisma.TransactionClient, cityText: string): Promise<string> {
  const existing = await tx.city.findFirst({ where: { name: cityText }, select: { id: true } });
  if (existing) return existing.id;

  const created = await tx.city.create({
    data: { name: cityText, province: "Unknown", status: "WAITLIST" },
    select: { id: true },
  });
  return created.id;
}

export const prismaWaitlist: WaitlistStore = {
  async listWaitlist() {
    const rows = await db.waitlistEntry.findMany({
      include: WITH_SPORTS,
      orderBy: { position: "asc" },
    });
    return rows.map(toWaitlistEntry);
  },

  async findWaitlistByEmail(email) {
    const row = await db.waitlistEntry.findUnique({
      where: { email: email.toLowerCase() },
      include: WITH_SPORTS,
    });
    return row ? toWaitlistEntry(row) : undefined;
  },

  async addWaitlist(entry) {
    try {
      return await db.$transaction(async (tx) => {
        const cityId = await resolveCityId(tx, entry.city);
        const position = POSITION_OFFSET + (await tx.waitlistEntry.count()) + 1;

        const row = await tx.waitlistEntry.create({
          data: {
            name: entry.name,
            email: entry.email.toLowerCase(),
            phone: entry.phone || null,
            cityText: entry.city,
            cityId,
            role: ROLE_TO_DB[entry.role],
            notes: entry.notes || null,
            position,
            sports: {
              create: entry.sports.map((slug) => ({
                sport: {
                  connectOrCreate: { where: { id: slug }, create: sportSeed(slug) },
                },
              })),
            },
          },
          include: WITH_SPORTS,
        });

        return toWaitlistEntry(row);
      });
    } catch (error) {
      // The route checks for an existing email first, but two submissions of
      // the same address milliseconds apart both pass that check. Hand back the
      // row that won rather than failing the one that lost — the visitor gets
      // their real queue position either way.
      if (isUniqueViolation(error)) {
        const existing = await prismaWaitlist.findWaitlistByEmail(entry.email);
        if (existing) return existing;
      }
      throw error;
    }
  },
};
```

- [ ] **Step 2: Wire it into `getStorage()`**

In `src/lib/server/storage.ts`, add the import below the existing `import type` line at the top:

```ts
import { prismaWaitlist } from "@/lib/server/waitlist-store";
```

Then replace the whole `getStorage` function at the bottom of the file:

```ts
/**
 * The waitlist is served from MySQL unconditionally — `auth.ts` and
 * `catalog.ts` already require `DATABASE_URL`, so an env flag here could only
 * ever fail one way: unset in production, signups silently appended to a file
 * that the next deploy discards.
 *
 * Bookings and open-play joins are still JSON; `STORAGE_DRIVER` governs those
 * alone until they follow.
 */
export function getStorage(): Storage {
  switch (process.env.STORAGE_DRIVER) {
    // case "firebase": return { ...firebaseStorage, ...prismaWaitlist };  // Phase 2
    case "json":
    default:
      return { ...jsonStorage, ...prismaWaitlist };
  }
}
```

Leave `jsonStorage`'s three waitlist methods in place. They are overridden by the spread, but removing them would break the `Storage` conformance that documents the swap point; they go when bookings follow.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors. If `Prisma.TransactionClient` is unresolved, run `npx prisma generate` first — the client must be generated from the current schema.

- [ ] **Step 4: Confirm the existing tests still pass**

Run: `npm test`
Expected: PASS. Nothing under `tests/` imports `storage.ts`, so this is a regression check only.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/waitlist-store.ts src/lib/server/storage.ts
git commit -m "feat(waitlist): persist signups to MySQL instead of a JSON file"
```

---

### Task 3: Survive a database outage

Without this, a dropped connection returns Next's HTML error page, `res.json()` throws in `WaitlistForm.tsx:70`, and the visitor is told to check their internet connection — which is not the problem.

**Files:**
- Modify: `src/app/api/waitlist/route.ts`

**Interfaces:**
- Consumes: `getStorage()` from Task 2.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Wrap the POST body**

In `src/app/api/waitlist/route.ts`, replace everything from `const storage = getStorage();` down to the closing brace of `POST`:

```ts
  try {
    const storage = getStorage();

    const existing = await storage.findWaitlistByEmail(data.email);
    if (existing) {
      return NextResponse.json({ position: existing.position, alreadyJoined: true });
    }

    const entry = await storage.addWaitlist({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      city: data.city,
      role: data.role,
      sports: data.sports as SportSlug[],
      notes: data.notes || undefined,
    });

    return NextResponse.json({ position: entry.position, alreadyJoined: false }, { status: 201 });
  } catch (error) {
    // The signup did not save. Say so plainly — the form's own catch block only
    // fires on a network failure, and blaming the visitor's connection for our
    // database being down sends them to reset their router.
    console.error("waitlist: failed to store signup", error);
    return NextResponse.json(
      { message: "We couldn't save your spot right now. Please try again in a moment." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 2: Wrap the GET body**

Replace the body of `GET` in the same file:

```ts
export async function GET() {
  try {
    const entries = await getStorage().listWaitlist();

    const byCity: Record<string, number> = {};
    const bySport: Record<string, number> = {};
    for (const e of entries) {
      byCity[e.city] = (byCity[e.city] ?? 0) + 1;
      for (const s of e.sports) bySport[s] = (bySport[s] ?? 0) + 1;
    }

    return NextResponse.json({
      total: entries.length,
      byCity,
      bySport,
    });
  } catch (error) {
    console.error("waitlist: failed to read counts", error);
    return NextResponse.json({ message: "Waitlist counts are unavailable." }, { status: 503 });
  }
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/waitlist/route.ts
git commit -m "fix(waitlist): return a JSON 503 when the database is unreachable"
```

---

### Task 4: Admin CSV export route

**Files:**
- Create: `src/app/admin/waitlist/export/route.ts`

**Interfaces:**
- Consumes: `waitlistCsv` from Task 1, `getStorage()` from Task 2, `requireRole` from `src/lib/server/auth.ts:98`.
- Produces: `GET /admin/waitlist/export`, consumed by Task 5's anchor.

- [ ] **Step 1: Write the route handler**

Create `src/app/admin/waitlist/export/route.ts`:

```ts
import { requireRole } from "@/lib/server/auth";
import { getStorage } from "@/lib/server/storage";
import { waitlistCsv } from "@/lib/waitlist";

/**
 * The admin waitlist download. Built server-side because the alternative —
 * serialising every entry into the client bundle for the browser to format —
 * would put the whole list's names, emails and phone numbers in the page source.
 *
 * Route handlers do not run `admin/layout.tsx`, so the role gate is explicit.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("ADMIN", "SUPER_ADMIN");

  const entries = await getStorage().listWaitlist();
  const today = new Date().toISOString().slice(0, 10);

  return new Response(waitlistCsv(entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="courtix-waitlist-${today}.csv"`,
    },
  });
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/waitlist/export/route.ts
git commit -m "feat(admin): export the waitlist as CSV"
```

---

### Task 5: Show notes, and arm the export button

`notes` is the one field a visitor fills that the admin table never shows.

**Files:**
- Modify: `src/app/admin/waitlist/page.tsx` (line 32, and the `All signups` table body around lines 96-119)

**Interfaces:**
- Consumes: `GET /admin/waitlist/export` from Task 4.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Point the button at the route**

Replace line 32 of `src/app/admin/waitlist/page.tsx`:

```tsx
        action={
          <a className="btn btn-ghost" href="/admin/waitlist/export">
            Export CSV
          </a>
        }
```

- [ ] **Step 2: Render notes under the name**

In the `All signups` table, replace the `<Td>{e.name}</Td>` cell:

```tsx
                  <Td>
                    {e.name}
                    {e.notes && (
                      <span
                        className="mt-0.5 line-clamp-2 block max-w-[260px] text-[10.5px] leading-snug text-muted"
                        title={e.notes}
                      >
                        {e.notes}
                      </span>
                    )}
                  </Td>
```

Same treatment the phone number already gets under the email column. Clamped to two lines with the full text in `title`, because `notes` can be 600 characters and most entries have none.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/waitlist/page.tsx
git commit -m "feat(admin): show waitlist notes and wire up the CSV download"
```

---

### Task 6: Correct the environment docs, then verify end to end

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Fix `.env.example`**

The file currently claims "Nothing here is required for the local JSON-store demo to run" and files `DATABASE_URL` under `# --- Postgres (only when STORAGE_DRIVER=postgres) ---`. Both were already false — login needs the database — and the waitlist now does too. Replace lines 1-23:

```
# ---------------------------------------------------------------
# Courtix environment variables
# Copy to `.env.local` and fill in. DATABASE_URL is required: login,
# the city catalog and the launch waitlist all read MySQL directly.
# ---------------------------------------------------------------

# Public site URL, used for absolute links in emails / metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# MySQL connection string. Apply the schema with `npm run db:deploy`,
# then load the catalog with `npm run db:seed`.
DATABASE_URL=mysql://user:pass@localhost:3306/courtix

# Which adapter bookings and open-play joins use. The waitlist ignores
# this — it is always MySQL.
#   json     -> data/*.json on disk (default, zero config)
#   firebase -> Firestore (see BOOKING_INTEGRATION_PLAN.md, Phase 2)
STORAGE_DRIVER=json

# --- Firebase (only when STORAGE_DRIVER=firebase) ---
# NEXT_PUBLIC_FIREBASE_API_KEY=
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# FIREBASE_SERVICE_ACCOUNT_KEY=
```

- [ ] **Step 2: Run the full check suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 3: Verify a real signup lands in MySQL**

Requires a reachable `DATABASE_URL`.

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Then, in a second shell:

```bash
curl -s -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Player","email":"test.player@example.ph","phone":"09171234567","city":"Tagum City","role":"both","sports":["pickleball","badminton"],"notes":"Saturday league of 16, we struggle to find courts."}'
```

Expected: `{"position":1201,"alreadyJoined":false}` with HTTP 201.

Run it a second time unchanged.
Expected: `{"position":1201,"alreadyJoined":true}` — the duplicate-email path.

- [ ] **Step 4: Verify the row, not just the response**

```bash
npm run db:studio
```

In `WaitlistEntry`, confirm the row holds: `name`, `email` lowercased, `phone`, `cityText` = "Tagum City", a non-null `cityId`, `role` = `BOTH`, the full `notes` text, `position` = 1201. Confirm two `WaitlistSport` rows point at it.

Then open `http://localhost:3000/admin/waitlist` signed in as an admin. Confirm the entry appears with the notes line under the name, and that clicking **Export CSV** downloads a file whose row matches.

- [ ] **Step 5: Confirm the JSON file is no longer written**

```bash
git status data/
```

Expected: `data/waitlist.json` unchanged — the submissions above went to MySQL.

- [ ] **Step 6: Commit**

```bash
git add .env.example
git commit -m "docs: DATABASE_URL is required, and STORAGE_DRIVER no longer covers the waitlist"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| 1. Architecture — new module, spread composition | 2 |
| 2. Writing an entry — city, position, connectOrCreate, field mapping | 2 |
| 3. Error handling — P2002 recovery | 2 |
| 3. Error handling — JSON 503 on outage | 3 |
| 4. Admin — notes | 5 |
| 4. Admin — CSV export | 4, 5 |
| 5. Testing — `toWaitlistEntry`, `toCsv` (named `waitlistCsv` here) | 1 |
| 5. Testing — live verification | 6 |
| 6. Documentation — `.env.example` | 6 |

The spec calls the CSV helper `toCsv`; this plan names it `waitlistCsv`, because it formats waitlist entries specifically rather than arbitrary rows. Every task uses the latter name.

**Type consistency**

`WaitlistRow`, `toWaitlistEntry`, `ROLE_TO_DB` and `waitlistCsv` are defined in Task 1 and used with those exact names and signatures in Tasks 2 and 4. `prismaWaitlist` is defined in Task 2 and imported under that name in the same task's `storage.ts` edit. `GET /admin/waitlist/export` is created in Task 4 and linked in Task 5.

**Placeholders:** none — every code step carries complete code.
