import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookingsHeader, EmptyState } from "@/app/account/bookings/BookingsHeader";
import { Table, Td } from "@/components/dashboard/parts";
import { upcomingDates } from "@/lib/availability";
import { allOpenPlays } from "@/lib/data/openplays";
import { sportName } from "@/lib/data/sports";
import { dateLabel, peso, rangeLabel } from "@/lib/format";
import { getCurrentPlayer } from "@/lib/server/player";
import { getStorage } from "@/lib/server/storage";
import type { OpenPlay } from "@/lib/types";

export const metadata: Metadata = { title: "My open plays" };

export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

/** A join paired with the session it belongs to. */
interface JoinedPlay {
  play: OpenPlay;
  waitlisted: boolean;
}

const EMPTY_COPY: Record<FilterId, { title: string; body: string }> = {
  upcoming: {
    title: "No upcoming open plays",
    body: "Open plays are drop-in sessions you buy a single seat in — no need to fill a whole court.",
  },
  past: {
    title: "No past open plays",
    body: "Sessions you've played move here once the date passes.",
  },
};

export default async function MyOpenPlaysPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/account/open-plays");

  const { filter } = await searchParams;
  const active: FilterId = FILTERS.some((f) => f.id === filter) ? (filter as FilterId) : "upcoming";

  const today = upcomingDates(1)[0];
  const storage = getStorage();
  const [joins, bookings] = await Promise.all([
    storage.listOpenPlayJoins(),
    storage.listBookings(),
  ]);

  const plays = allOpenPlays();
  const byId = new Map(plays.map((p) => [p.id, p]));
  const mine: JoinedPlay[] = [];

  for (const j of joins) {
    if (j.playerEmail.toLowerCase() !== player.email.toLowerCase()) continue;
    const play = byId.get(j.openPlayId);
    // Sessions roll forward off the fixture list as they age out; a join whose
    // session is gone has nothing left to show.
    if (!play) continue;
    mine.push({ play, waitlisted: j.waitlisted });
  }
  mine.sort((a, b) => b.play.date.localeCompare(a.play.date));

  const bookingCount = bookings.filter(
    (b) => b.playerEmail.toLowerCase() === player.email.toLowerCase(),
  ).length;

  const buckets: Record<FilterId, JoinedPlay[]> = {
    upcoming: mine.filter((m) => m.play.date >= today),
    past: mine.filter((m) => m.play.date < today),
  };
  const rows = buckets[active];

  return (
    <>
      <BookingsHeader
        active="open-plays"
        counts={{ court: bookingCount, openPlays: mine.length }}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "upcoming" ? "/account/open-plays" : `/account/open-plays?filter=${f.id}`}
            aria-current={f.id === active ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors ${
              f.id === active
                ? "border-ball-yellow bg-ball-yellow text-ink"
                : "border-line-white/18 text-muted hover:border-line-white/40 hover:text-line-white"
            }`}
          >
            {f.label}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">{buckets[f.id].length}</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="☰"
          title={EMPTY_COPY[active].title}
          body={EMPTY_COPY[active].body}
          cta={{ href: "/open-plays", label: "Browse open plays" }}
        />
      ) : (
        <div className="panel">
          <Table head={["Session", "Sport", "Court", "When", "Seat", "Price"]}>
            {rows.map(({ play, waitlisted }) => (
              <tr key={play.id}>
                <Td>
                  <Link href={`/open-plays/${play.id}`} className="font-bold text-ball-yellow">
                    {play.title}
                  </Link>
                  <span className="block text-[10.5px] text-muted">{play.organizer}</span>
                </Td>
                <Td>{sportName(play.sport)}</Td>
                <Td>
                  {play.courtName}
                  <span className="block text-[10.5px] text-muted">{play.city}</span>
                </Td>
                <Td>
                  {dateLabel(play.date)}
                  <span className="block text-[10.5px] text-muted">
                    {rangeLabel(play.startHour, play.hours)}
                  </span>
                </Td>
                <Td>
                  <span className={`status-chip ${waitlisted ? "status-pending" : "status-open"}`}>
                    {waitlisted ? "waitlisted" : "confirmed"}
                  </span>
                </Td>
                <Td mono>{peso(play.pricePerPlayer)}</Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
