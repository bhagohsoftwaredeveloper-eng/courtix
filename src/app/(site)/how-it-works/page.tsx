import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How booking a court on Courtix works — for players and for court owners. Search, book, play, get paid.",
};

const PLAYER_STEPS = [
  {
    n: "01",
    t: "Search what's actually open",
    b: "Filter by sport, city, price, and indoor/outdoor. Every listing shows the real hourly rate, the amenities, and how many slots are left today — so you're never calling ahead to ask.",
  },
  {
    n: "02",
    t: "Pick your slot and duration",
    b: "The grid only lets you select start times where your whole session fits before closing. Book 1 hour, 90 minutes, or a 3-hour block for a team run — whatever the venue supports.",
  },
  {
    n: "03",
    t: "Confirm and get your reference",
    b: "Enter who's playing, confirm, and you get a CTX- reference immediately. The host sees the booking on their dashboard the moment you finish.",
  },
  {
    n: "04",
    t: "Show up and play",
    b: "Show the reference at the gate. Arrive 10 minutes early — the hour runs on the clock, not on arrival. Free cancellation up to 12 hours before.",
  },
];

const OWNER_STEPS = [
  {
    n: "01",
    t: "List your court free",
    b: "Add your courts, set your hourly rate, upload photos, and mark your opening hours. No listing fee and no monthly fee — you only pay when you get booked.",
  },
  {
    n: "02",
    t: "Control your calendar",
    b: "Block out league nights, maintenance, and private hires in one tap. Anything you don't block is bookable, and the grid updates for players instantly.",
  },
  {
    n: "03",
    t: "Get paid twice a month",
    b: "Courtix takes 6% per booking and remits the rest on the 15th and the 30th, to your bank account or GCash. Every payout line is itemised in your dashboard.",
  },
  {
    n: "04",
    t: "See what's working",
    b: "Utilisation by court, by hour, by day of week. Find your dead hours and price them differently — most hosts lift weekday revenue 20% in their first quarter.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-14 pb-8">
      <div className="shell">
        <p className="eyebrow mb-4">How it works</p>
        <h1 className="mb-4 max-w-[720px] text-[clamp(32px,4.6vw,52px)] leading-[1.0]">
          Booking a court should take thirty seconds, not thirty messages.
        </h1>
        <p className="mb-16 max-w-[540px] text-[15.5px] leading-relaxed text-muted">
          Courtix sits between players who can’t find an open court and owners whose courts sit
          empty midweek. Here’s exactly how both sides work.
        </p>

        <Section
          eyebrow="For players"
          title="Find it, book it, play it"
          steps={PLAYER_STEPS}
          cta={{ href: "/courts", label: "Browse courts" }}
        />

        <Section
          eyebrow="For court owners"
          title="Fill the hours nobody books"
          steps={OWNER_STEPS}
          cta={{ href: "/list-your-court", label: "List your court" }}
        />

        <section className="mt-20 rounded-[18px] border border-line-white/8 bg-court-green/30 p-10">
          <h2 className="mb-8 text-[24px]">The bits people ask about</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              {
                q: "What's the 6% service fee?",
                a: "It's added on top of the court's hourly rate at checkout, and it's always shown before you pay. It covers payment processing, the platform, and support when something goes wrong.",
              },
              {
                q: "What if the court is double-booked?",
                a: "It shouldn't happen — slots are checked again at the moment you confirm, and a taken slot is rejected with a clear message. If it ever does, you're refunded in full and we cover your next booking.",
              },
              {
                q: "Can I cancel?",
                a: "Free up to 12 hours before your slot, refunded to the same account. Inside 12 hours the host keeps the booking, because they can no longer resell that hour.",
              },
              {
                q: "Do I need the app?",
                a: "No. Everything works in the browser. The app just makes it faster if you book weekly — same account, same bookings.",
              },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="mb-2 font-sans text-[15px] font-extrabold normal-case tracking-normal">
                  {f.q}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  steps,
  cta,
}: {
  eyebrow: string;
  title: string;
  steps: { n: string; t: string; b: string }[];
  cta: { href: string; label: string };
}) {
  return (
    <section className="mb-20">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="mb-10 text-[clamp(24px,3vw,34px)]">{title}</h2>
      <div className="grid gap-8 md:grid-cols-2">
        {steps.map((s) => (
          <div key={s.n} className="flex gap-5 border-t border-line-white/10 pt-5">
            <p className="flex-none font-mono text-sm text-ball-yellow">{s.n}</p>
            <div>
              <h3 className="mb-2 font-sans text-[16px] font-extrabold normal-case tracking-normal">
                {s.t}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-muted">{s.b}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href={cta.href} className="btn btn-solid mt-9">
        {cta.label}
      </Link>
    </section>
  );
}
