import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourt } from "@/lib/data/courts";
import { getSport } from "@/lib/data/sports";
import { dateLabelLong, peso, rangeLabel } from "@/lib/format";
import { getStorage } from "@/lib/server/storage";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false },
};

export default async function BookingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const booking = await getStorage().findBooking(ref);
  if (!booking) notFound();

  const court = getCourt(booking.courtId);
  const sport = getSport(booking.sport);

  return (
    <div className="shell max-w-[720px] py-16">
      <div className="panel text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-ball-yellow text-2xl text-ink">
          ✓
        </div>
        <h1 className="mb-2.5 font-sans text-[26px] font-extrabold normal-case tracking-normal">
          Booking confirmed
        </h1>
        <p className="mb-8 text-sm text-muted">
          We’ve emailed the details to{" "}
          <span className="text-line-white">{booking.playerEmail}</span>
        </p>

        <div className="mb-8 rounded-[14px] border border-ball-yellow/30 bg-ball-yellow/8 py-6">
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-muted">
            Show this at the gate
          </p>
          <p className="font-mono text-[30px] font-semibold tracking-[0.06em] text-ball-yellow">
            {booking.ref}
          </p>
        </div>

        <dl className="flex flex-col gap-3.5 text-left text-[13.5px]">
          <Row k="Venue" v={booking.courtName} />
          <Row k="Your court" v={booking.unitLabel} />
          {court && <Row k="Location" v={court.loc} />}
          {sport && <Row k="Sport" v={sport.name} />}
          <Row k="Date" v={dateLabelLong(booking.date)} />
          <Row k="Time" v={rangeLabel(booking.startHour, booking.hours)} />
          <Row k="Booked for" v={booking.playerName} />
          <Row k="Contact" v={booking.playerPhone} />
          {booking.notes && <Row k="Notes" v={booking.notes} />}
        </dl>

        <div className="mt-6 border-t border-line-white/8 pt-5 text-left">
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-muted">Subtotal</span>
            <span className="font-mono">{peso(booking.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-muted">Service fee</span>
            <span className="font-mono">{peso(booking.serviceFee)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line-white/8 pt-3">
            <span className="text-sm font-semibold">Total</span>
            <b className="font-mono text-lg">{peso(booking.total)}</b>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/courts" className="btn btn-solid">
            Book another court
          </Link>
          {court && (
            <Link href={`/courts/${court.slug}`} className="btn btn-ghost">
              Back to {court.name}
            </Link>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted">
        Need to cancel? Free up to 12 hours before your slot — reply to your confirmation email or
        call the venue directly.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-white/6 pb-3 last:border-0">
      <dt className="flex-none text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
