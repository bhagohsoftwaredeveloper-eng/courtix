import Image from "next/image";
import Link from "next/link";
import { peso } from "@/lib/format";
import { sportName } from "@/lib/data/sports";
import type { Court } from "@/lib/types";

export function CourtCard({ court, slotsLeft }: { court: Court; slotsLeft?: number }) {
  return (
    <Link
      href={`/courts/${court.slug}`}
      className="group block overflow-hidden rounded-card border border-line-white/6 bg-card transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-ball-yellow/40"
    >
      <div className="relative h-[150px] overflow-hidden">
        <Image
          src={court.images[0].src}
          alt={court.images[0].alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-ink/72 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] backdrop-blur-[4px]">
          {sportName(court.sport)}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-ink/72 px-2.5 py-1.5 font-mono text-[11.5px] font-semibold backdrop-blur-[4px]">
          ★ {court.rating.toFixed(1)}
        </span>
        {slotsLeft !== undefined && slotsLeft <= 4 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-board-red/90 px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em]">
            {slotsLeft === 0
              ? "Fully booked today"
              : `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left today`}
          </span>
        )}
      </div>

      <div className="px-[18px] pb-[18px] pt-4">
        <h3 className="mb-1 font-sans text-[15.5px] font-extrabold normal-case tracking-normal">
          {court.name}
        </h3>
        <p className="mb-3 text-[12.5px] text-muted">{court.loc}</p>
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm font-semibold">
            {peso(court.price)}
            <span className="text-[11px] text-muted">/hr</span>
          </p>
          <span className="text-xs font-bold text-ball-yellow">Book →</span>
        </div>
      </div>
    </Link>
  );
}
