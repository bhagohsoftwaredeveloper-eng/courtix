import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";
import { peso } from "@/lib/format";

export const metadata: Metadata = {
  title: "List your court",
  description:
    "List your pickleball, badminton, basketball or golf facility on Courtix. No listing fee, no monthly fee — 6% only when you get booked.",
};

const NUMBERS = [
  { v: "0", l: "Listing fee" },
  { v: "6%", l: "Per booking, that's it" },
  { v: "2×", l: "Payouts per month" },
  { v: "78%", l: "Avg. host utilisation" },
];

export default function ListYourCourtPage() {
  return (
    <>
      <header className="border-b border-line-white/8 py-16">
        <div className="shell grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow mb-4">For court owners</p>
            <h1 className="mb-4 text-[clamp(32px,4.6vw,52px)] leading-[1.0]">
              Your court is empty <span className="text-ball-yellow">62%</span> of the week.
            </h1>
            <p className="mb-8 max-w-[460px] text-[15.5px] leading-relaxed text-muted">
              Saturdays sell themselves. Tuesday at 2pm doesn’t. Courtix puts your open hours in
              front of players who are actively looking to book right now — and handles the
              scheduling, payment, and no-shows so you don’t have to.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/list-your-court/start" className="btn btn-solid">
                Start hosting now
              </Link>
              <Link href="#apply" className="btn btn-ghost">
                Talk to onboarding
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4">
            {NUMBERS.map((n) => (
              <div key={n.l} className="panel">
                <dd className="font-mono text-[32px] leading-none">{n.v}</dd>
                <dt className="mt-2.5 text-[12px] uppercase tracking-[0.05em] text-muted">{n.l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="py-16">
        <div className="shell">
          <h2 className="mb-10 text-[26px]">What you get</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                t: "A calendar players can actually book",
                b: "Set your rate and your hours once. Players see live availability and book without messaging you. Block league nights and maintenance in one tap.",
              },
              {
                t: "Money that arrives on schedule",
                b: `Courtix collects at checkout, keeps 6%, and remits the rest on the 15th and 30th. A ${peso(500)}/hr court booked 40 hours a month nets you ${peso(18800)}.`,
              },
              {
                t: "Numbers you can act on",
                b: "Utilisation by court, by hour, by weekday. See which hours never sell so you can discount them instead of staring at an empty court.",
              },
              {
                t: "Fewer no-shows",
                b: "Card-backed bookings and a 12-hour cancellation window mean people turn up. Hosts on Courtix report no-shows dropping from 1-in-6 to under 1-in-20.",
              },
              {
                t: "Players you didn't have",
                b: "18,940 registered players across Davao. Most first bookings at a venue come from someone who'd never heard of it before Courtix.",
              },
              {
                t: "Support that answers",
                b: "Disputes, refunds, and damage claims go through us. You get a decision within 48 hours instead of arguing over Messenger.",
              },
            ].map((c) => (
              <div key={c.t} className="panel">
                <h3 className="mb-2.5 font-sans text-[15px] font-extrabold normal-case tracking-normal">
                  {c.t}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-muted">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line-white/8 py-16" id="apply">
        <div className="shell grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow mb-4">Apply</p>
            <h2 className="mb-4 text-[clamp(26px,3.4vw,38px)] leading-[1.05]">
              Tell us about your facility.
            </h2>
            <p className="mb-7 max-w-[420px] text-[15px] leading-relaxed text-muted">
              Pick <b className="text-line-white">“I own a court”</b> below and our onboarding team
              will reach out within two working days. Listing takes about twenty minutes — photos,
              rates, and opening hours.
            </p>
            <p className="rounded-[12px] border border-ball-yellow/30 bg-ball-yellow/8 px-4 py-3.5 text-[13px] leading-relaxed">
              <b className="text-ball-yellow">Founding host rate:</b> venues that apply before we
              launch in their city pay 3% commission for their first year instead of 6%.
            </p>
          </div>

          <WaitlistForm />
        </div>
      </section>
    </>
  );
}
