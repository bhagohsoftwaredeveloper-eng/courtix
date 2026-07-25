import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingPanel } from "@/components/BookingPanel";
import { CourtCard } from "@/components/CourtCard";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { COURTS, courtsBySport, getCourt } from "@/lib/data/courts";
import { getSport } from "@/lib/data/sports";
import { hourShort, peso } from "@/lib/format";

export function generateStaticParams() {
  return COURTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const court = getCourt(slug);
  if (!court) return { title: "Court not found" };
  return {
    title: court.name,
    description: `${court.desc.slice(0, 150)} Book from ${peso(court.price)}/hr in ${court.city}.`,
    openGraph: { images: [court.images[0].src] },
  };
}

export default async function CourtPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const court = getCourt(slug);
  if (!court) notFound();

  const sport = getSport(court.sport)!;
  const today = upcomingDates(1)[0];
  const openToday = openSlotsToday(court, today);

  const similar = courtsBySport(court.sport)
    .filter((c) => c.id !== court.id)
    .slice(0, 3);

  return (
    <div className="pt-8 pb-8">
      <div className="shell">
        {/* ---- breadcrumb ---- */}
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-[12.5px] text-muted">
          <Link href="/courts" className="hover:text-line-white">
            Courts
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/sports/${court.sport}`} className="hover:text-line-white">
            {sport.name}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-line-white">{court.name}</span>
        </nav>

        {/* ---- gallery ---- */}
        <div className="mb-9 grid h-[300px] gap-1 overflow-hidden rounded-[18px] sm:h-[380px] sm:grid-cols-[2fr_1fr]">
          <div className="relative">
            <Image
              src={court.images[0].src}
              alt={court.images[0].alt}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 60vw"
              className="object-cover"
            />
          </div>
          <div className="hidden grid-rows-2 gap-1 sm:grid">
            {court.images.slice(1, 3).map((img) => (
              <div key={img.src + img.alt} className="relative">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="40vw"
                  className="object-cover brightness-[0.88]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ---- body ---- */}
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-court-green px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-ball-yellow">
                {sport.name}
              </span>
              {openToday > 0 ? (
                <span className="status-chip status-open">{openToday} slots open today</span>
              ) : (
                <span className="status-chip status-booked">Fully booked today</span>
              )}
              {court.indoor && <span className="status-chip status-pending">Indoor</span>}
            </div>

            <h1 className="mb-2 font-sans text-[clamp(26px,3.6vw,38px)] font-extrabold normal-case leading-[1.08] tracking-normal">
              {court.name}
            </h1>
            <p className="mb-7 text-sm text-muted">
              {court.loc} · ★ {court.rating.toFixed(1)} ({court.reviewCount} reviews) · hosted by{" "}
              {court.host}
            </p>

            <div className="mb-7 flex flex-wrap gap-2">
              {court.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-line-white/16 px-3 py-1.5 text-[11.5px] text-muted"
                >
                  {a}
                </span>
              ))}
            </div>

            <p className="mb-9 text-[14.5px] leading-[1.7] text-line-white/82">{court.desc}</p>

            <div className="mb-9 grid gap-4 sm:grid-cols-3">
              <Fact
                k="Bookable units"
                v={`${court.units} ${court.units === 1 ? sport.unitLabel : sport.unitLabelPlural}`}
              />
              <Fact k="Opening hours" v={`${hourShort(court.opens)} – ${hourShort(court.closes)}`} />
              <Fact
                k="Session lengths"
                v={sport.durations.map((d) => `${d / 60}h`).join(", ")}
              />
            </div>

            <div className="panel">
              <h2 className="mb-3 font-sans text-base font-extrabold normal-case tracking-normal">
                Good to know
              </h2>
              <ul className="flex flex-col gap-2.5 text-[13.5px] text-muted">
                <li>Free cancellation up to 12 hours before your slot, refunded in full.</li>
                <li>Arrive 10 minutes early — your hour starts on the clock, not on arrival.</li>
                <li>
                  Show your <span className="font-mono text-line-white">CTX-</span> reference at the
                  gate. No printed ticket needed.
                </li>
                <li>A 6% service fee is added at checkout and shown before you pay.</li>
              </ul>
            </div>
          </div>

          <BookingPanel court={court} />
        </div>

        {/* ---- similar ---- */}
        {similar.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 text-[22px]">More {sport.name.toLowerCase()} nearby</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((c) => (
                <CourtCard key={c.id} court={c} slotsLeft={openSlotsToday(c, today)} />
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
