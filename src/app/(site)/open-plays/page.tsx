import type { Metadata } from "next";
import Link from "next/link";
import { OpenPlayCard } from "@/components/OpenPlayCard";
import { allOpenPlays } from "@/lib/data/openplays";
import { openPlayStatuses } from "@/lib/server/openplay-status";
import { dateLabel } from "@/lib/format";

export const metadata: Metadata = {
  title: "Open plays",
  description:
    "Join organized drop-in pickleball, badminton and basketball sessions across Davao. Pay per player, meet people, just show up and play.",
};

// Seat counts fold in live joins, so this can't be prerendered.
export const dynamic = "force-dynamic";

export default async function OpenPlaysPage() {
  const plays = allOpenPlays();
  const statuses = await openPlayStatuses(plays);

  // Group by day so the list reads like a schedule.
  const byDate = new Map<string, typeof plays>();
  for (const p of plays) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }

  const openCount = plays.filter((p) => !statuses.get(p.id)!.isFull).length;

  return (
    <div className="pt-14 pb-8">
      <div className="shell">
        <p className="eyebrow mb-4">Open plays</p>
        <h1 className="mb-3 text-[clamp(30px,4.2vw,46px)] leading-[1.02]">
          Don&rsquo;t have four players? <span className="text-ball-yellow">Join a session.</span>
        </h1>
        <p className="mb-10 max-w-[540px] text-[15px] leading-relaxed text-muted">
          Open plays are organized drop-in sessions — buy a single seat, show up, and play with
          whoever&rsquo;s there. Sorted by skill level so you&rsquo;re matched with the right crowd.
          {openCount > 0 && (
            <>
              {" "}
              <b className="text-line-white">{openCount}</b> sessions still have spots.
            </>
          )}
        </p>

        <div className="flex flex-col gap-10">
          {[...byDate.entries()].map(([date, dayPlays]) => (
            <section key={date}>
              <h2 className="mb-4 font-sans text-[15px] font-extrabold normal-case tracking-normal text-muted">
                {dateLabel(date)}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {dayPlays.map((p) => (
                  <OpenPlayCard key={p.id} play={p} status={statuses.get(p.id)!} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-[18px] border border-line-white/8 bg-court-green/30 p-8 text-center">
          <h2 className="mb-2 text-[22px]">Run your own session?</h2>
          <p className="mx-auto mb-6 max-w-[440px] text-[13.5px] leading-relaxed text-muted">
            Hosts and organizers can list open plays on their courts and let players find and pay for
            seats automatically — no more collecting cash in a group chat.
          </p>
          <Link href="/list-your-court" className="btn btn-solid">
            Become a host
          </Link>
        </div>
      </div>
    </div>
  );
}
