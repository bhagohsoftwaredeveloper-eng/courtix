import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * GET /api/avatar/[userId] — serve a stored profile photo.
 *
 * Avatars live in MySQL rather than on a CDN, so something has to turn the
 * bytes back into an image response. This is the only place that reads
 * `UserAvatar.data`, which is what keeps the blob out of every other query.
 *
 * Signed-in only: a photo is shown to hosts and other players, not to the open
 * internet, and an unauthenticated endpoint keyed on user id would let anyone
 * enumerate the member list by image.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  await requireUser();

  const { userId } = await params;
  const avatar = await db.userAvatar.findUnique({ where: { userId } });
  if (!avatar) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.mimeType,
      "Content-Length": String(avatar.data.length),
      // The URL carries an `updatedAt` cache-buster, so a stored image is
      // immutable for as long as that URL is current.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
