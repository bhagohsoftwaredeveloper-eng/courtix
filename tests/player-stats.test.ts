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

  it("marks a confirmed booking as played", () => {
    const out = playerSessions([booking({ status: "confirmed" })], [], [], "jomar.r@example.ph", TODAY);
    expect(out[0].played).toBe(true);
  });

  it("keeps a pending booking as a session, but not played", () => {
    const out = playerSessions([booking({ status: "pending" })], [], [], "jomar.r@example.ph", TODAY);
    expect(out).toHaveLength(1);
    expect(out[0].played).toBe(false);
  });

  it("marks an open-play join as played — a confirmed seat is the only kind kept", () => {
    const out = playerSessions([], [join()], [play()], "jomar.r@example.ph", TODAY);
    expect(out[0].played).toBe(true);
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
    { kind: "booking",   sport: "pickleball", courtId: 1, date: "2026-07-20", hours: 2, past: true, played: true },
    { kind: "booking",   sport: "pickleball", courtId: 1, date: "2026-07-28", hours: 1, past: false, played: true },
    { kind: "open-play", sport: "badminton",  courtId: 5, date: "2026-07-22", hours: 2, past: true, played: true },
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
      [{ kind: "booking", sport: "pickleball", courtId: 1, date: "2026-06-20", hours: 2, past: true, played: true }],
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
    ({ kind: "booking", sport: "pickleball", courtId: 1, date, hours: 1, past: true, played: true });

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
      [{ kind: "booking", sport: "pickleball", courtId: 1, date: "2026-07-28", hours: 1, past: false, played: true }],
      TODAY,
    );
    expect(s.weekStreak).toBe(0);
  });

  it("ignores an unplayed booking, even if it's the only session in the current week", () => {
    const s = playerStats(
      [{ kind: "booking", sport: "pickleball", courtId: 1, date: "2026-07-21", hours: 1, past: true, played: false }],
      TODAY,
    );
    expect(s.weekStreak).toBe(0);
  });
});

describe("playerStats with unplayed bookings", () => {
  // One booking actually happened; the other is still an unpaid hold. Only
  // the confirmed one may count as court time.
  const sessions: PlayerSession[] = [
    { kind: "booking", sport: "pickleball", courtId: 1, date: "2026-07-20", hours: 2, past: true, played: true },
    { kind: "booking", sport: "pickleball", courtId: 2, date: "2026-07-21", hours: 2, past: true, played: false },
  ];

  it("counts both as bookings — the player did make the booking either way", () => {
    expect(playerStats(sessions, TODAY).totalBookings).toBe(2);
  });

  it("counts hours only for the played session", () => {
    expect(playerStats(sessions, TODAY).hoursPlayed).toBe(2);
  });

  it("counts sessions only for the played session", () => {
    expect(playerStats(sessions, TODAY).totalSessions).toBe(1);
  });

  it("counts calories only for the played session", () => {
    expect(playerStats(sessions, TODAY).calThisMonth).toBe(1000);
  });

  it("averages calories only over played sessions", () => {
    expect(playerStats(sessions, TODAY).avgCalPerSession).toBe(1000);
  });
});
