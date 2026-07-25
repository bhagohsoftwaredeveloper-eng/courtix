"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { quote } from "@/lib/availability";
import { unitLabelFor } from "@/lib/data/courts";
import { dateLabelLong, peso, rangeLabel } from "@/lib/format";
import { bookingSchema, fieldErrors } from "@/lib/validation";
import type { Court } from "@/lib/types";

/**
 * Checkout. Collects player details, then POSTs to /api/bookings.
 *
 * The server recomputes the price and re-checks the slot, so a 409 here is a
 * real race (someone booked the same hour first), not a client bug — we surface
 * it plainly and send the user back to pick again.
 */
export function CheckoutForm({
  court,
  date,
  startHour,
  hours,
  unitIndex,
}: {
  court: Court;
  date: string;
  startHour: number;
  hours: number;
  /** Preferred court chosen on the picker, or undefined for auto-assign. */
  unitIndex?: number;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const q = quote(court, hours);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      courtId: court.id,
      date,
      startHour,
      hours,
      ...(unitIndex !== undefined ? { unitIndex } : {}),
      playerName: String(fd.get("playerName") ?? ""),
      playerEmail: String(fd.get("playerEmail") ?? ""),
      playerPhone: String(fd.get("playerPhone") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };

    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();

      if (res.status === 409) {
        setErrors({ _: body.message });
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setErrors(body.errors ?? { _: body.message ?? "Couldn't complete the booking." });
        setSubmitting(false);
        return;
      }

      router.push(`/bookings/${body.ref}`);
    } catch {
      setErrors({ _: "Couldn't reach the server. Check your connection and try again." });
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
      <form onSubmit={onSubmit} noValidate>
        <h2 className="mb-1.5 font-sans text-xl font-extrabold normal-case tracking-normal">
          Who’s playing?
        </h2>
        <p className="mb-7 text-[13.5px] text-muted">
          We’ll send the booking reference and gate instructions here.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.playerName} className="sm:col-span-2">
            <input name="playerName" className="field" placeholder="Juan dela Cruz" autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.playerEmail}>
            <input
              name="playerEmail"
              type="email"
              className="field"
              placeholder="juan@example.ph"
              autoComplete="email"
            />
          </Field>
          <Field label="Mobile" error={errors.playerPhone}>
            <input
              name="playerPhone"
              type="tel"
              className="field"
              placeholder="09171234567"
              autoComplete="tel"
            />
          </Field>
          <Field label="Notes for the host (optional)" error={errors.notes} className="sm:col-span-2">
            <textarea
              name="notes"
              rows={3}
              className="field resize-y"
              placeholder="e.g. we'll need 4 paddles, arriving 15 minutes early"
            />
          </Field>
        </div>

        <h2 className="mb-1.5 mt-10 font-sans text-xl font-extrabold normal-case tracking-normal">
          Payment
        </h2>
        <p className="mb-5 text-[13.5px] text-muted">
          This prototype confirms without charging. Card and GCash go live in Phase 3.
        </p>
        <div className="panel flex items-center gap-4 opacity-70">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-court-deep font-mono text-sm">
            ₱
          </span>
          <div>
            <p className="text-[13.5px] font-bold">Pay at the venue</p>
            <p className="text-[12px] text-muted">Online payment coming soon</p>
          </div>
        </div>

        {errors._ && (
          <div className="mt-6 rounded-[10px] border border-board-red/40 bg-board-red/10 px-4 py-3.5">
            <p className="text-[13px] text-[#ff9370]">{errors._}</p>
            <button
              type="button"
              onClick={() => router.push(`/courts/${court.slug}`)}
              className="mt-2 text-[12.5px] font-bold text-ball-yellow underline underline-offset-4"
            >
              Pick a different time
            </button>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-solid mt-7 w-full py-4 text-sm">
          {submitting ? "Confirming…" : `Confirm booking · ${peso(q.total)}`}
        </button>
        <p className="mt-3 text-center text-[11.5px] text-muted">
          Free cancellation up to 12 hours before your slot.
        </p>
      </form>

      {/* ---- summary ---- */}
      <aside className="panel self-start lg:sticky lg:top-24">
        <h2 className="mb-5 font-sans text-base font-extrabold normal-case tracking-normal">
          Booking summary
        </h2>
        <dl className="flex flex-col gap-3 text-[13.5px]">
          <SummaryRow k="Venue" v={court.name} />
          <SummaryRow
            k="Court"
            v={unitIndex !== undefined ? unitLabelFor(court, unitIndex) : "Next available"}
          />
          <SummaryRow k="Location" v={court.loc} />
          <SummaryRow k="Date" v={dateLabelLong(date)} />
          <SummaryRow k="Time" v={rangeLabel(startHour, hours)} />
          <SummaryRow k="Duration" v={`${hours} ${hours === 1 ? "hour" : "hours"}`} />
        </dl>

        <div className="mt-5 border-t border-line-white/8 pt-4">
          <div className="flex justify-between py-1 text-[13.5px]">
            <span>
              {peso(court.price)} × {hours}
            </span>
            <span className="font-mono">{peso(q.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-muted">Service fee (6%)</span>
            <span className="font-mono">{peso(q.serviceFee)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line-white/8 pt-3">
            <span className="text-sm font-semibold">Total</span>
            <b className="font-mono text-lg text-ball-yellow">{peso(q.total)}</b>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="flex-none text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-[11.5px] text-[#ff9370]">{error}</span>}
    </label>
  );
}
