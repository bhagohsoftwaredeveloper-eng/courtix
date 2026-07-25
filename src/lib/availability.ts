import { getCourt } from "@/lib/data/courts";
import { toISODate } from "@/lib/format";
import type { Court } from "@/lib/types";

/**
 * Availability for the demo is *derived*, not stored — a deterministic hash of
 * (courtId, date, hour) decides whether a slot is already taken.
 *
 * Two properties matter here:
 *  1. Deterministic — the server render and the client hydration must agree,
 *     otherwise React throws a hydration mismatch on every court page.
 *  2. Plausible — evening slots book out far more than mid-morning ones, so the
 *     demo grid looks like a real venue rather than random noise.
 *
 * When the real backend lands this whole module is replaced by a query against
 * the bookings table. See BOOKING_INTEGRATION_PLAN.md § "Replacing availability".
 */

/** FNV-1a — small, fast, and stable across server/client. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

export interface Slot {
  hour: number;
  label: string;
  taken: boolean;
  /** Fraction of the venue's units already booked, 0..1. */
  pressure: number;
}

/** Peak hours book out much more aggressively than off-peak. */
function demandWeight(hour: number): number {
  if (hour >= 17 && hour <= 21) return 0.62; // after-work rush
  if (hour >= 6 && hour <= 8) return 0.4; // morning regulars
  if (hour >= 9 && hour <= 15) return 0.14; // dead hours
  return 0.25;
}

/**
 * Is one specific unit (Court 1, Court 2, …) taken at one hour, by the derived
 * demo occupancy? A facility with N units gets N independent rolls per hour, so
 * a 2-court venue can genuinely hold two bookings in the same slot — which is
 * the whole point of tracking units.
 */
function unitTakenDerived(court: Court, unitIndex: number, isoDate: string, hour: number): boolean {
  const isWeekend = [0, 6].includes(new Date(`${isoDate}T00:00:00Z`).getUTCDay());
  const roll = hash(`${court.id}:u${unitIndex}:${isoDate}:${hour}`);
  const weight = demandWeight(hour) * (isWeekend ? 1.35 : 1);
  return roll < weight;
}

/** Which units are free at this hour, by derived occupancy only. */
export function freeUnitsDerived(court: Court, isoDate: string, hour: number): number[] {
  const free: number[] = [];
  for (let u = 0; u < court.units; u++) {
    if (!unitTakenDerived(court, u, isoDate, hour)) free.push(u);
  }
  return free;
}

/** Slot grid for one specific court (Court 1, Court 2, …) on a given day. */
export function slotsForUnit(court: Court, isoDate: string, unitIndex: number): Slot[] {
  const slots: Slot[] = [];
  for (let hour = court.opens; hour < court.closes; hour++) {
    const taken = unitTakenDerived(court, unitIndex, isoDate, hour);
    slots.push({
      hour,
      label: `${((hour + 11) % 12) + 1}:00 ${hour < 12 ? "AM" : "PM"}`,
      taken,
      pressure: taken ? 1 : 0,
    });
  }
  return slots;
}

/** Is one specific court free across the whole span? (derived only). */
export function unitFreeForSpan(
  court: Court,
  isoDate: string,
  startHour: number,
  hours: number,
  unitIndex: number,
): boolean {
  if (startHour < court.opens) return false;
  if (startHour + hours > court.closes) return false;
  for (let h = startHour; h < startHour + hours; h++) {
    if (unitTakenDerived(court, unitIndex, isoDate, h)) return false;
  }
  return true;
}

export function slotsFor(court: Court, isoDate: string): Slot[] {
  const slots: Slot[] = [];
  for (let hour = court.opens; hour < court.closes; hour++) {
    // Facility-level: the slot is only unbookable when every unit is busy.
    const free = freeUnitsDerived(court, isoDate, hour);
    slots.push({
      hour,
      label: `${((hour + 11) % 12) + 1}:00 ${hour < 12 ? "AM" : "PM"}`,
      taken: free.length === 0,
      pressure: 1 - free.length / court.units,
    });
  }
  return slots;
}

export function slotsForCourtId(courtId: number, isoDate: string): Slot[] {
  const court = getCourt(courtId);
  return court ? slotsFor(court, isoDate) : [];
}

/**
 * Pick the lowest-numbered unit free for the whole span, skipping any unit in
 * `exclude` (units already claimed by stored bookings). Returns the unit index,
 * or null when the facility is full for that span. This is the assignment the
 * booking API records so the owner sees exactly which court was taken.
 */
export function assignUnit(
  court: Court,
  isoDate: string,
  startHour: number,
  hours: number,
  exclude: ReadonlySet<number> = new Set(),
): number | null {
  if (startHour < court.opens) return null;
  if (startHour + hours > court.closes) return null;

  for (let u = 0; u < court.units; u++) {
    if (exclude.has(u)) continue;
    let free = true;
    for (let h = startHour; h < startHour + hours; h++) {
      if (unitTakenDerived(court, u, isoDate, h)) {
        free = false;
        break;
      }
    }
    if (free) return u;
  }
  return null;
}

/** The next `count` bookable dates, starting today. */
export function upcomingDates(count = 14, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    out.push(toISODate(d));
  }
  return out;
}

/**
 * Can a booking of `hours` length start at `startHour`? True when at least one
 * unit is free across the whole span (derived occupancy only — the API also
 * excludes units held by stored bookings before it confirms).
 */
export function canBook(court: Court, isoDate: string, startHour: number, hours: number): boolean {
  return assignUnit(court, isoDate, startHour, hours) !== null;
}

/** Count of open slots today — powers the "N slots left today" badges. */
export function openSlotsToday(court: Court, isoDate: string): number {
  return slotsFor(court, isoDate).filter((s) => !s.taken).length;
}

export const SERVICE_FEE_RATE = 0.06;

export interface Quote {
  hours: number;
  hourlyRate: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

/** Single source of truth for pricing — used by the UI *and* the API route. */
export function quote(court: Court, hours: number): Quote {
  const subtotal = court.price * hours;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return {
    hours,
    hourlyRate: court.price,
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
  };
}
