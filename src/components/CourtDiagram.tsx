"use client";

import { useState } from "react";
import { COURT_DIAGRAMS, SPORTS } from "@/lib/data/sports";
import type { SportSlug } from "@/lib/types";

/**
 * The animated line-drawing hero from the prototype. Switching sport remounts
 * the <svg> via `key`, which restarts the stroke-dashoffset animation — CSS
 * animations don't replay on their own when only the child paths change.
 */
export function CourtDiagram({ initial = "pickleball" }: { initial?: SportSlug }) {
  const [sport, setSport] = useState<SportSlug>(initial);

  return (
    <div>
      <div className="relative mx-auto aspect-square max-w-[480px]">
        <svg
          key={sport}
          viewBox="0 0 400 400"
          fill="none"
          stroke="var(--color-ball-yellow)"
          strokeWidth={3}
          className="h-full w-full"
          role="img"
          aria-label={`${SPORTS.find((s) => s.slug === sport)?.name} court markings`}
        >
          <rect className="draw" x={30} y={30} width={340} height={340} rx={6} />
          <g
            className="[&>*]:draw"
            dangerouslySetInnerHTML={{ __html: COURT_DIAGRAMS[sport] }}
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SPORTS.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSport(s.slug)}
            aria-pressed={sport === s.slug}
            className={`rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
              sport === s.slug
                ? "border-line-white bg-line-white text-ink"
                : "border-line-white/20 text-muted hover:text-line-white"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
