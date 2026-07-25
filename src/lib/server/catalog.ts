import "server-only";

import { db } from "@/lib/server/db";

/** Cities the platform has actually opened — the only ones a player can pick. */
export async function listLiveCities(): Promise<{ id: string; name: string; province: string }[]> {
  return db.city.findMany({
    where: { status: "LIVE" },
    select: { id: true, name: true, province: true },
    orderBy: [{ name: "asc" }],
  });
}
