import { toISODate } from "@/lib/format";
import type { OpenPlay, SportSlug } from "@/lib/types";

/**
 * Open play sessions. Dates are stored as day-offsets from "today" and resolved
 * at read time, so the demo always shows a fresh week of upcoming sessions
 * rather than a calendar frozen at build time.
 */
interface Seed {
  id: string;
  title: string;
  courtId: number;
  courtName: string;
  city: string;
  sport: SportSlug;
  dayOffset: number;
  startHour: number;
  hours: number;
  pricePerPlayer: number;
  capacity: number;
  seededJoined: number;
  skill: OpenPlay["skill"];
  organizer: string;
  fastPay: boolean;
}

const SEEDS: Seed[] = [
  {
    id: "op-morning-dinkers",
    title: "Morning Dinkers Social",
    courtId: 1,
    courtName: "Kitchen Line Club",
    city: "Tagum City",
    sport: "pickleball",
    dayOffset: 0,
    startHour: 7,
    hours: 2,
    pricePerPlayer: 150,
    capacity: 8,
    seededJoined: 5,
    skill: "All Levels",
    organizer: "Kitchen Line Club",
    fastPay: true,
  },
  {
    id: "op-after-work-rally",
    title: "After-Work Rally",
    courtId: 7,
    courtName: "Dink District",
    city: "Davao City",
    sport: "pickleball",
    dayOffset: 0,
    startHour: 18,
    hours: 2,
    pricePerPlayer: 200,
    capacity: 12,
    seededJoined: 12,
    skill: "Intermediate",
    organizer: "Dink District Manila",
    fastPay: true,
  },
  {
    id: "op-sunrise-league",
    title: "Sunrise Beginners Clinic",
    courtId: 5,
    courtName: "Sunrise Courts",
    city: "Panabo City",
    sport: "pickleball",
    dayOffset: 1,
    startHour: 6,
    hours: 2,
    pricePerPlayer: 120,
    capacity: 8,
    seededJoined: 3,
    skill: "Beginner",
    organizer: "Sunrise Sports Collective",
    fastPay: false,
  },
  {
    id: "op-smash-shuttle",
    title: "Shuttle Social Night",
    courtId: 2,
    courtName: "Smash Point Arena",
    city: "Davao City",
    sport: "badminton",
    dayOffset: 1,
    startHour: 19,
    hours: 2,
    pricePerPlayer: 140,
    capacity: 8,
    seededJoined: 6,
    skill: "All Levels",
    organizer: "Smash Point Sports",
    fastPay: true,
  },
  {
    id: "op-baseline-pickup",
    title: "Baseline Pickup Run",
    courtId: 3,
    courtName: "Baseline Fieldhouse",
    city: "Tagum City",
    sport: "basketball",
    dayOffset: 2,
    startHour: 20,
    hours: 2,
    pricePerPlayer: 100,
    capacity: 10,
    seededJoined: 7,
    skill: "All Levels",
    organizer: "Baseline Sports Management",
    fastPay: true,
  },
  {
    id: "op-advanced-ladder",
    title: "Advanced Ladder Play",
    courtId: 7,
    courtName: "Dink District",
    city: "Davao City",
    sport: "pickleball",
    dayOffset: 2,
    startHour: 17,
    hours: 2,
    pricePerPlayer: 250,
    capacity: 8,
    seededJoined: 4,
    skill: "Advanced",
    organizer: "Dink District Manila",
    fastPay: true,
  },
  {
    id: "op-weekend-mixer",
    title: "Weekend Doubles Mixer",
    courtId: 1,
    courtName: "Kitchen Line Club",
    city: "Tagum City",
    sport: "pickleball",
    dayOffset: 3,
    startHour: 8,
    hours: 3,
    pricePerPlayer: 180,
    capacity: 16,
    seededJoined: 9,
    skill: "Intermediate",
    organizer: "Tagum Dinkers",
    fastPay: false,
  },
  {
    id: "op-rally-hall-open",
    title: "Rally Hall Open Court",
    courtId: 9,
    courtName: "Rally Hall Tagum",
    city: "Tagum City",
    sport: "badminton",
    dayOffset: 4,
    startHour: 18,
    hours: 2,
    pricePerPlayer: 130,
    capacity: 8,
    seededJoined: 2,
    skill: "All Levels",
    organizer: "Rally Hall Group",
    fastPay: true,
  },
];

function resolve(seed: Seed, from: Date): OpenPlay {
  const d = new Date(from);
  d.setDate(d.getDate() + seed.dayOffset);
  const { dayOffset, ...rest } = seed;
  void dayOffset;
  return { ...rest, date: toISODate(d) };
}

export function allOpenPlays(from = new Date()): OpenPlay[] {
  return SEEDS.map((s) => resolve(s, from)).sort((a, b) =>
    a.date === b.date ? a.startHour - b.startHour : a.date.localeCompare(b.date),
  );
}

export function getOpenPlay(id: string, from = new Date()): OpenPlay | undefined {
  const seed = SEEDS.find((s) => s.id === id);
  return seed ? resolve(seed, from) : undefined;
}

export function openPlaysForSport(sport: SportSlug, from = new Date()): OpenPlay[] {
  return allOpenPlays(from).filter((o) => o.sport === sport);
}
