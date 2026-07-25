import "server-only";

import { getStorage } from "@/lib/server/storage";
import type { OpenPlay } from "@/lib/types";

export interface OpenPlayStatus {
  /** Seeded seats plus live confirmed joins, capped at capacity. */
  filled: number;
  capacity: number;
  spotsLeft: number;
  isFull: boolean;
  waitlistCount: number;
}

/**
 * Merges the seeded seat count with real joins from storage. A seat only counts
 * toward "filled" until capacity; anything past that is a waitlist seat, so the
 * counter reads like PickleHub's "6/6 Full" rather than "9/6".
 */
export async function openPlayStatus(play: OpenPlay): Promise<OpenPlayStatus> {
  const joins = await getStorage().joinsForOpenPlay(play.id);
  const confirmedJoins = joins.filter((j) => !j.waitlisted).length;
  const filled = Math.min(play.capacity, play.seededJoined + confirmedJoins);
  const waitlistCount = joins.filter((j) => j.waitlisted).length;

  return {
    filled,
    capacity: play.capacity,
    spotsLeft: Math.max(0, play.capacity - filled),
    isFull: filled >= play.capacity,
    waitlistCount,
  };
}

/** Batch variant so listing pages don't await inside a render loop. */
export async function openPlayStatuses(
  plays: OpenPlay[],
): Promise<Map<string, OpenPlayStatus>> {
  const entries = await Promise.all(
    plays.map(async (p) => [p.id, await openPlayStatus(p)] as const),
  );
  return new Map(entries);
}
