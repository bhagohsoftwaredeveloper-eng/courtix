import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prismaWaitlist } from "@/lib/server/waitlist-store";
import type { Booking, OpenPlayJoin, WaitlistEntry } from "@/lib/types";

/**
 * ============================================================================
 * THE SWAP POINT
 * ============================================================================
 * Everything the app does with persistence goes through `Storage`. The JSON
 * implementation below writes to /data and needs zero configuration, which is
 * what makes the demo runnable out of the box.
 *
 * To move to a real database, write another object satisfying this interface
 * and return it from `getStorage()` — no page, component, or API route needs
 * to change. Firestore and Prisma sketches are in BOOKING_INTEGRATION_PLAN.md.
 *
 * Note the JSON driver is single-process and last-write-wins. That is fine for
 * a pitch demo and NOT fine for production: two concurrent bookings for the
 * same slot can both succeed. The real driver must enforce the slot uniqueness
 * constraint at the database level (see the plan, Phase 2).
 * ============================================================================
 */
export interface Storage {
  listWaitlist(): Promise<WaitlistEntry[]>;
  findWaitlistByEmail(email: string): Promise<WaitlistEntry | undefined>;
  addWaitlist(entry: Omit<WaitlistEntry, "id" | "position" | "createdAt">): Promise<WaitlistEntry>;

  listBookings(): Promise<Booking[]>;
  findBooking(ref: string): Promise<Booking | undefined>;
  addBooking(booking: Omit<Booking, "ref" | "createdAt">): Promise<Booking>;
  /**
   * Which units at this facility are already claimed by a stored booking that
   * overlaps the given span. The API subtracts these from the derived-free
   * units before assigning one, so two bookings never land on the same court.
   */
  bookedUnitsForSpan(
    courtId: number,
    date: string,
    startHour: number,
    hours: number,
  ): Promise<number[]>;

  listOpenPlayJoins(): Promise<OpenPlayJoin[]>;
  joinsForOpenPlay(openPlayId: string): Promise<OpenPlayJoin[]>;
  hasJoinedOpenPlay(openPlayId: string, email: string): Promise<boolean>;
  addOpenPlayJoin(join: Omit<OpenPlayJoin, "id" | "createdAt">): Promise<OpenPlayJoin>;
}

const DATA_DIR = join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    // Missing or unparseable file means "nothing stored yet".
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
}

function bookingRef(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — read aloud over the phone
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CTX-${out}`;
}

const jsonStorage: Storage = {
  async listWaitlist() {
    return readJson<WaitlistEntry[]>("waitlist.json", []);
  },

  async findWaitlistByEmail(email) {
    const all = await this.listWaitlist();
    return all.find((e) => e.email === email.toLowerCase());
  },

  async addWaitlist(entry) {
    const all = await readJson<WaitlistEntry[]>("waitlist.json", []);
    const record: WaitlistEntry = {
      ...entry,
      id: `wl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      // Seeded at 1,200 so the pitch demo shows a queue that already has weight.
      position: 1200 + all.length + 1,
      createdAt: new Date().toISOString(),
    };
    all.push(record);
    await writeJson("waitlist.json", all);
    return record;
  },

  async listBookings() {
    return readJson<Booking[]>("bookings.json", []);
  },

  async findBooking(ref) {
    const all = await this.listBookings();
    return all.find((b) => b.ref === ref.toUpperCase());
  },

  async bookedUnitsForSpan(courtId, date, startHour, hours) {
    const all = await this.listBookings();
    const wanted = new Set(Array.from({ length: hours }, (_, i) => startHour + i));
    const units = new Set<number>();
    for (const b of all) {
      if (b.courtId !== courtId || b.date !== date || b.status === "cancelled") continue;
      for (let h = b.startHour; h < b.startHour + b.hours; h++) {
        if (wanted.has(h)) {
          // Legacy rows without a unitIndex are treated as unit 0.
          units.add(b.unitIndex ?? 0);
          break;
        }
      }
    }
    return [...units];
  },

  async addBooking(booking) {
    const all = await readJson<Booking[]>("bookings.json", []);
    let ref = bookingRef();
    while (all.some((b) => b.ref === ref)) ref = bookingRef();

    const record: Booking = { ...booking, ref, createdAt: new Date().toISOString() };
    all.push(record);
    await writeJson("bookings.json", all);
    return record;
  },

  async listOpenPlayJoins() {
    return readJson<OpenPlayJoin[]>("openplay-joins.json", []);
  },

  async joinsForOpenPlay(openPlayId) {
    const all = await this.listOpenPlayJoins();
    return all.filter((j) => j.openPlayId === openPlayId);
  },

  async hasJoinedOpenPlay(openPlayId, email) {
    const all = await this.listOpenPlayJoins();
    const e = email.toLowerCase();
    return all.some((j) => j.openPlayId === openPlayId && j.playerEmail === e);
  },

  async addOpenPlayJoin(join) {
    const all = await readJson<OpenPlayJoin[]>("openplay-joins.json", []);
    const record: OpenPlayJoin = {
      ...join,
      playerEmail: join.playerEmail.toLowerCase(),
      id: `opj_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(record);
    await writeJson("openplay-joins.json", all);
    return record;
  },
};

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
