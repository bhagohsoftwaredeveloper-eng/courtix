import { NextResponse } from "next/server";
import { getOpenPlay } from "@/lib/data/openplays";
import { openPlayStatus } from "@/lib/server/openplay-status";
import { getStorage } from "@/lib/server/storage";
import { fieldErrors, joinOpenPlaySchema } from "@/lib/validation";

/**
 * POST /api/open-plays/join — take a seat in an open play.
 *
 * 201 { joined: true, waitlisted, spotsLeft }
 * 400 { errors }            validation failed
 * 404 { message }           unknown session
 * 409 { message }           already joined
 *
 * A full session doesn't reject the request — it books a waitlist seat, exactly
 * like the "Join Waitlist" state on a full PickleHub open play.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = joinOpenPlaySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }

  const input = parsed.data;
  const play = getOpenPlay(input.openPlayId);
  if (!play) {
    return NextResponse.json({ message: "That session no longer exists." }, { status: 404 });
  }

  const storage = getStorage();
  if (await storage.hasJoinedOpenPlay(play.id, input.playerEmail)) {
    return NextResponse.json(
      { message: "You're already on the list for this session." },
      { status: 409 },
    );
  }

  // Decide waitlist vs. seat from the live count, not the client's view.
  const status = await openPlayStatus(play);
  const waitlisted = status.isFull;

  await storage.addOpenPlayJoin({
    openPlayId: play.id,
    playerName: input.playerName,
    playerEmail: input.playerEmail,
    playerPhone: input.playerPhone,
    waitlisted,
  });

  const after = await openPlayStatus(play);
  return NextResponse.json(
    { joined: true, waitlisted, spotsLeft: after.spotsLeft },
    { status: 201 },
  );
}
