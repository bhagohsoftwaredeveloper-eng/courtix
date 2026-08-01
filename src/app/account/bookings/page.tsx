import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingsHeader, EmptyState } from "@/app/account/bookings/BookingsHeader";
import { Table, Td } from "@/components/dashboard/parts";
import { upcomingDates } from "@/lib/availability";
import { getCourt } from "@/lib/data/courts";
import { sportName } from "@/lib/data/sports";
import { dateLabel, peso, rangeLabel } from "@/lib/format";
import { getCurrentPlayer } from "@/lib/server/player";
import { getStorage } from "@/lib/server/storage";
import type { Booking } from "@/lib/types";

export const metadata: Metadata = { title: "My bookings" };

export const dynamic = "force-dynamic";

/**
 * Only the three states a Courtix booking can actually be in. The reference
 * design also had "Refunded" and "Rejected": refunded is a property of the
 * payment rather than the booking, and nothing rejects a booking — Courtix
 * confirms instantly, with no host-approval step to decline it.
 */
const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const STATUS_TONE: Record<Booking["status"], string> = {
  confirmed: "status-open",
  pending: "status-pending",
  cancelled: "status-booked",
};

const EMPTY_COPY: Record<FilterId, { title: string; body: string }> = {
  upcoming: {
    title: "No upcoming bookings",
    body: "You don't have any upcoming court reservations. Ready to play?",
  },
  past: {
    title: "No past bookings",
    body: "Once you've played a session, it moves here so you can look up the reference.",
  },
  cancelled: {
    title: "No cancelled bookings",
    body: "Nothing cancelled — which is the way it should be.",
  },
};

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/account/bookings");

  const { filter } = await searchParams;
  const active: FilterId = FILTERS.some((f) => f.id === filter) ? (filter as FilterId) : "upcoming";

  const today = upcomingDates(1)[0];
  const storage = getStorage();
  const [allBookings, allJoins] = await Promise.all([
    storage.listBookings(),
    storage.listOpenPlayJoins(),
  ]);

  const mine = allBookings
    .filter((b) => b.playerEmail.toLowerCase() === player.email.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date) || b.startHour - a.startHour);

  const myJoinCount = allJoins.filter(
    (j) => j.playerEmail.toLowerCase() === player.email.toLowerCase(),
  ).length;

  // A cancelled booking is never upcoming or past — it belongs in its own
  // bucket whatever its date says, because it will never be played.
  const buckets: Record<FilterId, Booking[]> = {
    upcoming: mine.filter((b) => b.status !== "cancelled" && b.date >= today),
    past: mine.filter((b) => b.status !== "cancelled" && b.date < today),
    cancelled: mine.filter((b) => b.status === "cancelled"),
  };
  const rows = buckets[active];

  return (
    <>
      <BookingsHeader active="court" counts={{ court: mine.length, openPlays: myJoinCount }} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "upcoming" ? "/account/bookings" : `/account/bookings?filter=${f.id}`}
            aria-current={f.id === active ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors ${
              f.id === active
                ? "border-ball-yellow bg-ball-yellow text-ink"
                : "border-line-white/18 text-muted hover:border-line-white/40 hover:text-line-white"
            }`}
          >
            {f.label}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">
              {buckets[f.id].length}
            </span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="▤"
          title={EMPTY_COPY[active].title}
          body={EMPTY_COPY[active].body}
          cta={{ href: "/courts", label: "Book a court" }}
        />
      ) : (
        <div className="panel">
          <Table head={["Reference", "Court", "Sport", "When", "Total", "Status"]}>
            {rows.map((b) => {
              const court = getCourt(b.courtId);
              return (
                <tr key={b.ref}>
                  <Td mono>
                    <Link href={`/bookings/${b.ref}`} className="font-bold text-ball-yellow">
                      {b.ref}
                    </Link>
                  </Td>
                  <Td>
                    {court?.name ?? b.courtName}
                    <span className="block text-[10.5px] text-muted">{b.unitLabel}</span>
                  </Td>
                  <Td>{sportName(b.sport)}</Td>
                  <Td>
                    {dateLabel(b.date)}
                    <span className="block text-[10.5px] text-muted">
                      {rangeLabel(b.startHour, b.hours)}
                    </span>
                  </Td>
                  <Td mono>{peso(b.total)}</Td>
                  <Td>
                    <span className={`status-chip ${STATUS_TONE[b.status]}`}>{b.status}</span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}
    </>
  );
}
