import type { Metadata } from "next";
import Image from "next/image";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SPORTS } from "@/lib/data/sports";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "Courtix opens cities in the order people ask for them. Join the waitlist and get your first booking free when we launch where you play.",
};

const FAQ = [
  {
    q: "When will you launch in my city?",
    a: "We open cities in waitlist order — the more players and owners from one area, the sooner it moves up. Davao del Norte and Davao del Sur are live now; the next three cities are decided each quarter.",
  },
  {
    q: "Does it cost anything to join?",
    a: "No. The waitlist is free, and joining doesn't commit you to anything. When we launch in your city you'll get one email, and your first booking is on us.",
  },
  {
    q: "I own a court — is this the right form?",
    a: "Yes. Pick \"I own a court\" and we'll route you to the host onboarding team instead of the player list. Waitlist hosts get 3% commission for their first year instead of the standard 6%.",
  },
  {
    q: "What do you do with my details?",
    a: "We email you once, when Courtix launches where you play. We don't sell your data, and there's an unsubscribe link on everything we send.",
  },
];

export default function WaitlistPage() {
  return (
    <>
      <div className="relative overflow-hidden border-b border-line-white/8">
        <div className="absolute inset-0 opacity-25">
          <Image src="/images/sports/pickleball-3.svg" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-court-deep/60 to-court-deep" />

        <div className="shell relative grid items-start gap-14 py-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow mb-4">Waitlist</p>
            <h1 className="mb-4 text-[clamp(32px,4.6vw,52px)] leading-[1.0]">
              Be first on the court when we open your city.
            </h1>
            <p className="mb-8 max-w-[440px] text-[15.5px] leading-relaxed text-muted">
              Courtix is live across Davao del Norte and Davao del Sur. Tell us where you play and
              which sports you care about — cities with the longest lists go next.
            </p>

            <div className="mb-8 flex flex-col gap-4">
              {[
                { k: "First booking free", v: "Every waitlist member, no promo code" },
                { k: "Founding host rate", v: "3% commission for year one if you list a court" },
                { k: "One email, ever", v: "We write when we launch. That's the whole deal." },
              ].map((b) => (
                <div key={b.k} className="border-l-2 border-ball-yellow pl-4">
                  <p className="text-sm font-bold">{b.k}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{b.v}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <span
                  key={s.slug}
                  className="rounded-full border border-line-white/14 px-3 py-1.5 font-mono text-[11px] text-muted"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          <WaitlistForm />
        </div>
      </div>

      <section className="py-16">
        <div className="shell max-w-[760px]">
          <h2 className="mb-8 text-[26px]">Questions people actually ask</h2>
          <dl className="flex flex-col">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-line-white/8 py-6 first:pt-0">
                <dt className="mb-2 font-sans text-[15.5px] font-extrabold normal-case tracking-normal">
                  {f.q}
                </dt>
                <dd className="text-[13.5px] leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
