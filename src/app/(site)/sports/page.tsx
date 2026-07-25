import type { Metadata } from "next";
import Link from "next/link";
import { SportCard } from "@/components/SportCard";
import { courtsBySport } from "@/lib/data/courts";
import { SPORTS } from "@/lib/data/sports";
import { peso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sports",
  description:
    "Pickleball, badminton, basketball and golf — every sport bookable by the hour on Courtix.",
};

export default function SportsPage() {
  return (
    <div className="pt-14 pb-8">
      <div className="shell">
        <p className="eyebrow mb-4">Four sports, one booking flow</p>
        <h1 className="mb-3 text-[clamp(30px,4.2vw,46px)] leading-[1.02]">Book by sport</h1>
        <p className="mb-11 max-w-[540px] text-[15px] leading-relaxed text-muted">
          Each sport has its own quirks — court sizes, session lengths, what’s included in the hour.
          Pick yours and we’ll show only what’s relevant.
        </p>

        <div className="mb-14 grid gap-5 md:grid-cols-2">
          {SPORTS.map((s) => (
            <SportCard key={s.slug} sport={s} large />
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SPORTS.map((s) => {
            const listed = courtsBySport(s.slug);
            return (
              <div key={s.slug} className="panel">
                <h2 className="mb-3 font-sans text-base font-extrabold normal-case tracking-normal">
                  {s.name}
                </h2>
                <dl className="mb-4 flex flex-col gap-2 text-[13px]">
                  <Row k="On Courtix" v={`${listed.length} venues`} />
                  <Row k="Nationwide" v={`${s.courtCount} ${s.unitLabelPlural}`} />
                  <Row k="From" v={`${peso(s.fromPrice)}/hr`} />
                  <Row
                    k="Sessions"
                    v={s.durations.map((d) => `${d / 60}h`).join(" · ")}
                  />
                </dl>
                <Link
                  href={`/sports/${s.slug}`}
                  className="text-[13px] font-bold text-ball-yellow"
                >
                  View {s.name.toLowerCase()} courts →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line-white/6 pb-2 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-mono text-[12.5px]">{v}</dd>
    </div>
  );
}
