import { NextResponse } from "next/server";
import { freeUnitsDerived, slotsFor } from "@/lib/availability";
import { getCourt } from "@/lib/data/courts";
import { getStorage } from "@/lib/server/storage";

/**
 * GET /api/availability?court=<id|slug>&date=YYYY-MM-DD
 *
 * Returns the slot grid for one court on one day, merging the derived demo
 * availability with real bookings already in storage. The mobile app and any
 * future partner integrations read this rather than re-deriving slots.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtParam = searchParams.get("court");
  const date = searchParams.get("date");

  if (!courtParam) {
    return NextResponse.json({ message: "Missing ?court=" }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: "Missing or malformed ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const court = getCourt(courtParam);
  if (!court) {
    return NextResponse.json({ message: "Unknown court." }, { status: 404 });
  }

  const bookings = (await getStorage().listBookings()).filter(
    (b) => b.courtId === court.id && b.date === date && b.status !== "cancelled",
  );

  // Which units stored bookings occupy at each hour.
  const bookedUnitsByHour = new Map<number, Set<number>>();
  for (const b of bookings) {
    for (let h = b.startHour; h < b.startHour + b.hours; h++) {
      if (!bookedUnitsByHour.has(h)) bookedUnitsByHour.set(h, new Set());
      bookedUnitsByHour.get(h)!.add(b.unitIndex ?? 0);
    }
  }

  const slots = slotsFor(court, date).map((s) => {
    const derivedFree = freeUnitsDerived(court, date, s.hour);
    const storedTaken = bookedUnitsByHour.get(s.hour) ?? new Set<number>();
    const free = derivedFree.filter((u) => !storedTaken.has(u));
    return {
      hour: s.hour,
      label: s.label,
      taken: free.length === 0,
      unitsFree: free.length,
      units: court.units,
    };
  });

  return NextResponse.json({
    court: {
      id: court.id,
      slug: court.slug,
      name: court.name,
      price: court.price,
      units: court.units,
    },
    date,
    slots,
    openCount: slots.filter((s) => !s.taken).length,
  });
}
