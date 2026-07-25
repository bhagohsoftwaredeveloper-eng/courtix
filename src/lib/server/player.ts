import "server-only";

import type { Player, SportSlug } from "@/lib/types";
import { getSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const SKILL_LABEL = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2026-03-01 -> "Mar 2026", the format the profile strip renders. */
function monthYearLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * The signed-in player, assembled from the session plus their profile row.
 * Returns null when nobody is signed in — /open-plays/[id] is public and just
 * skips prefilling the join form.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      phone: true,
      playerProfile: {
        select: {
          skill: true,
          rating: true,
          memberSince: true,
          homeCity: { select: { name: true } },
          favourites: { select: { sportId: true } },
        },
      },
    },
  });
  const profile = user?.playerProfile;

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    phone: user?.phone ?? "",
    city: profile?.homeCity?.name ?? "",
    skill: SKILL_LABEL[profile?.skill ?? "BEGINNER"],
    rating: profile?.rating ? Number(profile.rating) : 0,
    favouriteSports: (profile?.favourites.map((f) => f.sportId) ?? []) as SportSlug[],
    // Saved courts key on facility cuids while the static COURTS catalog keys
    // on integers, so the two can't be joined yet. Phase 2 unifies the ids and
    // this comes back.
    savedCourtIds: [],
    memberSince: profile ? monthYearLabel(profile.memberSince) : "",
  };
}
