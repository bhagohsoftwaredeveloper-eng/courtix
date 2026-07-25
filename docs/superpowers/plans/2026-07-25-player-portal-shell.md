# Player Portal Chunk A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give players a real `/account` portal — sidebar shell, a dashboard of eight metrics, and an editable profile.

**Architecture:** `/account` reuses the `DashSidebar` that already serves `/owner` and `/admin`, extended to support titled sections. Dashboard metrics are computed by pure functions over the player's bookings and open-play joins, read through the existing `getStorage()` seam so the phase 2 Prisma cutover changes no page here. Profile reads and writes MySQL directly through a server action.

**Tech Stack:** Next.js 15 (App Router, React 19 server actions), Prisma 6 + MySQL, zod 3, Tailwind 4, vitest.

**Spec:** [`docs/superpowers/specs/2026-07-25-player-portal-shell-design.md`](../specs/2026-07-25-player-portal-shell-design.md)

## Global Constraints

- Working directory is `d:\Courtix`, branch `feat/auth-login`. Shell is PowerShell; `&&` is unavailable — chain with `;` or use the Bash tool.
- Booking and open-play data is read ONLY through `getStorage()`. Never import Prisma for those two. Profile, city and session data read Prisma directly.
- Money stays integer centavos; times of day stay integer 24h hours; dates stay `YYYY-MM-DD` strings.
- Every surface showing a calorie figure must carry the exact text: **"Estimated from session length and sport."**
- Calorie rates are exactly: `pickleball: 500`, `badminton: 450`, `basketball: 580`, `golf: 250` kcal/hour.
- The sidebar and the avatar dropdown must only link to pages that exist in this chunk. Chunk A ships: Your account → Player Dashboard, Edit Profile; Quick actions → Book a Court (`/courts`), Join Open Play (`/open-plays`). The Support & Legal section is NOT rendered.
- All three portals share one sidebar and one user card. Owner and admin gain the card too; their nav links, order and behaviour must not change.
- `DashSidebar` takes a short `role` badge ("Player" | "Owner" | "Super Admin") and an optional `subtitle` line for the organization name. Never cram the org name into the badge.
- Reuse existing Tailwind conventions — `panel`, `btn btn-solid`, `btn btn-ghost`, `field`, `field-label`, `text-muted`, `text-ball-yellow`, `border-line-white/8`, `status-chip`. Invent no new design language.
- Never log a password, hash or session token.
- Comments explain *why*, not *what*.
- If git complains about identity: `git -c user.name="Courtix" -c user.email="rextechpos@gmail.com" commit ...`

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/player-stats.ts` | Pure metrics: `PlayerSession`, `playerSessions`, `playerStats`, `caloriesFor`, `isoWeek`. No `next`/Prisma imports, so vitest loads it directly. |
| `src/lib/server/catalog.ts` | `listLiveCities()` — the only DB read the profile form needs beyond the player. |
| `src/app/account/layout.tsx` | Portal shell: `requireUser()` + sidebar. |
| `src/app/account/page.tsx` | Dashboard: eight tiles + two progress panels. |
| `src/app/account/profile/page.tsx` | Edit Profile server component. |
| `src/app/account/profile/ProfileForm.tsx` | Client form with inline field errors. |
| `src/app/account/profile/schema.ts` | zod schema shared by form and action. |
| `src/app/account/profile/actions.ts` | `saveProfileAction`. |
| `src/components/AccountMenu.tsx` | Client avatar dropdown for the top nav. |
| `tests/player-stats.test.ts` | Metrics tests. |
| `tests/format.test.ts` | `initialsOf` tests. |

**Modified**

| File | Change |
|---|---|
| `src/lib/format.ts` | add `initialsOf` |
| `src/components/dashboard/DashSidebar.tsx` | `items` → `sections`; user card with avatar and role badge |
| `src/components/dashboard/parts.tsx` | add `StatGrid` / `StatTile` |
| `src/app/owner/layout.tsx`, `src/app/admin/layout.tsx` | pass a single untitled section |
| `src/lib/server/player.ts` | add `getProfileForm()` |
| `src/components/SiteNav.tsx` | render `AccountMenu` |
| `src/app/(site)/layout.tsx` | pass name + email + href to the nav |
| `src/lib/auth-routes.ts` | `homeFor("PLAYER")` → `/account` |
| `src/middleware.ts` | matcher `/player-home` → `/account/:path*` |
| `src/components/SiteFooter.tsx` | "Your home" → `/account` |
| `src/app/(site)/player-home/page.tsx` | becomes a permanent redirect |
| `tests/auth-routes.test.ts` | `homeFor("PLAYER")` expectation |

---

## Task 1: Pure metrics and helpers

Everything the dashboard computes, with no framework or database imports, so it is fully unit-testable.

**Files:**
- Create: `src/lib/player-stats.ts`
- Create: `tests/player-stats.test.ts`
- Create: `tests/format.test.ts`
- Modify: `src/lib/format.ts`

**Interfaces:**
- Consumes: `Booking`, `OpenPlay`, `OpenPlayJoin`, `SportSlug` from `@/lib/types`
- Produces:
  - `KCAL_PER_HOUR: Record<SportSlug, number>`
  - `caloriesFor(sport: SportSlug, hours: number): number`
  - `isoWeek(iso: string): string`
  - `interface PlayerSession { kind: "booking" | "open-play"; sport: SportSlug; courtId: number; date: string; hours: number; past: boolean }`
  - `interface PlayerStats { totalBookings; upcoming; openPlays; hoursPlayed; totalSessions; weekStreak; calThisMonth; avgCalPerSession; courtsExplored }` — all `number`
  - `playerSessions(bookings: Booking[], joins: OpenPlayJoin[], openPlays: OpenPlay[], email: string, today: string): PlayerSession[]`
  - `playerStats(sessions: PlayerSession[], today: string): PlayerStats`
  - `initialsOf(name: string): string` from `@/lib/format`

- [ ] **Step 1: Write the failing tests**

Create `tests/player-stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  caloriesFor,
  isoWeek,
  playerSessions,
  playerStats,
  type PlayerSession,
} from "@/lib/player-stats";
import type { Booking, OpenPlay, OpenPlayJoin } from "@/lib/types";

const TODAY = "2026-07-25"; // a Saturday, ISO week 2026-W30

function booking(over: Partial<Booking> = {}): Booking {
  return {
    ref: "CTX-AAA111",
    courtId: 1,
    courtName: "Kitchen Line Club",
    sport: "pickleball",
    date: "2026-07-20",
    startHour: 18,
    hours: 2,
    unitIndex: 0,
    unitLabel: "Court 1",
    playerName: "Jomar Reyes",
    playerEmail: "jomar.r@example.ph",
    playerPhone: "09171234567",
    subtotal: 700,
    serviceFee: 42,
    total: 742,
    status: "confirmed",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function play(over: Partial<OpenPlay> = {}): OpenPlay {
  return {
    id: "op-1",
    title: "Morning Dinkers",
    courtId: 5,
    courtName: "Sunrise Courts",
    city: "Panabo City",
    sport: "badminton",
    date: "2026-07-22",
    startHour: 7,
    hours: 2,
    pricePerPlayer: 150,
    capacity: 8,
    seededJoined: 0,
    skill: "All Levels",
    organizer: "Sunrise Sports Collective",
    fastPay: true,
    ...over,
  };
}

function join(over: Partial<OpenPlayJoin> = {}): OpenPlayJoin {
  return {
    id: "opj-1",
    openPlayId: "op-1",
    playerName: "Jomar Reyes",
    playerEmail: "jomar.r@example.ph",
    playerPhone: "09171234567",
    waitlisted: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("caloriesFor", () => {
  it("multiplies the sport's rate by the hours played", () => {
    expect(caloriesFor("pickleball", 2)).toBe(1000);
    expect(caloriesFor("badminton", 1)).toBe(450);
    expect(caloriesFor("basketball", 1.5)).toBe(870);
    expect(caloriesFor("golf", 2)).toBe(500);
  });
});

describe("isoWeek", () => {
  it("groups days of the same Monday-start week together", () => {
    // 2026-07-20 is a Monday, 2026-07-26 the following Sunday.
    expect(isoWeek("2026-07-20")).toBe(isoWeek("2026-07-26"));
  });

  it("separates adjacent weeks", () => {
    expect(isoWeek("2026-07-19")).not.toBe(isoWeek("2026-07-20"));
  });
});

describe("playerSessions", () => {
  it("keeps the player's own bookings and marks past ones", () => {
    const out = playerSessions([booking()], [], [], "jomar.r@example.ph", TODAY);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "booking", sport: "pickleball", courtId: 1, hours: 2, past: true });
  });

  it("matches the email case-insensitively", () => {
    expect(playerSessions([booking()], [], [], "JOMAR.R@Example.PH", TODAY)).toHaveLength(1);
  });

  it("drops other players' bookings", () => {
    expect(playerSessions([booking({ playerEmail: "someone@else.ph" })], [], [], "jomar.r@example.ph", TODAY))
      .toHaveLength(0);
  });

  it("drops cancelled bookings", () => {
    expect(playerSessions([booking({ status: "cancelled" })], [], [], "jomar.r@example.ph", TODAY))
      .toHaveLength(0);
  });

  it("treats a booking dated today as upcoming, not past", () => {
    const out = playerSessions([booking({ date: TODAY })], [], [], "jomar.r@example.ph", TODAY);
    expect(out[0].past).toBe(false);
  });

  it("includes confirmed open-play joins, taking details from the session", () => {
    const out = playerSessions([], [join()], [play()], "jomar.r@example.ph", TODAY);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "open-play", sport: "badminton", courtId: 5, hours: 2, past: true });
  });

  it("drops waitlisted joins — a seat you never got is not a session", () => {
    expect(playerSessions([], [join({ waitlisted: true })], [play()], "jomar.r@example.ph", TODAY))
      .toHaveLength(0);
  });

  it("drops joins whose open play no longer exists", () => {
    expect(playerSessions([], [join({ openPlayId: "gone" })], [play()], "jomar.r@example.ph", TODAY))
      .toHaveLength(0);
  });
});

describe("playerStats", () => {
  const sessions: PlayerSession[] = [
    { kind: "booking",   sport: "pickleball", courtId: 1, date: "2026-07-20", hours: 2, past: true },
    { kind: "booking",   sport: "pickleball", courtId: 1, date: "2026-07-28", hours: 1, past: false },
    { kind: "open-play", sport: "badminton",  courtId: 5, date: "2026-07-22", hours: 2, past: true },
  ];

  it("counts bookings, upcoming and open plays separately", () => {
    const s = playerStats(sessions, TODAY);
    expect(s.totalBookings).toBe(2);
    expect(s.upcoming).toBe(1);
    expect(s.openPlays).toBe(1);
  });

  it("sums hours and sessions over past sessions only", () => {
    const s = playerStats(sessions, TODAY);
    expect(s.hoursPlayed).toBe(4);
    expect(s.totalSessions).toBe(2);
  });

  it("sums this month's calories and averages per past session", () => {
    const s = playerStats(sessions, TODAY);
    // 2h pickleball = 1000, 2h badminton = 900
    expect(s.calThisMonth).toBe(1900);
    expect(s.avgCalPerSession).toBe(950);
  });

  it("excludes other months from Cal This Month", () => {
    const s = playerStats(
      [{ kind: "booking", sport: "pickleball", courtId: 1, date: "2026-06-20", hours: 2, past: true }],
      TODAY,
    );
    expect(s.calThisMonth).toBe(0);
  });

  it("counts distinct courts across all sessions", () => {
    expect(playerStats(sessions, TODAY).courtsExplored).toBe(2);
  });

  it("returns zeros rather than NaN when there are no sessions", () => {
    const s = playerStats([], TODAY);
    expect(s.avgCalPerSession).toBe(0);
    expect(s.hoursPlayed).toBe(0);
    expect(s.weekStreak).toBe(0);
    expect(s.courtsExplored).toBe(0);
  });
});

describe("playerStats week streak", () => {
  const past = (date: string): PlayerSession =>
    ({ kind: "booking", sport: "pickleball", courtId: 1, date, hours: 1, past: true });

  it("counts the current week alone as 1", () => {
    expect(playerStats([past("2026-07-21")], TODAY).weekStreak).toBe(1);
  });

  it("counts consecutive weeks", () => {
    // current week, the one before, and the one before that
    expect(playerStats([past("2026-07-21"), past("2026-07-14"), past("2026-07-07")], TODAY).weekStreak).toBe(3);
  });

  it("stops at the first gap week", () => {
    // current week and two weeks ago, but nothing in between
    expect(playerStats([past("2026-07-21"), past("2026-07-07")], TODAY).weekStreak).toBe(1);
  });

  it("is 0 when the current week has no session, even if earlier weeks do", () => {
    expect(playerStats([past("2026-07-14")], TODAY).weekStreak).toBe(0);
  });

  it("ignores future sessions", () => {
    const s = playerStats(
      [{ kind: "booking", sport: "pickleball", courtId: 1, date: "2026-07-28", hours: 1, past: false }],
      TODAY,
    );
    expect(s.weekStreak).toBe(0);
  });
});
```

Create `tests/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { initialsOf } from "@/lib/format";

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Rex I.T Support")).toBe("RI");
    expect(initialsOf("Jomar Reyes")).toBe("JR");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(initialsOf("Courtix")).toBe("CO");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initialsOf("  Mica   Alvarez  ")).toBe("MA");
  });

  it("falls back to a placeholder for an empty name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/player-stats.test.ts tests/format.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/player-stats"`, and `initialsOf` is not exported from `@/lib/format`.

- [ ] **Step 3: Add `initialsOf` to the display helpers**

Append to `src/lib/format.ts`:

```ts
/**
 * "Rex I.T Support" -> "RI". Two words in, two letters out; a single word
 * gives up its first two. Used by the avatar in the nav and the sidebar.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
```

- [ ] **Step 4: Write the metrics module**

Create `src/lib/player-stats.ts`:

```ts
/**
 * The player dashboard's numbers.
 *
 * Pure by design — no `next`, no Prisma — so the metrics can be unit-tested
 * directly, and so the same functions work whether the sessions came from the
 * JSON store or, after the phase 2 cutover, from MySQL.
 */
import type { Booking, OpenPlay, OpenPlayJoin, SportSlug } from "@/lib/types";

/**
 * Estimated kcal per hour, from published MET values for a ~70 kg adult.
 * Courtix does not measure calories; every surface using these must say so.
 */
export const KCAL_PER_HOUR: Record<SportSlug, number> = {
  pickleball: 500,
  badminton: 450,
  basketball: 580,
  golf: 250,
};

export function caloriesFor(sport: SportSlug, hours: number): number {
  return Math.round(KCAL_PER_HOUR[sport] * hours);
}

/** ISO-8601 week key, e.g. "2026-W30". Weeks start Monday. */
export function isoWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // The Thursday of a week decides which year the week belongs to.
  const dayIndex = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dayIndex + 3);
  const year = dt.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstIndex = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstIndex + 3);

  const week = 1 + Math.round((dt.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** One thing the player did or will do — a booking or an open-play seat. */
export interface PlayerSession {
  kind: "booking" | "open-play";
  sport: SportSlug;
  /** Matches the domain type's `courtId`. Phase 2 unifies court and facility ids. */
  courtId: number;
  date: string; // YYYY-MM-DD
  hours: number;
  past: boolean;
}

export interface PlayerStats {
  totalBookings: number;
  upcoming: number;
  openPlays: number;
  hoursPlayed: number;
  totalSessions: number;
  weekStreak: number;
  calThisMonth: number;
  avgCalPerSession: number;
  courtsExplored: number;
}

/** Normalises both activity sources into one list scoped to this player. */
export function playerSessions(
  bookings: Booking[],
  joins: OpenPlayJoin[],
  openPlays: OpenPlay[],
  email: string,
  today: string,
): PlayerSession[] {
  const mine = email.toLowerCase();
  const out: PlayerSession[] = [];

  for (const b of bookings) {
    if (b.playerEmail.toLowerCase() !== mine) continue;
    if (b.status === "cancelled") continue;
    out.push({
      kind: "booking",
      sport: b.sport,
      courtId: b.courtId,
      date: b.date,
      hours: b.hours,
      past: b.date < today,
    });
  }

  const byId = new Map(openPlays.map((p) => [p.id, p]));
  for (const j of joins) {
    if (j.playerEmail.toLowerCase() !== mine) continue;
    // A waitlisted seat is not a session — the player never got on court.
    if (j.waitlisted) continue;
    const p = byId.get(j.openPlayId);
    if (!p) continue;
    out.push({
      kind: "open-play",
      sport: p.sport,
      courtId: p.courtId,
      date: p.date,
      hours: p.hours,
      past: p.date < today,
    });
  }

  return out;
}

/** Consecutive weeks with at least one past session, counting back from today. */
function weekStreak(pastSessions: PlayerSession[], today: string): number {
  if (pastSessions.length === 0) return 0;
  const active = new Set(pastSessions.map((s) => isoWeek(s.date)));

  let streak = 0;
  const cursor = new Date(`${today}T00:00:00.000Z`);
  while (active.has(isoWeek(cursor.toISOString().slice(0, 10)))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}

export function playerStats(sessions: PlayerSession[], today: string): PlayerStats {
  const bookings = sessions.filter((s) => s.kind === "booking");
  const plays = sessions.filter((s) => s.kind === "open-play");
  const done = sessions.filter((s) => s.past);

  const totalSessions = done.length;
  const totalCal = done.reduce((n, s) => n + caloriesFor(s.sport, s.hours), 0);
  const month = today.slice(0, 7);

  return {
    totalBookings: bookings.length,
    upcoming: bookings.filter((s) => !s.past).length,
    openPlays: plays.length,
    hoursPlayed: done.reduce((n, s) => n + s.hours, 0),
    totalSessions,
    weekStreak: weekStreak(done, today),
    calThisMonth: done
      .filter((s) => s.date.slice(0, 7) === month)
      .reduce((n, s) => n + caloriesFor(s.sport, s.hours), 0),
    // Guard the division: a new player has no sessions at all.
    avgCalPerSession: totalSessions === 0 ? 0 : Math.round(totalCal / totalSessions),
    courtsExplored: new Set(sessions.map((s) => s.courtId)).size,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/player-stats.test.ts tests/format.test.ts`
Expected: PASS — 28 tests.

- [ ] **Step 6: Run the whole suite, lint and typecheck**

Run: `npx vitest run; npm run lint; npm run typecheck`
Expected: all tests pass (the 15 auth tests plus these), lint and typecheck silent.

- [ ] **Step 7: Commit**

```bash
git add src/lib/player-stats.ts src/lib/format.ts tests/player-stats.test.ts tests/format.test.ts
git commit -m "feat(account): add pure player metrics and initials helper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Sidebar sections

`DashSidebar` gains grouped sections and a user card. Owner and admin must come out visually unchanged.

**Files:**
- Modify: `src/components/dashboard/DashSidebar.tsx`
- Modify: `src/app/owner/layout.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `initialsOf` from `@/lib/format`; `logoutAction` from `@/app/(site)/login/actions`
- Produces: `interface NavSection { title?: string; items: NavItem[] }`, and `<DashSidebar role={string} subtitle={string?} sections={NavSection[]} user={{ name: string; email: string }} />`

- [ ] **Step 1: Rewrite the sidebar**

Replace the whole of `src/components/dashboard/DashSidebar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/(site)/login/actions";
import { Logo } from "@/components/Logo";
import { initialsOf } from "@/lib/format";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** A titled group of links. Owner and admin pass one group with no title. */
export interface NavSection {
  title?: string;
  items: NavItem[];
}

export function DashSidebar({
  role,
  subtitle,
  sections,
  user,
}: {
  /** Short badge text: "Player", "Owner", "Super Admin". */
  role: string;
  /** Secondary line under the badge — the owner's organization. */
  subtitle?: string;
  sections: NavSection[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The first link of the first section is an index route; without this it
  // would match every child path and light up permanently.
  const indexHref = sections[0]?.items[0]?.href;

  const nav = (
    <nav className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={section.title ?? `section-${i}`}>
          {section.title && (
            <p className="mb-2 px-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              {section.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href || (item.href !== indexHref && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                    active ? "bg-card text-line-white" : "text-muted hover:text-line-white"
                  }`}
                >
                  <span className="w-4 text-center" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const identity = (
    <div className="mb-5 flex items-center gap-3 px-2">
      <span
        aria-hidden
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-card font-mono text-[13px] font-semibold text-ball-yellow"
      >
        {initialsOf(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-line-white">{user.name}</p>
        <p className="truncate text-[11px] text-muted">{user.email}</p>
        <span className="mt-1 inline-block rounded-full bg-court-green px-2 py-0.5 text-[10px] font-bold text-ball-yellow">
          {role}
        </span>
        {subtitle && <p className="mt-1 truncate text-[11px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );

  const account = (
    <div className="border-t border-line-white/8 pt-3">
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

  return (
    <>
      {/* mobile bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-line-white/8 bg-court-deep px-4 py-3.5 lg:hidden">
        <Logo size={17} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-lg border border-line-white/20 px-3 py-1.5 text-[12px] font-bold"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="border-b border-line-white/8 bg-court-deep px-4 py-4 lg:hidden">
          {identity}
          {nav}
          <Link href="/" className="mt-3 mb-3 block text-[12.5px] font-bold text-ball-yellow">
            ← Back to site
          </Link>
          {account}
        </div>
      )}

      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col overflow-y-auto border-r border-line-white/8 bg-court-deep px-4 py-6 lg:flex">
        <div className="px-2 pb-6">
          <Logo size={20} />
        </div>
        {identity}
        {nav}
        <div className="mt-auto pt-6">
          <Link
            href="/"
            className="block px-3 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
          >
            ← Back to site
          </Link>
          {account}
        </div>
      </aside>
    </>
  );
}
```

Note what moved: the role is now a short badge inside the user card rather than a bare line above the nav, the organization name became the `subtitle` line beneath it, and the name/email that used to sit at the bottom moved up into that card. All three portals get this card — that is intended, not a regression.

- [ ] **Step 2: Update the owner layout**

In `src/app/owner/layout.tsx`, change the `NAV` constant and the `DashSidebar` call. Replace:

```tsx
const NAV: NavItem[] = [
```

with:

```tsx
const NAV: NavSection[] = [
  {
    items: [
```

and indent the seven existing entries into that `items` array, closing it with:

```tsx
    ],
  },
];
```

so the whole constant reads:

```tsx
const NAV: NavSection[] = [
  {
    items: [
      { href: "/owner", label: "Dashboard", icon: "▤" },
      { href: "/owner/bookings", label: "Bookings", icon: "📅" },
      { href: "/owner/courts", label: "My courts", icon: "◆" },
      { href: "/owner/players", label: "Players", icon: "☺" },
      { href: "/owner/payouts", label: "Payouts", icon: "₱" },
      { href: "/owner/reports", label: "Reports", icon: "▦" },
      { href: "/owner/settings", label: "Settings", icon: "⚙" },
    ],
  },
];
```

Change the import to `import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";`, then replace the `DashSidebar` element with:

```tsx
      <DashSidebar
        role="Owner"
        subtitle={membership?.org.name ?? "No facility yet"}
        sections={NAV}
        user={{ name: user.name, email: user.email }}
      />
```

The organization name moves out of the badge and onto the subtitle line — "Owner · Kitchen Line Club" was never going to fit in a pill.

- [ ] **Step 3: Update the admin layout**

In `src/app/admin/layout.tsx`, make the same shape change:

```tsx
const NAV: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: "▤" },
      { href: "/admin/facilities", label: "Facilities", icon: "◆" },
      { href: "/admin/users", label: "Users", icon: "☺" },
      { href: "/admin/approvals", label: "Approvals", icon: "✓" },
      { href: "/admin/waitlist", label: "Waitlist", icon: "☰" },
      { href: "/admin/payouts", label: "Commission", icon: "₱" },
      { href: "/admin/disputes", label: "Disputes", icon: "⚑" },
      { href: "/admin/settings", label: "Platform settings", icon: "⚙" },
    ],
  },
];
```

Change the import to `import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";`, then replace the `DashSidebar` element with:

```tsx
      <DashSidebar
        role="Super Admin"
        subtitle="Platform"
        sections={NAV}
        user={{ name: user.name, email: user.email }}
      />
```

- [ ] **Step 4: Verify**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashSidebar.tsx src/app/owner/layout.tsx src/app/admin/layout.tsx
git commit -m "feat(account): give the dashboard sidebar grouped sections and a user card

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Stat tiles

The reference tiles carry an icon and a coloured underline. `KpiRow` has neither and owner/admin depend on its current look, so this adds a sibling rather than changing it.

**Files:**
- Modify: `src/components/dashboard/parts.tsx`

**Interfaces:**
- Produces:
  - `interface Stat { label: string; value: string; icon: string; accent: string }`
  - `<StatGrid items={Stat[]} />`

- [ ] **Step 1: Append the components**

Add to the end of `src/components/dashboard/parts.tsx`:

```tsx
export interface Stat {
  label: string;
  value: string;
  icon: string;
  /** Any CSS colour — drives the underline that distinguishes the tiles. */
  accent: string;
}

/** The player dashboard's tile grid: four across, wrapping to as many rows as
 *  it needs. KpiRow stays as-is because owner and admin depend on its look. */
export function StatGrid({ items }: { items: Stat[] }) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="panel flex flex-col">
          <span
            aria-hidden
            className="mb-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-card text-[15px]"
          >
            {s.icon}
          </span>
          <p className="text-[11px] uppercase tracking-[0.05em] text-muted">{s.label}</p>
          <p className="mt-1 font-mono text-[24px] font-semibold">{s.value}</p>
          <span
            aria-hidden
            className="mt-3 block h-0.5 w-full rounded-full opacity-70"
            style={{ backgroundColor: s.accent }}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint; npm run typecheck`
Expected: silent.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/parts.tsx
git commit -m "feat(account): add the player stat tile grid

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: The `/account` shell and dashboard

**Files:**
- Create: `src/app/account/layout.tsx`
- Create: `src/app/account/page.tsx`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/server/auth`; `getCurrentPlayer` from `@/lib/server/player`; `getStorage` from `@/lib/server/storage`; `allOpenPlays` from `@/lib/data/openplays`; `upcomingDates` from `@/lib/availability`; `playerSessions`, `playerStats` from `@/lib/player-stats`; `StatGrid`, `Panel`, `DashHeader` from `@/components/dashboard/parts`; `NavSection` from `@/components/dashboard/DashSidebar`

- [ ] **Step 1: Write the layout**

Create `src/app/account/layout.tsx`:

```tsx
import type { Metadata } from "next";

import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s · Courtix" },
  robots: { index: false },
};

// Only links whose pages exist in this chunk. Bookings, wallet, notifications
// and the support/legal group arrive with chunks B, C and D.
const NAV: NavSection[] = [
  {
    title: "Your account",
    items: [
      { href: "/account", label: "Player Dashboard", icon: "☺" },
      { href: "/account/profile", label: "Edit Profile", icon: "✎" },
    ],
  },
  {
    title: "Quick actions",
    items: [
      { href: "/courts", label: "Book a Court", icon: "◆" },
      { href: "/open-plays", label: "Join Open Play", icon: "☰" },
    ],
  },
];

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

- [ ] **Step 2: Write the dashboard**

Create `src/app/account/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashHeader, Panel, StatGrid, type Stat } from "@/components/dashboard/parts";
import { upcomingDates } from "@/lib/availability";
import { allOpenPlays } from "@/lib/data/openplays";
import { playerSessions, playerStats } from "@/lib/player-stats";
import { getCurrentPlayer } from "@/lib/server/player";
import { getStorage } from "@/lib/server/storage";

// Reads the player's stored activity, so it must render per request.
export const dynamic = "force-dynamic";

const CALORIE_NOTE = "Estimated from session length and sport.";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AccountDashboard() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/account");

  const today = upcomingDates(1)[0];
  const storage = getStorage();
  const [bookings, joins] = await Promise.all([storage.listBookings(), storage.listOpenPlayJoins()]);

  const sessions = playerSessions(bookings, joins, allOpenPlays(), player.email, today);
  const stats = playerStats(sessions, today);

  const tiles: Stat[] = [
    { label: "Total Bookings", value: String(stats.totalBookings), icon: "▤", accent: "#2f5185" },
    { label: "Upcoming", value: String(stats.upcoming), icon: "📅", accent: "#4c7a3f" },
    { label: "Open Plays", value: String(stats.openPlays), icon: "☰", accent: "#e4c95b" },
    { label: "Cal This Month", value: stats.calThisMonth.toLocaleString("en-PH"), icon: "🔥", accent: "#e4572e" },
    { label: "Hours Played", value: `${stats.hoursPlayed}h`, icon: "🕘", accent: "#7a5fb0" },
    { label: "Week Streak", value: String(stats.weekStreak), icon: "⚡", accent: "#e4572e" },
    { label: "Avg Cal/Session", value: stats.avgCalPerSession.toLocaleString("en-PH"), icon: "🌿", accent: "#4c7a3f" },
    { label: "Total Sessions", value: String(stats.totalSessions), icon: "🏆", accent: "#c05c8e" },
  ];

  return (
    <>
      <DashHeader
        title={`${greeting()}, ${player.name.split(" ")[0]}`}
        sub={player.city ? `Your court time around ${player.city}` : "Your court time so far"}
        action={
          <Link href="/courts" className="btn btn-solid">
            Book a court
          </Link>
        }
      />

      <StatGrid items={tiles} />

      <div className="grid gap-[18px] xl:grid-cols-2">
        <Panel title="Calories Burned" action={<span className="font-mono text-[10.5px] text-muted">this month</span>}>
          {stats.totalSessions === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-1.5 font-sans text-[14px] font-extrabold">No activity data yet</p>
              <p className="text-[12.5px] text-muted">
                Book a court or join an open play and this fills in.
              </p>
            </div>
          ) : (
            <>
              <p className="font-mono text-[28px] font-semibold">
                {stats.calThisMonth.toLocaleString("en-PH")}
                <span className="ml-1.5 text-[13px] text-muted">kcal</span>
              </p>
              <p className="mt-1.5 text-[12.5px] text-muted">
                Across {stats.totalSessions} session{stats.totalSessions === 1 ? "" : "s"} ·{" "}
                {stats.hoursPlayed}h on court.
              </p>
            </>
          )}
          <p className="mt-3.5 border-t border-line-white/8 pt-3 text-[11.5px] text-muted">
            {CALORIE_NOTE}
          </p>
        </Panel>

        <Panel title="Courts Explored">
          <p className="font-mono text-[28px] font-semibold">{stats.courtsExplored}</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            unique venue{stats.courtsExplored === 1 ? "" : "s"} visited
          </p>
          {stats.courtsExplored === 0 && (
            <p className="mt-3.5 text-[12.5px] text-muted">
              Start booking to explore new courts.{" "}
              <Link href="/courts" className="font-bold text-ball-yellow">
                Find a court →
              </Link>
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/account
git commit -m "feat(account): add the player portal shell and dashboard

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Edit Profile

**Files:**
- Create: `src/lib/server/catalog.ts`
- Create: `src/app/account/profile/schema.ts`
- Create: `src/app/account/profile/actions.ts`
- Create: `src/app/account/profile/ProfileForm.tsx`
- Create: `src/app/account/profile/page.tsx`
- Modify: `src/lib/server/player.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/server/db`; `getSession`, `requireUser` from `@/lib/server/auth`; `SPORTS` from `@/lib/data/sports`
- Produces:
  - `listLiveCities(): Promise<{ id: string; name: string; province: string }[]>` from `@/lib/server/catalog`
  - `getProfileForm(): Promise<ProfileFormValues | null>` from `@/lib/server/player`
  - `interface ProfileFormValues { name: string; email: string; phone: string; homeCityId: string; skill: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; rating: string; sportIds: string[] }`
  - `saveProfileAction(prev: ProfileState, formData: FormData): Promise<ProfileState>`
  - `interface ProfileState { errors?: Record<string, string>; saved?: boolean }`

- [ ] **Step 1: Add the city query**

Create `src/lib/server/catalog.ts`:

```ts
import "server-only";

import { db } from "@/lib/server/db";

/** Cities the platform has actually opened — the only ones a player can pick. */
export async function listLiveCities(): Promise<{ id: string; name: string; province: string }[]> {
  return db.city.findMany({
    where: { status: "LIVE" },
    select: { id: true, name: true, province: true },
    orderBy: [{ name: "asc" }],
  });
}
```

- [ ] **Step 2: Add the profile read**

Append to `src/lib/server/player.ts`:

```ts
/** The editable shape of a player's profile, as the form needs it. */
export interface ProfileFormValues {
  name: string;
  /** Read-only in the UI: it is the login identifier. */
  email: string;
  phone: string;
  homeCityId: string;
  skill: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  rating: string;
  sportIds: string[];
}

export async function getProfileForm(): Promise<ProfileFormValues | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      phone: true,
      playerProfile: {
        select: {
          skill: true,
          rating: true,
          homeCityId: true,
          favourites: { select: { sportId: true } },
        },
      },
    },
  });
  if (!user) return null;

  const p = user.playerProfile;
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    homeCityId: p?.homeCityId ?? "",
    skill: p?.skill ?? "BEGINNER",
    rating: p?.rating ? String(p.rating) : "",
    sportIds: p?.favourites.map((f) => f.sportId) ?? [],
  };
}
```

- [ ] **Step 3: Add the validation schema**

Create `src/app/account/profile/schema.ts`:

```ts
import { z } from "zod";

/** Shared by the form and the action, so the error a player sees is the error
 *  the server would produce. The action re-validates regardless. */
export const ProfileInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^09\d{9}$/.test(v), "Use an 11-digit mobile number starting 09"),
  homeCityId: z.string().trim(),
  skill: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  rating: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 8), "Rating must be between 1.00 and 8.00"),
  sportIds: z.array(z.string()),
});

export type ProfileInputValues = z.infer<typeof ProfileInput>;
```

- [ ] **Step 4: Add the save action**

Create `src/app/account/profile/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { ProfileInput } from "@/app/account/profile/schema";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export interface ProfileState {
  errors?: Record<string, string>;
  saved?: boolean;
}

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = ProfileInput.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    homeCityId: formData.get("homeCityId") ?? "",
    skill: formData.get("skill"),
    rating: formData.get("rating") ?? "",
    sportIds: formData.getAll("sportIds").map(String),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { name, phone, homeCityId, skill, rating, sportIds } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name, phone: phone === "" ? null : phone },
    });

    // An account created outside the seed may have no profile row yet, so this
    // creates one rather than failing the save.
    const profile = await tx.playerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        skill,
        rating: rating === "" ? null : rating,
        homeCityId: homeCityId === "" ? null : homeCityId,
      },
      update: {
        skill,
        rating: rating === "" ? null : rating,
        homeCityId: homeCityId === "" ? null : homeCityId,
      },
      select: { id: true },
    });

    // Favourite sports are a set: clear and rewrite, scoped to this profile.
    await tx.playerSport.deleteMany({ where: { playerProfileId: profile.id } });
    if (sportIds.length > 0) {
      await tx.playerSport.createMany({
        data: sportIds.map((sportId) => ({ playerProfileId: profile.id, sportId })),
      });
    }
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { saved: true };
}
```

- [ ] **Step 5: Add the form**

Create `src/app/account/profile/ProfileForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { saveProfileAction, type ProfileState } from "@/app/account/profile/actions";
import type { ProfileFormValues } from "@/lib/server/player";

export function ProfileForm({
  values,
  cities,
  sports,
}: {
  values: ProfileFormValues;
  cities: { id: string; name: string; province: string }[];
  sports: { slug: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});
  const err = (field: string) => state.errors?.[field];

  return (
    <form action={action} className="panel max-w-[560px]">
      {state.saved && (
        <p role="status" className="mb-4 rounded-[10px] border border-court-green bg-court-green/20 px-3.5 py-3 text-[12.5px] font-semibold text-ball-yellow">
          Profile saved.
        </p>
      )}

      <label className="mb-4 block">
        <span className="field-label">Name</span>
        <input name="name" defaultValue={values.name} required className="field" autoComplete="name" />
        {err("name") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("name")}</span>}
      </label>

      <label className="mb-4 block">
        <span className="field-label">Email</span>
        <input value={values.email} readOnly disabled className="field opacity-60" />
        <span className="mt-1 block text-[11.5px] text-muted">
          Your email is how you sign in — it can&apos;t be changed here.
        </span>
      </label>

      <label className="mb-4 block">
        <span className="field-label">Mobile</span>
        <input name="phone" defaultValue={values.phone} className="field" placeholder="09171234567" autoComplete="tel" />
        {err("phone") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("phone")}</span>}
      </label>

      <label className="mb-4 block">
        <span className="field-label">Home city</span>
        <select name="homeCityId" defaultValue={values.homeCityId} className="field">
          <option value="">No home city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.province}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block">
        <span className="field-label">Skill level</span>
        <select name="skill" defaultValue={values.skill} className="field">
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </label>

      <label className="mb-4 block">
        <span className="field-label">DUPR rating</span>
        <input name="rating" defaultValue={values.rating} className="field" placeholder="3.50" inputMode="decimal" />
        <span className="mt-1 block text-[11.5px] text-muted">Self-reported, 1.00–8.00. Leave blank if unrated.</span>
        {err("rating") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("rating")}</span>}
      </label>

      <fieldset className="mb-5">
        <legend className="field-label">Favourite sports</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {sports.map((s) => (
            <label key={s.slug} className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                name="sportIds"
                value={s.slug}
                defaultChecked={values.sportIds.includes(s.slug)}
                className="h-3.5 w-3.5 accent-[var(--color-ball-yellow)]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={pending} className="btn btn-solid w-full py-3 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Add the page**

Create `src/app/account/profile/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/app/account/profile/ProfileForm";
import { DashHeader } from "@/components/dashboard/parts";
import { SPORTS } from "@/lib/data/sports";
import { listLiveCities } from "@/lib/server/catalog";
import { getProfileForm } from "@/lib/server/player";

export const metadata: Metadata = { title: "Edit profile" };

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const [values, cities] = await Promise.all([getProfileForm(), listLiveCities()]);
  if (!values) redirect("/login?next=/account/profile");

  return (
    <>
      <DashHeader title="Edit profile" sub="How you appear to hosts and other players" />
      <ProfileForm
        values={values}
        cities={cities}
        sports={SPORTS.map((s) => ({ slug: s.slug, name: s.name }))}
      />
    </>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/catalog.ts src/lib/server/player.ts src/app/account/profile
git commit -m "feat(account): add the edit profile page and save action

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Avatar dropdown in the top nav

**Files:**
- Create: `src/components/AccountMenu.tsx`
- Modify: `src/components/SiteNav.tsx`
- Modify: `src/app/(site)/layout.tsx`

**Interfaces:**
- Consumes: `initialsOf` from `@/lib/format`; `logoutAction` from `@/app/(site)/login/actions`
- Produces: `<AccountMenu account={{ name: string; email: string; href: string }} />`, and `SiteNav`'s prop becomes `account: { name: string; email: string; href: string } | null`

- [ ] **Step 1: Write the menu**

Create `src/components/AccountMenu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/(site)/login/actions";
import { initialsOf } from "@/lib/format";

// Only pages that exist. Chunks B–D add their own entries here.
const ITEMS = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/profile", label: "Edit Profile" },
];

export function AccountMenu({
  account,
}: {
  account: { name: string; email: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Navigating away must not leave the menu hanging open over the new page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${account.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line-white/20 bg-card font-mono text-[12px] font-semibold text-ball-yellow"
      >
        {initialsOf(account.name)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-[110] w-[260px] overflow-hidden rounded-[14px] border border-line-white/12 bg-court-deep shadow-2xl"
        >
          <div className="border-b border-line-white/8 px-4 py-3.5">
            <p className="truncate text-[13.5px] font-semibold text-line-white">{account.name}</p>
            <p className="truncate text-[11.5px] text-muted">{account.email}</p>
          </div>

          <div className="py-1.5">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block px-4 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-card hover:text-line-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <form action={logoutAction} className="border-t border-line-white/8">
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-3 text-left text-[13px] font-bold text-[#ff6b6b] transition-colors hover:bg-card"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Use it in the nav**

In `src/components/SiteNav.tsx`, add the import:

```tsx
import { AccountMenu } from "@/components/AccountMenu";
```

Change the signature to:

```tsx
export function SiteNav({
  account,
}: {
  account: { name: string; email: string; href: string } | null;
}) {
```

Replace the desktop signed-in/signed-out block with:

```tsx
          {account ? (
            <AccountMenu account={account} />
          ) : (
            <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
              Sign in
            </Link>
          )}
```

and the mobile sheet link with:

```tsx
            <Link
              href={account ? account.href : "/login"}
              className="rounded-lg px-3 py-3 text-[15px] font-semibold text-muted hover:bg-card hover:text-line-white sm:hidden"
            >
              {account ? account.name.split(" ")[0] : "Sign in"}
            </Link>
```

- [ ] **Step 3: Pass the email through**

In `src/app/(site)/layout.tsx`, change the `SiteNav` call to include the email:

```tsx
      <SiteNav
        account={
          user ? { name: user.name, email: user.email, href: homeFor(user.role) } : null
        }
      />
```

- [ ] **Step 4: Verify**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/AccountMenu.tsx src/components/SiteNav.tsx "src/app/(site)/layout.tsx"
git commit -m "feat(account): add the avatar account menu to the site nav

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Move the player home to `/account`

Done last, so `/account` already exists when `homeFor` starts pointing at it.

**Files:**
- Modify: `src/lib/auth-routes.ts`
- Modify: `src/middleware.ts`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/app/(site)/player-home/page.tsx`
- Modify: `tests/auth-routes.test.ts`

**Interfaces:**
- Produces: `homeFor("PLAYER") === "/account"`

- [ ] **Step 1: Update the failing test first**

In `tests/auth-routes.test.ts`, change the `homeFor` expectation:

```ts
    expect(homeFor("PLAYER")).toBe("/account");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: FAIL — `expected '/player-home' to be '/account'`.

- [ ] **Step 3: Point `homeFor` at the portal**

In `src/lib/auth-routes.ts`, in `homeFor`, change the `PLAYER` branch:

```ts
    case "PLAYER":
    default:
      return "/account";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/auth-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the middleware matcher**

In `src/middleware.ts`, change the matcher:

```ts
export const config = {
  matcher: ["/owner/:path*", "/admin/:path*", "/account/:path*"],
};
```

- [ ] **Step 6: Update the footer link**

In `src/components/SiteFooter.tsx`, in the "Play" column, change:

```tsx
      { href: "/account", label: "Your home" },
```

- [ ] **Step 7: Replace the old page with a redirect**

Replace the whole of `src/app/(site)/player-home/page.tsx` with:

```tsx
import { permanentRedirect } from "next/navigation";

/**
 * The player home moved into the account portal. Kept as a redirect because
 * the old path was linked from the footer, the nav and any bookmark a demo
 * viewer made.
 */
export default function PlayerHomeRedirect(): never {
  permanentRedirect("/account");
}
```

- [ ] **Step 8: Verify nothing still points at the old path**

Run: `git grep -n "player-home" -- src docs || echo "no references left"`
Expected: only the redirect stub's own path and its comment. Any live `href="/player-home"` is a miss — fix it.

- [ ] **Step 9: Verify**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth-routes.ts src/middleware.ts src/components/SiteFooter.tsx "src/app/(site)/player-home/page.tsx" tests/auth-routes.test.ts
git commit -m "feat(account): move the player home to /account

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: End-to-end verification

**Files:**
- Modify: `docs/superpowers/specs/2026-07-25-player-portal-shell-design.md` (tick the done list)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route list shows `ƒ /account`, `ƒ /account/profile`, and `ƒ Middleware`.

- [ ] **Step 2: Reseed so the player has known data**

Run: `npm run db:seed`
Expected: the usual summary ending `3 login accounts (password: demo1234)`.

- [ ] **Step 3: Start the server**

Run in the background: `npx next start -p 3100`
Wait until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/login` returns 200.

Note: if the port is busy from an earlier run, kill only that PID — `netstat -ano | grep :3100 | grep LISTENING` — and never assume a stale server is serving current code.

- [ ] **Step 4: Check the redirect and the gate**

Signed out, `GET /account` must redirect to `/login?next=%2Faccount`, and `GET /player-home` must return 308 to `/account`.

- [ ] **Step 5: Sign in as the player and check the shell**

Log in as `jomar.r@example.ph` / `demo1234`. Expected: lands on `/account`; sidebar shows the avatar `JR`, the name, the email and a "Player" badge; sections read "Your account" and "Quick actions"; no Support & Legal section.

- [ ] **Step 6: Check the tiles against the seed**

The seeded player has no bookings, so every tile reads 0, "Hours Played" reads `0h`, and both panels show their empty states with the calorie note visible.

Then book a court through the UI and reload `/account`: Total Bookings and Upcoming become 1, Courts Explored becomes 1.

- [ ] **Step 7: Check Edit Profile round-trips**

Open `/account/profile`. Expected: name, email (disabled), skill `Intermediate`, rating `3.5`, home city `Tagum City`, pickleball and badminton checked. Change the skill and the rating, save, reload — the new values persist. Enter rating `99` and confirm the inline error appears and nothing is saved.

- [ ] **Step 8: Check the avatar menu**

On any public page while signed in, the nav shows the `JR` avatar. Clicking opens the menu with name, email, Dashboard, Edit Profile, Sign Out. Escape closes it. Sign Out returns to `/` signed out.

- [ ] **Step 9: Check owner and admin are unchanged**

Sign in as `owner@kitchenline.ph` and `admin@courtix.ph`. Both sidebars show their original seven and eight links in the original order, now with the user card above them: owner reads badge "Owner" with "Kitchen Line Club" beneath, admin reads "Super Admin" with "Platform". Sign-out still works from both.

- [ ] **Step 10: Full check**

Run: `npm run lint; npm run typecheck; npx vitest run`
Expected: lint and typecheck silent, all tests pass.

- [ ] **Step 11: Tick the spec**

In `docs/superpowers/specs/2026-07-25-player-portal-shell-design.md`, change every `- [ ]` in section 8 to `- [x]`.

- [ ] **Step 12: Commit**

```bash
git add docs/superpowers/specs/2026-07-25-player-portal-shell-design.md
git commit -m "docs: mark player portal chunk A verified

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage.** Routes and the `/account` move → Tasks 4, 7. Sidebar sections and the user card → Task 2. Avatar dropdown with its accessibility rules → Task 6. Eight metrics and calorie rates → Task 1, rendered in Task 4. Progress panels and the estimate footnote → Task 4. Edit Profile with every listed field, read-only email and missing-profile creation → Task 5. Error-handling table → Tasks 4, 5 (null player redirects, upsert on missing profile) and Task 7 (middleware). Testing table → Task 1 covers all seven named cases; the manual checks are Task 8. Out-of-scope items appear in no task, as intended.

**Type consistency.** `PlayerSession`/`PlayerStats` (Task 1) are what Task 4 consumes. `NavSection` (Task 2) is used by Tasks 2 and 4. `Stat` (Task 3) is what Task 4 builds. `ProfileFormValues` (Task 5) flows from `getProfileForm` into `ProfileForm`. `SiteNav`'s `account` prop gains `email` in Task 6, and `(site)/layout.tsx` is updated in the same task so the two never disagree.

**One deviation from the spec, deliberate.** Section 4 of the spec says the profile zod schema follows "the existing pattern in `src/lib/validation.ts`". The plan puts it in `src/app/account/profile/schema.ts` instead — co-located with its only two consumers, matching how `login/actions.ts` keeps its own schema. Same shared-schema property, tighter file boundary.
