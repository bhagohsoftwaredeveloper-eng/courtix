import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CourtCarousel } from "@/components/CourtCarousel";
import { OpenPlayCard } from "@/components/OpenPlayCard";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { COURTS, getCourt } from "@/lib/data/courts";
import { allOpenPlays } from "@/lib/data/openplays";
import { sportName } from "@/lib/data/sports";
import { dateLabel, peso, rangeLabel } from "@/lib/format";
import { openPlayStatuses } from "@/lib/server/openplay-status";
import { getCurrentPlayer } from "@/lib/server/player";
import { getStorage } from "@/lib/server/storage";

export const metadata: Metadata = {
  title: "Your home",
  robots: { index: false },
};

// Reads the player's real bookings, so it must render per request.
export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function PlayerHomePage() {
  const player = await getCurrentPlayer();
  // Middleware already bounced signed-out visitors; this narrows the type and
  // covers a cookie that named a dead session.
  if (!player) redirect("/login?next=/player-home");
  const today = upcomingDates(1)[0];

  // Suggested = the player's saved courts first, then top-rated in their sports.
  const saved = player.savedCourtIds.map((id) => getCourt(id)).filter(Boolean);
  const rest = COURTS.filter(
    (c) => player.favouriteSports.includes(c.sport) && !player.savedCourtIds.includes(c.id),
  ).sort((a, b) => b.rating - a.rating);
  const suggested = [...saved, ...rest].slice(0, 6) as typeof COURTS;
  const slotsLeft = Object.fromEntries(suggested.map((c) => [c.id, openSlotsToday(c, today)]));

  // Open plays that match what the player actually plays.
  const plays = allOpenPlays()
    .filter((p) => player.favouriteSports.includes(p.sport))
    .slice(0, 3);
  const playStatuses = await openPlayStatuses(plays);

  // The player's real bookings from storage, upcoming first.
  const allBookings = await getStorage().listBookings();
  const myBookings = allBookings
    .filter((b) => b.playerEmail === player.email && b.status !== "cancelled")
    .sort((a, b) => (a.date === b.date ? a.startHour - b.startHour : a.date.localeCompare(b.date)));
  const upcoming = myBookings.filter((b) => b.date >= today);

  return (
    <div className="pt-10 pb-8">
      <div className="shell">
        {/* ---- greeting hero ---- */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-3">Ready to play ☀️</p>
            <h1 className="text-[clamp(28px,4vw,44px)] leading-[1.02]">
              {greeting()}, <span className="text-ball-yellow">{player.name.split(" ")[0]}.</span>
            </h1>
            <p className="mt-2.5 text-[14.5px] text-muted">
              Find a court or join an open play near {player.city}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/courts" className="btn btn-solid">
              Browse courts
            </Link>
            <Link href="/open-plays" className="btn btn-ghost">
              Find a game
            </Link>
          </div>
        </div>

        {/* ---- player strip ---- */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Your rating" value={player.rating.toFixed(1)} sub={`${player.skill} · DUPR`} />
          <StatTile label="Upcoming" value={String(upcoming.length)} sub="booked sessions" />
          <StatTile
            label="You play"
            value={player.favouriteSports.map((s) => sportName(s)).join(" · ")}
            sub="favourite sports"
            small
          />
          <StatTile label="Member since" value={player.memberSince} sub={player.city} />
        </div>

        {/* ---- my upcoming bookings ---- */}
        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-[22px]">Your upcoming bookings</h2>
            <Link href="/courts" className="text-[13px] font-bold text-ball-yellow">
              Book another →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-white/15 py-14 text-center">
              <p className="mb-2 font-sans text-[15px] font-extrabold">No bookings yet</p>
              <p className="mb-6 text-[13.5px] text-muted">
                Book a court and it shows up here — try it, the demo saves it for real.
              </p>
              <Link href="/courts" className="btn btn-solid">
                Find a court
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((b) => {
                const court = getCourt(b.courtId);
                return (
                  <div key={b.ref} className="panel">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-court-green px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ball-yellow">
                        {sportName(b.sport)}
                      </span>
                      <span className="font-mono text-[11px] text-muted">{b.ref}</span>
                    </div>
                    <h3 className="font-sans text-[15px] font-extrabold normal-case tracking-normal">
                      {b.courtName}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {b.unitLabel} · {dateLabel(b.date)} · {rangeLabel(b.startHour, b.hours)}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-line-white/8 pt-3">
                      <span className="font-mono text-[13px]">{peso(b.total)}</span>
                      {court && (
                        <Link href={`/bookings/${b.ref}`} className="text-[12px] font-bold text-ball-yellow">
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ---- suggested courts ---- */}
        <section className="mb-14">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-[22px]">Suggested courts</h2>
            <Link href="/courts" className="text-[13px] font-bold text-ball-yellow">
              See all →
            </Link>
          </div>
          <CourtCarousel courts={suggested} slotsLeft={slotsLeft} />
        </section>

        {/* ---- open plays ---- */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-[22px]">Open plays for you</h2>
            <Link href="/open-plays" className="text-[13px] font-bold text-ball-yellow">
              See all →
            </Link>
          </div>
          {plays.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plays.map((p) => (
                <OpenPlayCard key={p.id} play={p} status={playStatuses.get(p.id)!} />
              ))}
            </div>
          ) : (
            <p className="text-muted">No matching sessions right now — check back soon.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: string;
  sub: string;
  small?: boolean;
}) {
  return (
    <div className="panel">
      <p className="mb-2 text-[11px] uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className={`font-mono font-semibold ${small ? "text-[15px]" : "text-[24px]"}`}>{value}</p>
      <p className="mt-1.5 text-[11.5px] text-muted">{sub}</p>
    </div>
  );
}
