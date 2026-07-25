"use client";

import { useMemo, useState } from "react";
import { CourtCard } from "@/components/CourtCard";
import { SPORTS } from "@/lib/data/sports";
import { peso } from "@/lib/format";
import type { Court, SportSlug } from "@/lib/types";

type SportFilter = SportSlug | "all";
type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

/**
 * Filterable court directory.
 *
 * `slotsLeft` is computed on the server and passed in, because availability
 * depends on today's date — deriving it in the browser would produce a
 * different grid than the server rendered if the user crosses midnight.
 */
export function CourtDirectory({
  courts,
  cities,
  slotsLeft,
  initialSport = "all",
  /**
   * Sport pages pass an already-scoped list, so the sport pills are hidden
   * there — leaving them visible would let you filter to a sport that has no
   * courts in the list and land on an empty grid.
   */
  showSportFilter = true,
}: {
  courts: Court[];
  cities: string[];
  slotsLeft: Record<number, number>;
  initialSport?: SportFilter;
  showSportFilter?: boolean;
}) {
  const [sport, setSport] = useState<SportFilter>(initialSport);
  const [city, setCity] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(0); // 0 = no cap
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("recommended");

  const priceCeiling = useMemo(
    () => Math.ceil(Math.max(...courts.map((c) => c.price)) / 100) * 100,
    [courts],
  );

  const visible = useMemo(() => {
    let list = courts.filter((c) => {
      if (sport !== "all" && c.sport !== sport) return false;
      if (city !== "all" && c.city !== city) return false;
      if (maxPrice > 0 && c.price > maxPrice) return false;
      if (indoorOnly && !c.indoor) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Recommended = rating first, then whoever still has slots open today.
        list.sort(
          (a, b) =>
            b.rating * 10 + (slotsLeft[b.id] ?? 0) - (a.rating * 10 + (slotsLeft[a.id] ?? 0)),
        );
    }
    return list;
  }, [courts, sport, city, maxPrice, indoorOnly, sort, slotsLeft]);

  const activeFilters =
    (sport !== "all" ? 1 : 0) + (city !== "all" ? 1 : 0) + (maxPrice > 0 ? 1 : 0) + (indoorOnly ? 1 : 0);

  function reset() {
    setSport("all");
    setCity("all");
    setMaxPrice(0);
    setIndoorOnly(false);
    setSort("recommended");
  }

  return (
    <div>
      {/* ---- sport pills ---- */}
      {showSportFilter && (
        <div className="mb-5 flex flex-wrap gap-2.5">
          <Pill active={sport === "all"} onClick={() => setSport("all")}>
            All sports
          </Pill>
          {SPORTS.map((s) => (
            <Pill key={s.slug} active={sport === s.slug} onClick={() => setSport(s.slug)}>
              {s.name}
            </Pill>
          ))}
        </div>
      )}

      {/* ---- secondary filters ---- */}
      <div className="mb-7 flex flex-wrap items-end gap-4 rounded-card border border-line-white/8 bg-card/60 p-4">
        <label className="min-w-[150px] flex-1">
          <span className="field-label">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="field">
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[190px] flex-1">
          <span className="field-label">
            Max price {maxPrice > 0 ? `· ${peso(maxPrice)}/hr` : "· any"}
          </span>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={50}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="h-[38px] w-full accent-[var(--color-ball-yellow)]"
          />
        </label>

        <label className="min-w-[150px] flex-1">
          <span className="field-label">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="field"
          >
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Highest rated</option>
          </select>
        </label>

        <label className="flex h-[44px] cursor-pointer select-none items-center gap-2.5 text-[13px]">
          <input
            type="checkbox"
            checked={indoorOnly}
            onChange={(e) => setIndoorOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-ball-yellow)]"
          />
          Indoor only
        </label>

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={reset}
            className="h-[44px] text-[13px] font-bold text-ball-yellow underline underline-offset-4"
          >
            Clear {activeFilters}
          </button>
        )}
      </div>

      <p className="mb-5 text-[13px] text-muted">
        <b className="font-mono text-line-white">{visible.length}</b>{" "}
        {visible.length === 1 ? "court" : "courts"}
        {sport !== "all" && ` for ${SPORTS.find((s) => s.slug === sport)?.name.toLowerCase()}`}
        {city !== "all" && ` in ${city}`}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-white/15 py-20 text-center">
          <p className="mb-2 font-sans text-lg font-extrabold">No courts match those filters</p>
          <p className="mb-6 text-[13.5px] text-muted">
            Try widening the price range or clearing the city filter.
          </p>
          <button type="button" onClick={reset} className="btn btn-ghost">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CourtCard key={c.id} court={c} slotsLeft={slotsLeft[c.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2.5 text-[13px] font-bold transition-colors ${
        active
          ? "border-ball-yellow bg-court-green text-ball-yellow"
          : "border-line-white/18 text-muted hover:border-line-white/40 hover:text-line-white"
      }`}
    >
      {children}
    </button>
  );
}
