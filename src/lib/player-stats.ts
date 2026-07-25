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
  /**
   * Whether court time actually happened — `confirmed`, not just booked.
   * A held or pending booking still belongs to the player (it counts toward
   * Total Bookings / Upcoming) but must not earn calories, sessions, or
   * streak credit until Phase 2's held/no-show statuses can express that.
   */
  played: boolean;
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
  sessionsThisMonth: number;
  hoursThisMonth: number;
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
      // Only a confirmed booking is court time that actually happened; a
      // pending one is still an unpaid hold.
      played: b.status === "confirmed",
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
      // A waitlisted join was already filtered out above, so every join kept
      // here is a confirmed seat — there is no weaker state to represent yet.
      played: true,
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
  // A held or pending booking still made it onto the calendar, so it counts
  // as a booking — but it is not court time until it's played, so only
  // past-and-played sessions may earn calories, sessions, or streak credit.
  const done = sessions.filter((s) => s.past && s.played);

  const totalSessions = done.length;
  const totalCal = done.reduce((n, s) => n + caloriesFor(s.sport, s.hours), 0);
  const month = today.slice(0, 7);
  // The Calories Burned panel is scoped to "this month" throughout — its
  // headline figure (calThisMonth) and its caption must agree, so the
  // caption's session count and hours need the same month filter rather
  // than the all-time totals below. Filtered once and reused for both,
  // instead of filtering `done` three times over.
  const thisMonth = done.filter((s) => s.date.slice(0, 7) === month);

  return {
    totalBookings: bookings.length,
    upcoming: bookings.filter((s) => !s.past).length,
    openPlays: plays.length,
    hoursPlayed: done.reduce((n, s) => n + s.hours, 0),
    totalSessions,
    weekStreak: weekStreak(done, today),
    calThisMonth: thisMonth.reduce((n, s) => n + caloriesFor(s.sport, s.hours), 0),
    // Guard the division: a new player has no sessions at all.
    avgCalPerSession: totalSessions === 0 ? 0 : Math.round(totalCal / totalSessions),
    courtsExplored: new Set(sessions.map((s) => s.courtId)).size,
    sessionsThisMonth: thisMonth.length,
    hoursThisMonth: thisMonth.reduce((n, s) => n + s.hours, 0),
  };
}
