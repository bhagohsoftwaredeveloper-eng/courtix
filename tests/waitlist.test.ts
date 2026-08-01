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
