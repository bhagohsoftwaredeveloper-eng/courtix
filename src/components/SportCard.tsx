import Image from "next/image";
import Link from "next/link";
import type { Sport } from "@/lib/types";

export function SportCard({ sport, large = false }: { sport: Sport; large?: boolean }) {
  return (
    <Link
      href={`/sports/${sport.slug}`}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-card border border-line-white/8 transition-transform duration-200 hover:-translate-y-1 ${
        large ? "min-h-[260px]" : "min-h-[132px]"
      }`}
    >
      <Image
        src={`/images/sports/${sport.slug}-1.svg`}
        alt=""
        fill
        sizes={large ? "(max-width: 800px) 100vw, 50vw" : "(max-width: 800px) 50vw, 25vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
      />
      {/* Two passes: a sport-tinted wash for identity, then a bottom-weighted
          scrim so the label stays legible without flattening the image. */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${sport.gradient} opacity-40 mix-blend-soft-light`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/5" />

      <div className="relative p-5">
        <h3 className={large ? "text-2xl" : "text-base"}>{sport.name}</h3>
        <p className="mt-1 font-mono text-xs text-line-white/75">{sport.tagline}</p>
        {large && (
          <p className="mt-3 max-w-[340px] text-[13px] leading-relaxed text-line-white/70">
            {sport.blurb.split(". ")[0]}.
          </p>
        )}
      </div>
    </Link>
  );
}
