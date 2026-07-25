import Image from "next/image";
import Link from "next/link";
import { DashHeader, Panel, StatusChip } from "@/components/dashboard/parts";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { COURTS } from "@/lib/data/courts";
import { getSport } from "@/lib/data/sports";
import { hourShort, peso } from "@/lib/format";

export const metadata = { title: "My courts" };

/** The demo owner account manages the first three listings. */
const OWNED_IDS = [1, 5, 8];

export default function OwnerCourtsPage() {
  const today = upcomingDates(1)[0];
  const owned = COURTS.filter((c) => OWNED_IDS.includes(c.id));

  return (
    <>
      <DashHeader
        title="My courts"
        sub={`${owned.length} listings across ${new Set(owned.map((c) => c.city)).size} cities`}
        action={<button className="btn btn-solid">+ Add court</button>}
      />

      <div className="grid gap-[18px] lg:grid-cols-2">
        {owned.map((court) => {
          const sport = getSport(court.sport)!;
          const open = openSlotsToday(court, today);
          return (
            <div key={court.id} className="panel">
              <div className="mb-4 flex gap-4">
                <div className="relative h-[86px] w-[120px] flex-none overflow-hidden rounded-[10px]">
                  <Image
                    src={court.images[0].src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-sans text-[15px] font-extrabold normal-case tracking-normal">
                    {court.name}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-muted">{court.loc}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusChip tone={open > 0 ? "open" : "booked"}>
                      {open > 0 ? `${open} open today` : "Fully booked"}
                    </StatusChip>
                    <StatusChip tone="pending">{sport.name}</StatusChip>
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-3 border-t border-line-white/8 pt-4 text-[12px]">
                <div>
                  <dt className="mb-1 text-[10.5px] uppercase tracking-[0.05em] text-muted">Rate</dt>
                  <dd className="font-mono">{peso(court.price)}/hr</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[10.5px] uppercase tracking-[0.05em] text-muted">
                    {sport.unitLabelPlural}
                  </dt>
                  <dd className="font-mono">{court.units}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-[10.5px] uppercase tracking-[0.05em] text-muted">Hours</dt>
                  <dd className="font-mono">
                    {hourShort(court.opens)}–{hourShort(court.closes)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/courts/${court.slug}`} className="btn btn-ghost px-4 py-2 text-[12px]">
                  View listing
                </Link>
                <button className="btn btn-ghost px-4 py-2 text-[12px]">Edit</button>
                <button className="btn btn-ghost px-4 py-2 text-[12px]">Block hours</button>
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="Listing health" className="mt-[18px]">
        <ul className="flex flex-col gap-3 text-[13px]">
          {[
            { ok: true, t: "All listings have at least 3 photos" },
            { ok: true, t: "Opening hours set for every court" },
            { ok: false, t: "Third Shot Park has no cancellation policy set" },
            { ok: false, t: "Sunrise Courts hasn't replied to 2 player messages" },
          ].map((i) => (
            <li key={i.t} className="flex gap-3">
              <span className={i.ok ? "text-ball-yellow" : "text-[#ff9370]"}>{i.ok ? "✓" : "!"}</span>
              <span className={i.ok ? "text-muted" : ""}>{i.t}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
