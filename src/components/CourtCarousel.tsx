import { CourtCard } from "@/components/CourtCard";
import type { Court } from "@/lib/types";

/**
 * Horizontal court scroller used on /player-home. On narrow screens it scrolls;
 * on wide screens it just lays out as a row. Mirrors PickleHub's "Suggested
 * Courts" carousel without pulling in a carousel library for a scroll snap.
 */
export function CourtCarousel({
  courts,
  slotsLeft,
}: {
  courts: Court[];
  slotsLeft: Record<number, number>;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
      {courts.map((c) => (
        <div key={c.id} className="w-[280px] flex-none snap-start sm:w-[300px]">
          <CourtCard court={c} slotsLeft={slotsLeft[c.id]} />
        </div>
      ))}
    </div>
  );
}
