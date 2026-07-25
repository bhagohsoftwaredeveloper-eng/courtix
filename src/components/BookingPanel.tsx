"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  canBook,
  quote,
  slotsFor,
  slotsForUnit,
  unitFreeForSpan,
  upcomingDates,
} from "@/lib/availability";
import { unitLabelFor } from "@/lib/data/courts";
import { chipParts, hourLabel, peso, rangeLabel } from "@/lib/format";
import { getSport } from "@/lib/data/sports";
import type { Court } from "@/lib/types";

/** "any" lets Courtix auto-assign; a number pins one specific court. */
type UnitChoice = number | "any";

/**
 * Date + court + time + duration picker with a live quote.
 *
 * A facility can have several courts (Court 1, Court 2, …). The player either
 * picks a specific one or lets Courtix assign the next free court. The slot
 * grid reflects whichever is selected, and the choice is carried through to
 * checkout so the same court is booked.
 *
 * Availability is computed with the same pure functions the server uses, so
 * the grid renders identically on both sides. Selecting a slot doesn't reserve
 * anything — see BOOKING_INTEGRATION_PLAN.md § "Slot holds".
 */
export function BookingPanel({ court }: { court: Court }) {
  const router = useRouter();
  const sport = getSport(court.sport)!;
  const durations = sport.durations;
  const multiUnit = court.units > 1;

  const dates = useMemo(() => upcomingDates(14), []);
  const [date, setDate] = useState(dates[0]);
  const [unit, setUnit] = useState<UnitChoice>("any");
  const [startHour, setStartHour] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(durations[0]);

  const hours = minutes / 60;

  // The grid shows facility-level availability for "any", or one court's
  // availability when a specific court is chosen.
  const slots = useMemo(
    () => (unit === "any" ? slotsFor(court, date) : slotsForUnit(court, date, unit)),
    [court, date, unit],
  );
  const q = quote(court, hours);

  const fits = useMemo(
    () => (h: number) =>
      unit === "any" ? canBook(court, date, h, hours) : unitFreeForSpan(court, date, h, hours, unit),
    [unit, court, date, hours],
  );

  // A slot is only selectable if the *whole* requested duration fits.
  const selectable = useMemo(
    () => new Set(slots.filter((s) => fits(s.hour)).map((s) => s.hour)),
    [slots, fits],
  );

  const validSelection = startHour !== null && selectable.has(startHour);

  function pickDate(d: string) {
    setDate(d);
    setStartHour(null);
  }

  function pickUnit(u: UnitChoice) {
    setUnit(u);
    setStartHour(null);
  }

  function pickDuration(m: number) {
    setMinutes(m);
    if (startHour !== null && !fits(startHour)) {
      setStartHour(null);
    }
  }

  function proceed() {
    if (!validSelection) return;
    const params = new URLSearchParams({
      date,
      start: String(startHour),
      hours: String(hours),
    });
    if (unit !== "any") params.set("unit", String(unit));
    router.push(`/book/${court.slug}?${params}`);
  }

  return (
    <div className="panel self-start">
      <p className="font-mono text-xl font-semibold">
        {peso(court.price)}
        <span className="text-xs font-normal text-muted"> / hour</span>
      </p>
      <p className="mt-1 text-[12px] text-muted">
        {court.units} {court.units === 1 ? sport.unitLabel : sport.unitLabelPlural} · open{" "}
        {hourLabel(court.opens)}–{hourLabel(court.closes)}
      </p>

      {/* ---- which court ---- */}
      {multiUnit && (
        <>
          <p className="field-label mt-5">Choose {sport.unitLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickUnit("any")}
              aria-pressed={unit === "any"}
              className={`rounded-[9px] border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                unit === "any"
                  ? "border-ball-yellow bg-ball-yellow text-ink"
                  : "border-line-white/14 text-line-white hover:border-line-white/35"
              }`}
            >
              Any {sport.unitLabel}
            </button>
            {Array.from({ length: court.units }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickUnit(i)}
                aria-pressed={unit === i}
                className={`rounded-[9px] border px-3 py-2 text-[12.5px] font-bold transition-colors ${
                  unit === i
                    ? "border-ball-yellow bg-ball-yellow text-ink"
                    : "border-line-white/14 text-line-white hover:border-line-white/35"
                }`}
              >
                {unitLabelFor(court, i)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            {unit === "any"
              ? "We'll assign the next free court — shown on your confirmation."
              : `Showing availability for ${unitLabelFor(court, unit)} only.`}
          </p>
        </>
      )}

      {/* ---- date ---- */}
      <p className="field-label mt-5">Select date</p>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {dates.map((d) => {
          const { weekday, day } = chipParts(d);
          const active = d === date;
          return (
            <button
              key={d}
              type="button"
              onClick={() => pickDate(d)}
              aria-pressed={active}
              className={`w-[52px] flex-none rounded-[10px] border py-2 text-center text-xs transition-colors ${
                active
                  ? "border-ball-yellow bg-ball-yellow text-ink"
                  : "border-line-white/14 text-muted hover:border-line-white/35"
              }`}
            >
              {weekday}
              <b className={`block text-[15px] ${active ? "text-ink" : "text-line-white"}`}>{day}</b>
            </button>
          );
        })}
      </div>

      {/* ---- duration ---- */}
      <p className="field-label mt-5">Duration</p>
      <div className="flex gap-2">
        {durations.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pickDuration(m)}
            aria-pressed={m === minutes}
            className={`flex-1 rounded-[9px] border py-2 font-mono text-[12.5px] transition-colors ${
              m === minutes
                ? "border-ball-yellow bg-ball-yellow text-ink"
                : "border-line-white/14 text-line-white hover:border-line-white/35"
            }`}
          >
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </button>
        ))}
      </div>

      {/* ---- time ---- */}
      <p className="field-label mt-5">Select start time</p>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s) => {
          const ok = selectable.has(s.hour);
          const active = startHour === s.hour;
          return (
            <button
              key={s.hour}
              type="button"
              disabled={!ok}
              onClick={() => setStartHour(s.hour)}
              aria-pressed={active}
              title={
                ok
                  ? `${rangeLabel(s.hour, hours)} · ${peso(q.subtotal)}`
                  : s.taken
                    ? "Already booked"
                    : "Not enough time left before closing"
              }
              className={`rounded-[9px] border py-2.5 text-center font-mono text-[12.5px] transition-colors ${
                active
                  ? "border-ball-yellow bg-ball-yellow text-ink"
                  : ok
                    ? "border-line-white/14 text-line-white hover:border-line-white/35"
                    : "cursor-not-allowed border-line-white/8 text-line-white/25 line-through"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ---- quote ---- */}
      <div className="mt-5 border-t border-line-white/8 pt-4">
        <Row
          label={`${peso(court.price)} × ${hours} ${hours === 1 ? "hour" : "hours"}`}
          value={peso(q.subtotal)}
        />
        <Row label="Service fee" value={peso(q.serviceFee)} muted />
        <div className="mt-3 flex items-center justify-between border-t border-line-white/8 pt-3">
          <span className="text-sm font-semibold">Total</span>
          <b className="font-mono text-lg">{peso(q.total)}</b>
        </div>
      </div>

      <button
        type="button"
        onClick={proceed}
        disabled={!validSelection}
        className="btn btn-solid mt-4 w-full py-3.5 text-sm"
      >
        {validSelection ? "Continue to checkout" : "Pick a time slot"}
      </button>

      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
        {validSelection
          ? `${rangeLabel(startHour, hours)} · free cancellation up to 12 hours before`
          : "You won't be charged until you confirm on the next screen."}
      </p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[13.5px]">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
