import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";

/** Serves an uploaded venue photo.
 *
 *  Public by design — it is a picture of a court on a public listing — but it
 *  serves only rows that actually hold bytes, so a facility with no upload
 *  cannot be probed for one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const image = await db.facilityImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
  if (!image?.data || !image.mimeType) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      // Immutable: a new upload creates a new row with a new id.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
