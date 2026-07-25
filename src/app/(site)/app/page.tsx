import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COURTS } from "@/lib/data/courts";
import { SPORTS } from "@/lib/data/sports";
import { peso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mobile app",
  description:
    "The Courtix app mirrors the web directory and booking flow — search, filter by sport, pick a slot, and pay in under 30 seconds.",
};

export default function AppPage() {
  return (
    <div className="pt-14 pb-8">
      <div className="shell">
        <p className="eyebrow mb-4">Same backend, mobile-first</p>
        <h1 className="mb-4 max-w-[640px] text-[clamp(32px,4.6vw,52px)] leading-[1.0]">
          Book from anywhere, courtside included.
        </h1>
        <p className="mb-14 max-w-[520px] text-[15.5px] leading-relaxed text-muted">
          The app reads the same availability API as the website, so a slot booked on a phone
          disappears from the web grid immediately. Search, filter by sport, pick a slot, pay.
        </p>

        <div className="grid items-center gap-16 lg:grid-cols-[auto_1fr]">
          <PhoneMock />

          <div className="max-w-[440px]">
            <div className="flex flex-col gap-9">
              {[
                {
                  t: "Explore",
                  b: "Search by venue name or browse by sport. Location-aware, so the nearest open courts come first.",
                },
                {
                  t: "Book in three taps",
                  b: "Date strip, slot grid, confirm. The same duration rules as the web checkout — you can't select a slot that runs past closing.",
                },
                {
                  t: "Bookings",
                  b: "Every upcoming and past booking with its CTX- reference, ready to show at the gate without an internet connection.",
                },
                {
                  t: "Host companion",
                  b: "Owners get the same dashboard on mobile — approve bookings, block hours, and check payouts from the court itself.",
                },
              ].map((f, i) => (
                <div key={f.t} className="flex gap-5 border-t border-line-white/10 pt-5">
                  <span className="flex-none font-mono text-sm text-ball-yellow">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="mb-2 font-sans text-[16px] font-extrabold normal-case tracking-normal">
                      {f.t}
                    </h2>
                    <p className="text-[13.5px] leading-relaxed text-muted">{f.b}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/waitlist" className="btn btn-solid">
                Get early access
              </Link>
              <Link href="/courts" className="btn btn-ghost">
                Use the web app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static phone frame showing the app's explore screen. */
function PhoneMock() {
  const cards = COURTS.slice(0, 5);

  return (
    <div className="mx-auto h-[700px] w-[340px] flex-none rounded-[44px] border-2 border-line-white/8 bg-[#05100D] p-3.5 shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
      <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-court-deep">
        <div className="absolute left-1/2 top-0 z-10 h-[22px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-[#05100D]" />

        <div className="flex items-center justify-between px-[18px] pb-2.5 pt-[22px]">
          <span className="inline-flex items-center gap-2 font-display text-[15px] uppercase">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-ball-yellow" />
            Courtix
          </span>
          <span className="font-mono text-[11px] text-muted">Tagum</span>
        </div>

        <div className="mx-[18px] mb-3.5 rounded-xl bg-line-white/8 px-3.5 py-2.5 text-[12.5px] text-muted">
          Search courts near you
        </div>

        <div className="no-scrollbar mb-3.5 flex gap-2 overflow-x-auto px-[18px]">
          <span className="flex-none rounded-full border border-ball-yellow bg-ball-yellow px-3 py-2 text-[11.5px] font-bold text-ink">
            All
          </span>
          {SPORTS.map((s) => (
            <span
              key={s.slug}
              className="flex-none rounded-full border border-line-white/16 px-3 py-2 text-[11.5px] font-bold text-muted"
            >
              {s.name}
            </span>
          ))}
        </div>

        <div className="no-scrollbar flex h-[400px] flex-col gap-3 overflow-y-auto px-[18px]">
          {cards.map((c) => (
            <div key={c.id} className="flex overflow-hidden rounded-[14px] bg-card">
              <div className="relative h-[74px] w-[92px] flex-none">
                <Image src={c.images[0].src} alt="" fill sizes="92px" className="object-cover" />
              </div>
              <div className="flex-1 px-3 py-2.5">
                <p className="text-[13px] font-extrabold leading-tight">{c.name}</p>
                <p className="mb-1.5 mt-0.5 text-[10.5px] text-muted">{c.city}</p>
                <p className="font-mono text-[12px]">
                  {peso(c.price)}
                  <span className="text-[10px] text-muted">/hr · ★{c.rating.toFixed(1)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-line-white/6 bg-[#05100D]/90 pb-5 pt-3.5 backdrop-blur-[6px]">
          {[
            { i: "◆", l: "Explore", on: true },
            { i: "▤", l: "Bookings", on: false },
            { i: "♡", l: "Saved", on: false },
            { i: "●", l: "Profile", on: false },
          ].map((t) => (
            <span
              key={t.l}
              className={`text-center text-[9.5px] ${t.on ? "font-bold text-ball-yellow" : "text-muted"}`}
            >
              <span className="mb-0.5 block text-base">{t.i}</span>
              {t.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
