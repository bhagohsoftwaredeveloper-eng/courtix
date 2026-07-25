import type { Metadata } from "next";
import { CourtDirectory } from "@/components/CourtDirectory";
import { openSlotsToday, upcomingDates } from "@/lib/availability";
import { COURTS, allCities } from "@/lib/data/courts";

export const metadata: Metadata = {
  title: "Find a court",
  description:
    "Browse every bookable pickleball, badminton, basketball and golf court on Courtix. Filter by sport, city and price, with live availability.",
};

export default function CourtsPage() {
  const today = upcomingDates(1)[0];
  const slotsLeft = Object.fromEntries(COURTS.map((c) => [c.id, openSlotsToday(c, today)]));

  return (
    <div className="pt-14 pb-8">
      <div className="shell">
        <p className="eyebrow mb-4">Directory</p>
        <h1 className="mb-3 text-[clamp(30px,4.2vw,46px)] leading-[1.02]">Find a court</h1>
        <p className="mb-10 max-w-[520px] text-[15px] leading-relaxed text-muted">
          Every court on Courtix, with today’s remaining slots. Pick a sport, set your budget, and
          book the hour you actually want.
        </p>

        <CourtDirectory courts={COURTS} cities={allCities()} slotsLeft={slotsLeft} />
      </div>
    </div>
  );
}
