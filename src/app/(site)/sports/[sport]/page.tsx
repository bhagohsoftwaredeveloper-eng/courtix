import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourtDirectory } from "@/components/CourtDirectory";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { allCities, courtsBySport } from "@/lib/data/courts";
import { COURT_DIAGRAMS, SPORTS, getSport } from "@/lib/data/sports";
import { peso } from "@/lib/format";

export function generateStaticParams() {
  return SPORTS.map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport: slug } = await params;
  const sport = getSport(slug);
  if (!sport) return { title: "Sport not found" };
  return {
    title: `${sport.name} courts`,
    description: sport.blurb.slice(0, 160),
  };
}

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport: slug } = await params;
  const sport = getSport(slug);
  if (!sport) notFound();

  const courts = courtsBySport(sport.slug);
  const today = upcomingDates(1)[0];
  const slotsLeft = Object.fromEntries(courts.map((c) => [c.id, openSlotsToday(c, today)]));
  const cheapest = Math.min(...courts.map((c) => c.price));

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <header className="relative overflow-hidden border-b border-line-white/8">
        <Image
          src={`/images/sports/${sport.slug}-1.svg`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-court-deep via-court-deep/90 to-court-deep/40" />
        <div className="shell relative grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow mb-4">
              <Link href="/sports" className="hover:text-line-white">
                Sports
              </Link>{" "}
              / {sport.name}
            </p>
            <h1 className="mb-4 text-[clamp(34px,5vw,58px)] leading-[0.99]">
              {sport.name} <span className="text-ball-yellow">courts</span>
            </h1>
            <p className="mb-7 max-w-[500px] text-[15.5px] leading-relaxed text-muted">
              {sport.blurb}
            </p>
            <div className="flex flex-wrap gap-9">
              <Stat value={String(courts.length)} label="On Courtix" />
              <Stat value={`${peso(cheapest)}`} label="From, per hour" />
              <Stat value={String(sport.courtCount)} label={`${sport.unitLabelPlural} nationwide`} />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[380px]">
            <svg
              viewBox="0 0 400 400"
              fill="none"
              stroke="var(--color-ball-yellow)"
              strokeWidth={3}
              className="h-full w-full"
              role="img"
              aria-label={`${sport.name} court markings`}
            >
              <rect className="draw" x={30} y={30} width={340} height={340} rx={6} />
              <g
                className="[&>*]:draw"
                dangerouslySetInnerHTML={{ __html: COURT_DIAGRAMS[sport.slug] }}
              />
            </svg>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------ includes */}
      <section className="py-14">
        <div className="shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="mb-5 text-[24px]">What the hour includes</h2>
            <ul className="flex flex-col gap-3.5">
              {sport.includes.map((i) => (
                <li key={i} className="flex gap-3 text-[14px] text-line-white/85">
                  <span className="mt-0.5 text-ball-yellow">✓</span>
                  {i}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13px] leading-relaxed text-muted">
              Exact inclusions vary by venue — every listing spells out its own amenities before you
              book.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[2, 3].map((n) => (
              <div key={n} className="relative aspect-[4/3] overflow-hidden rounded-card">
                <Image
                  src={`/images/sports/${sport.slug}-${n}.svg`}
                  alt={`${sport.name} — sample venue photo ${n}`}
                  fill
                  sizes="(max-width: 1024px) 50vw, 30vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- courts */}
      <section className="pb-8">
        <div className="shell">
          <h2 className="mb-2 text-[26px]">Available {sport.name.toLowerCase()} courts</h2>
          <p className="mb-8 text-[13px] text-muted">Showing today’s remaining slots</p>

          {courts.length > 0 ? (
            <CourtDirectory
              courts={courts}
              cities={allCities()}
              slotsLeft={slotsLeft}
              initialSport={sport.slug}
              showSportFilter={false}
            />
          ) : (
            <p className="text-muted">No venues listed yet — check back soon.</p>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-[24px] leading-tight">{value}</p>
      <p className="text-xs uppercase tracking-[0.04em] text-muted">{label}</p>
    </div>
  );
}
