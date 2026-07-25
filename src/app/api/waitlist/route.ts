import { NextResponse } from "next/server";
import { getStorage } from "@/lib/server/storage";
import { fieldErrors, waitlistSchema } from "@/lib/validation";
import type { SportSlug } from "@/lib/types";

/**
 * POST /api/waitlist — join the launch waitlist.
 *
 * 200 { position, alreadyJoined }
 * 400 { errors: { field: message } }
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const { website, ...data } = parsed.data;

  // Honeypot tripped — accept the request so the bot sees success and moves on,
  // but store nothing. Returning 400 just teaches them to retry differently.
  if (website) {
    return NextResponse.json({ position: 1337, alreadyJoined: false });
  }

  const storage = getStorage();

  const existing = await storage.findWaitlistByEmail(data.email);
  if (existing) {
    return NextResponse.json({ position: existing.position, alreadyJoined: true });
  }

  const entry = await storage.addWaitlist({
    name: data.name,
    email: data.email,
    phone: data.phone || undefined,
    city: data.city,
    role: data.role,
    sports: data.sports as SportSlug[],
    notes: data.notes || undefined,
  });

  return NextResponse.json({ position: entry.position, alreadyJoined: false }, { status: 201 });
}

/**
 * GET /api/waitlist — aggregate counts only.
 *
 * Deliberately returns no personal data: this endpoint is unauthenticated and
 * feeds the "N people waiting" counter on the landing page. Listing actual
 * entries belongs behind admin auth (Phase 5 of the integration plan).
 */
export async function GET() {
  const entries = await getStorage().listWaitlist();

  const byCity: Record<string, number> = {};
  const bySport: Record<string, number> = {};
  for (const e of entries) {
    byCity[e.city] = (byCity[e.city] ?? 0) + 1;
    for (const s of e.sports) bySport[s] = (bySport[s] ?? 0) + 1;
  }

  return NextResponse.json({
    total: entries.length,
    byCity,
    bySport,
  });
}
