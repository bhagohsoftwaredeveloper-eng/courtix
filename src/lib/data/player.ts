import type { Player } from "@/lib/types";

/**
 * The demo player behind /player-home. Once auth lands (integration plan,
 * Phase 5) this comes from the session; every page below reads it through
 * getCurrentPlayer() so there's a single seam to replace.
 *
 * The email matches bookings the demo creates, so /player-home shows real
 * stored bookings for this player rather than a mock list.
 */
const DEMO_PLAYER: Player = {
  id: "player-demo",
  name: "Jomar Reyes",
  email: "jomar.r@example.ph",
  phone: "09171234567",
  city: "Tagum City",
  skill: "Intermediate",
  rating: 3.5,
  favouriteSports: ["pickleball", "badminton"],
  savedCourtIds: [1, 7, 3],
  memberSince: "Mar 2026",
};

export function getCurrentPlayer(): Player {
  return DEMO_PLAYER;
}
