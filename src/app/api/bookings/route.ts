import { NextResponse } from "next/server";
import { assignUnit, quote, unitFreeForSpan } from "@/lib/availability";
import { getCourt, unitLabelFor } from "@/lib/data/courts";
import { getStorage } from "@/lib/server/storage";
import { bookingSchema, fieldErrors } from "@/lib/validation";

/**
 * POST /api/bookings — create a booking.
 *
 * 201 { ref, total, ... }
 * 400 { errors }        validation failed
 * 404 { message }       unknown court
 * 409 { message }       slot taken between page load and submit
 *
 * The price is recomputed here from the court record rather than trusted from
 * the request body — otherwise anyone can POST `total: 1`.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const input = parsed.data;
  const court = getCourt(input.courtId);
  if (!court) {
    return NextResponse.json({ message: "That court no longer exists." }, { status: 404 });
  }

  // Reject dates in the past — the client date picker can't produce one, but
  // the endpoint is public.
  const today = new Date().toISOString().slice(0, 10);
  if (input.date < today) {
    return NextResponse.json(
      { errors: { date: "That date has already passed." } },
      { status: 400 },
    );
  }

  // Assign a specific court: take the units still free by the derived demo
  // occupancy, minus any unit already held by a stored booking for this span.
  const storage = getStorage();
  const storedTaken = new Set(
    await storage.bookedUnitsForSpan(court.id, input.date, input.startHour, input.hours),
  );

  let unitIndex: number | null;
  if (input.unitIndex !== undefined) {
    // Player asked for a specific court — honour it only if it's actually free.
    const requested = input.unitIndex;
    const free =
      requested < court.units &&
      !storedTaken.has(requested) &&
      unitFreeForSpan(court, input.date, input.startHour, input.hours, requested);
    unitIndex = free ? requested : null;
  } else {
    unitIndex = assignUnit(court, input.date, input.startHour, input.hours, storedTaken);
  }

  if (unitIndex === null) {
    return NextResponse.json(
      {
        message:
          input.unitIndex !== undefined
            ? `${unitLabelFor(court, input.unitIndex)} was just taken for that time. Pick another court or time.`
            : "That slot was taken while you were checking out. Pick another time.",
      },
      { status: 409 },
    );
  }

  const q = quote(court, input.hours);

  const booking = await storage.addBooking({
    courtId: court.id,
    courtName: court.name,
    sport: court.sport,
    date: input.date,
    startHour: input.startHour,
    hours: input.hours,
    unitIndex,
    unitLabel: unitLabelFor(court, unitIndex),
    playerName: input.playerName,
    playerEmail: input.playerEmail,
    playerPhone: input.playerPhone,
    notes: input.notes || undefined,
    subtotal: q.subtotal,
    serviceFee: q.serviceFee,
    total: q.total,
    status: "confirmed",
  });

  return NextResponse.json(booking, { status: 201 });
}
