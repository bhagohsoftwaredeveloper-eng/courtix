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

/** The editable shape of a player's profile, as the form needs it. */
export interface ProfileFormValues {
  name: string;
  /** Read-only in the UI: it is the login identifier. */
  email: string;
  phone: string;
  homeCityId: string;
  skill: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  rating: string;
  duprId: string;
  /** "" means the player hasn't said, which is a valid answer. */
  gender: "" | "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  sportIds: string[];
  /**
   * Ready-to-use src for the avatar route, or null when no photo was uploaded.
   * Carries an `updatedAt` cache-buster so a new upload is never masked by the
   * immutable cache header the route sets.
   */
  avatarSrc: string | null;
}

export async function getProfileForm(): Promise<ProfileFormValues | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      phone: true,
      // `updatedAt` only — selecting `data` here would pull the whole image
      // into a query that just needs to know whether one exists.
      avatar: { select: { updatedAt: true } },
      playerProfile: {
        select: {
          skill: true,
          rating: true,
          duprId: true,
          gender: true,
          homeCityId: true,
          favourites: { select: { sportId: true } },
        },
      },
    },
  });
  if (!user) return null;

  const p = user.playerProfile;
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    homeCityId: p?.homeCityId ?? "",
    skill: p?.skill ?? "BEGINNER",
    rating: p?.rating ? String(p.rating) : "",
    duprId: p?.duprId ?? "",
    gender: p?.gender ?? "",
    sportIds: p?.favourites.map((f) => f.sportId) ?? [],
    avatarSrc: user.avatar
      ? `/api/avatar/${session.id}?v=${user.avatar.updatedAt.getTime()}`
      : null,
  };
}
