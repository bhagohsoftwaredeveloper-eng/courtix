import Link from "next/link";
import { CourtCard } from "@/components/CourtCard";
import { CourtDiagram } from "@/components/CourtDiagram";
import { OpenPlayCard } from "@/components/OpenPlayCard";
import { SportCard } from "@/components/SportCard";
import { WaitlistForm } from "@/components/WaitlistForm";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { COURTS } from "@/lib/data/courts";
import { allOpenPlays } from "@/lib/data/openplays";
import { SPORTS } from "@/lib/data/sports";
import type { OpenPlayStatus } from "@/lib/server/openplay-status";

/**
 * Seat status from the seed alone — no storage read — so the homepage stays a
 * static teaser. The /open-plays pages show live counts that include real joins.
 */
function seededStatus(seeded: number, capacity: number): OpenPlayStatus {
  const filled = Math.min(seeded, capacity);
  return {
    filled,
    capacity,
    spotsLeft: Math.max(0, capacity - filled),
    isFull: filled >= capacity,
    waitlistCount: 0,
  };
}

const STATS = [
  { value: "412", label: "Courts listed" },
  { value: "18", label: "Cities" },
  { value: "9,340", label: "Bookings this month" },
  { value: "4.8", label: "Avg. host rating" },
];

const STEPS = [
  {
    n: "01",
    title: "Find your court",
    body: "Filter by sport, city, and price. Every listing shows real photos, amenities, and what the hour actually costs — no calling ahead to ask.",
  },
  {
    n: "02",
    title: "Pick a slot that's open",
    body: "Availability is live. If the grid says 7:00 PM is free, it's free — the slot is held the moment you reach checkout.",
  },
  {
    n: "03",
    title: "Play",
    body: "Pay online, show your booking reference at the gate. Free cancellation up to 12 hours before, refunded to the same account.",
  },
];

export default function HomePage() {
  const today = upcomingDates(1)[0];
  const featured = COURTS.slice(0, 6);
  const happening = allOpenPlays().slice(0, 3);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <header className="relative overflow-hidden pt-[88px] pb-[60px]">
        <div className="shell grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow mb-[18px]">Every sport, every court, one booking</p>
            <h1 className="mb-5 text-[clamp(38px,5.4vw,68px)] leading-[0.98]">
              Find the court.
              <br />
              Play <span className="text-ball-yellow">today.</span>
            </h1>
            <p className="mb-7 max-w-[460px] text-[17px] leading-relaxed text-muted">
              Book pickleball, badminton, basketball, and golf courts by the hour — or don&rsquo;t
              have a full group? Join an open play and find a game near you.
            </p>
            <div className="mb-11 flex flex-wrap gap-3.5">
              <Link href="/courts" className="btn btn-solid">
                Book a court
              </Link>
              <Link href="/open-plays" className="btn btn-ghost">
                Find a game
              </Link>
            </div>
            <dl className="flex flex-wrap gap-9">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dd className="font-mono text-[26px] leading-tight">{s.value}</dd>
                  <dt className="text-xs uppercase tracking-[0.04em] text-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <CourtDiagram />
        </div>
      </header>

      {/* -------------------------------------------------------- by sport */}
      <section className="pt-5 pb-16" id="sports">
        <div className="shell">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3.5">
            <h2 className="text-[28px]">Book by sport</h2>
            <Link href="/sports" className="text-[13px] font-bold text-ball-yellow">
              All sports →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {SPORTS.map((s) => (
              <SportCard key={s.slug} sport={s} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- directory */}
      <section className="pb-20">
        <div className="shell">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3.5">
            <div>
              <h2 className="text-[28px]">Available near you</h2>
              <p className="mt-1.5 text-[13px] text-muted">
                Live slots for today across Davao del Norte and Davao del Sur
              </p>
            </div>
            <Link href="/courts" className="text-[13px] font-bold text-ball-yellow">
              See all {COURTS.length} courts →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourtCard key={c.id} court={c} slotsLeft={openSlotsToday(c, today)} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- happening this week */}
      <section className="pb-20">
        <div className="shell">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3.5">
            <div>
              <h2 className="text-[28px]">Happening this week</h2>
              <p className="mt-1.5 text-[13px] text-muted">
                Open plays you can join solo — pay per head, meet people, just show up
              </p>
            </div>
            <Link href="/open-plays" className="text-[13px] font-bold text-ball-yellow">
              All open plays →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {happening.map((p) => (
              <OpenPlayCard key={p.id} play={p} status={seededStatus(p.seededJoined, p.capacity)} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="border-y border-line-white/8 bg-court-green/30 py-20">
        <div className="shell">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="mb-12 max-w-[620px] text-[clamp(26px,3.4vw,38px)] leading-[1.05]">
            Three steps, thirty seconds, no group chat.
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t border-line-white/12 pt-5">
                <p className="mb-3 font-mono text-sm text-ball-yellow">{s.n}</p>
                <h3 className="mb-2.5 font-sans text-lg font-extrabold normal-case tracking-normal">
                  {s.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
          <Link href="/how-it-works" className="btn btn-ghost mt-10">
            Read the full walkthrough
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------- for owners */}
      <section className="py-20">
        <div className="shell grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">For court owners</p>
            <h2 className="mb-4 text-[clamp(26px,3.4vw,38px)] leading-[1.05]">
              Your empty hours are the whole problem.
            </h2>
            <p className="mb-6 max-w-[460px] text-[15px] leading-relaxed text-muted">
              Most courts sit idle 60% of the week and fully booked on Saturday. Courtix fills the
              gaps — you set the rate and the hours, we bring the players and handle the payment.
            </p>
            <ul className="mb-8 flex flex-col gap-3">
              {[
                "No listing fee, no monthly fee — 6% only when you get booked",
                "Payouts twice a month, straight to your bank or GCash",
                "Block out maintenance and league hours in one tap",
                "See utilisation per court, per hour, per week",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[13.5px] text-line-white/85">
                  <span className="mt-0.5 text-ball-yellow">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/list-your-court" className="btn btn-solid">
                List your court
              </Link>
              <Link href="/owner" className="btn btn-ghost">
                See the owner dashboard
              </Link>
            </div>
          </div>

          <div className="panel">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Kitchen Line Club · this month
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: "Bookings", v: "128", d: "↑ 18.5%" },
                { l: "Revenue", v: "₱45,680", d: "↑ 15.7%" },
                { l: "Utilisation", v: "78%", d: "↑ 8.2%" },
                { l: "Repeat players", v: "62%", d: "↑ 4.1%" },
              ].map((k) => (
                <div key={k.l} className="rounded-[12px] bg-court-deep/60 p-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.05em] text-muted">{k.l}</p>
                  <p className="font-mono text-xl font-semibold">{k.v}</p>
                  <p className="mt-1 text-[11.5px] text-ball-yellow">{k.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex h-[110px] items-end gap-2.5">
              {[38, 55, 70, 48, 90, 100, 64].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[5px] bg-gradient-to-b from-ball-yellow to-kitchen-blue opacity-90"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-2.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="flex-1 text-center text-[10.5px] text-muted">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- waitlist */}
      <section className="border-t border-line-white/8 py-20" id="waitlist">
        <div className="shell grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow mb-4">Not in your city yet?</p>
            <h2 className="mb-4 text-[clamp(26px,3.4vw,38px)] leading-[1.05]">
              Get on the list. We open cities in the order people ask.
            </h2>
            <p className="mb-7 max-w-[420px] text-[15px] leading-relaxed text-muted">
              Courtix is live across Davao del Norte and Davao del Sur, and we’re onboarding the
              next cities now. Tell us where you play — the cities with the longest waitlists go
              first.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { k: "First booking free", v: "Every waitlist member, no code needed" },
                { k: "Founding host rate", v: "3% commission for the first year, if you own a court" },
                { k: "One email", v: "We write once, when we launch where you play" },
              ].map((b) => (
                <div key={b.k} className="border-l-2 border-ball-yellow pl-4">
                  <p className="text-sm font-bold">{b.k}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{b.v}</p>
                </div>
              ))}
            </div>
          </div>

          <WaitlistForm />
        </div>
      </section>
    </>
  );
}
