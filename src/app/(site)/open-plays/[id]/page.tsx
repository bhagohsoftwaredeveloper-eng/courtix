import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinOpenPlay } from "@/components/JoinOpenPlay";
import { OpenPlayCard, SeatMeter, SkillChip } from "@/components/OpenPlayCard";
import { getCourt } from "@/lib/data/courts";
import { allOpenPlays, getOpenPlay } from "@/lib/data/openplays";
import { sportName } from "@/lib/data/sports";
import { dateLabelLong, peso, rangeLabel } from "@/lib/format";
import { openPlayStatus, openPlayStatuses } from "@/lib/server/openplay-status";
import { getCurrentPlayer } from "@/lib/server/player";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const play = getOpenPlay(id);
  if (!play) return { title: "Session not found" };
  return {
    title: play.title,
    description: `${play.skill} ${sportName(play.sport).toLowerCase()} open play at ${play.courtName}, ${play.city}. ${peso(play.pricePerPlayer)} per player.`,
    robots: { index: false },
  };
}

export default async function OpenPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const play = getOpenPlay(id);
  if (!play) notFound();

  const status = await openPlayStatus(play);
  const court = getCourt(play.courtId);
  // Public page: a signed-out visitor just gets an empty form.
  const player = await getCurrentPlayer();

  const others = allOpenPlays()
    .filter((p) => p.id !== play.id && p.sport === play.sport)
    .slice(0, 3);
  const otherStatuses = await openPlayStatuses(others);

  return (
    <div className="pt-8 pb-8">
      <div className="shell">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-[12.5px] text-muted">
          <Link href="/open-plays" className="hover:text-line-white">
            Open plays
          </Link>
          <span aria-hidden>/</span>
          <span className="text-line-white">{play.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div>
            {court && (
              <div className="relative mb-7 h-[240px] overflow-hidden rounded-[18px] sm:h-[300px]">
                <Image
                  src={court.images[0].src}
                  alt={court.images[0].alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-court-deep via-transparent to-transparent" />
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-court-green px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-ball-yellow">
                {sportName(play.sport)}
              </span>
              <SkillChip skill={play.skill} />
              {play.fastPay && (
                <span className="rounded-full border border-line-white/16 px-3 py-1.5 text-[11px] font-bold text-muted">
                  ⚡ FastPay
                </span>
              )}
            </div>

            <h1 className="mb-2 font-sans text-[clamp(26px,3.6vw,38px)] font-extrabold normal-case leading-[1.08] tracking-normal">
              {play.title}
            </h1>
            <p className="mb-7 text-sm text-muted">
              Hosted by {play.organizer} at{" "}
              {court ? (
                <Link href={`/courts/${court.slug}`} className="text-line-white underline underline-offset-2">
                  {play.courtName}
                </Link>
              ) : (
                play.courtName
              )}
              , {play.city}
            </p>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <Fact k="When" v={`${dateLabelLong(play.date)}`} />
              <Fact k="Time" v={rangeLabel(play.startHour, play.hours)} />
              <Fact k="Skill level" v={play.skill} />
              <Fact k="Price" v={`${peso(play.pricePerPlayer)} per player`} />
            </div>

            <div className="panel mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-sans text-sm font-extrabold normal-case tracking-normal">
                  {status.isFull ? "Session full" : `${status.spotsLeft} spots left`}
                </h2>
                <SeatMeter status={status} />
              </div>
              <p className="text-[13px] leading-relaxed text-muted">
                {status.isFull
                  ? `All ${status.capacity} seats are taken${status.waitlistCount > 0 ? `, and ${status.waitlistCount} on the waitlist` : ""}. Join the waitlist and we'll text you the moment someone drops out.`
                  : `${status.filled} of ${status.capacity} players are in. Grab a seat before it fills — evening sessions usually sell out.`}
              </p>
            </div>

            <div className="panel">
              <h2 className="mb-3 font-sans text-sm font-extrabold normal-case tracking-normal">
                What to know
              </h2>
              <ul className="flex flex-col gap-2.5 text-[13.5px] text-muted">
                <li>Arrive 10 minutes early to warm up — play starts on time.</li>
                <li>
                  Bring your own paddle if you have one; {play.organizer} has loaners at the desk.
                </li>
                <li>
                  {play.fastPay
                    ? "FastPay session — your seat is settled online, nothing to pay at the gate."
                    : "Pay the organizer at the gate; your seat is reserved either way."}
                </li>
                <li>Free to drop out up to 6 hours before — your seat goes to the waitlist.</li>
              </ul>
            </div>
          </div>

          <JoinOpenPlay
            openPlayId={play.id}
            full={status.isFull}
            defaults={{
              name: player?.name ?? "",
              email: player?.email ?? "",
              phone: player?.phone ?? "",
            }}
          />
        </div>

        {others.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 text-[22px]">More {sportName(play.sport).toLowerCase()} sessions</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((p) => (
                <OpenPlayCard key={p.id} play={p} status={otherStatuses.get(p.id)!} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[12px] border border-line-white/8 bg-card/50 p-4">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.05em] text-muted">{k}</p>
      <p className="font-mono text-[13.5px]">{v}</p>
    </div>
  );
}
