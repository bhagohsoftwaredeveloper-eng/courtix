/** Shared domain types for Courtix. */

export type SportSlug = "pickleball" | "badminton" | "basketball" | "golf";

export interface Sport {
  slug: SportSlug;
  name: string;
  /** Short line used on category cards. */
  tagline: string;
  /** Long-form copy for the sport landing page. */
  blurb: string;
  courtCount: number;
  fromPrice: number;
  /** Tailwind gradient classes for the category card. */
  gradient: string;
  /** Hex accent used for diagrams and highlights. */
  accent: string;
  /** What a booking of this sport typically includes. */
  includes: string[];
  /** Typical session length in minutes, first entry is the default. */
  durations: number[];
  /** Noun for a single bookable unit — "court", "bay", "hall". */
  unitLabel: string;
  unitLabelPlural: string;
}

export interface CourtImage {
  src: string;
  alt: string;
}

export interface Court {
  id: number;
  slug: string;
  sport: SportSlug;
  name: string;
  /** Full display location, e.g. "Tagum City, Davao del Norte". */
  loc: string;
  city: string;
  /** Price per hour in PHP. */
  price: number;
  rating: number;
  reviewCount: number;
  images: CourtImage[];
  amenities: string[];
  desc: string;
  /** Number of individual bookable units at this facility. */
  units: number;
  /** Opening hour and closing hour in 24h format. */
  opens: number;
  closes: number;
  host: string;
  /** Marks facilities that are indoors — used by the directory filters. */
  indoor: boolean;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface Booking {
  /** Human-facing reference, e.g. "CTX-8F31A2". */
  ref: string;
  courtId: number;
  courtName: string;
  sport: SportSlug;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 24h start hour. */
  startHour: number;
  /** Length in hours. */
  hours: number;
  /** Which court/bay within the facility was assigned, 0-based. */
  unitIndex: number;
  /** Display label for that unit, e.g. "Court 2" or "Bay 3". */
  unitLabel: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  notes?: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: BookingStatus;
  createdAt: string;
}

export type WaitlistRole = "player" | "owner" | "both";

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  role: WaitlistRole;
  sports: SportSlug[];
  notes?: string;
  /** Queue position handed back to the visitor. */
  position: number;
  createdAt: string;
}

/* ------------------------------------------------------------ open plays */

/**
 * Skill bands follow the DUPR-style convention players already use. "All Levels"
 * only ever labels an open play, never a player.
 */
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "All Levels";

/**
 * An organized drop-in session players buy a single seat in — the core of
 * pickleball culture and the thing court-rental alone doesn't cover. Modelled
 * on PickleHub's "Open Plays". See PICKLEHUB_REFERENCE.md.
 */
export interface OpenPlay {
  id: string;
  title: string;
  courtId: number;
  courtName: string;
  city: string;
  sport: SportSlug;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  startHour: number;
  hours: number;
  /** Price per player, PHP (not the whole-court rate). */
  pricePerPlayer: number;
  capacity: number;
  /** Seats already filled before any live joins are added on top. */
  seededJoined: number;
  skill: SkillLevel;
  organizer: string;
  /** Marks sessions that settle instantly at the door. */
  fastPay: boolean;
}

export interface OpenPlayJoin {
  id: string;
  openPlayId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  /** True when the session was already full and this is a waitlist seat. */
  waitlisted: boolean;
  createdAt: string;
}

/* ---------------------------------------------------------------- player */

/** The logged-in player identity behind /player-home. Demo profile for now. */
export interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  skill: Exclude<SkillLevel, "All Levels">;
  /** DUPR-style rating. */
  rating: number;
  favouriteSports: SportSlug[];
  savedCourtIds: number[];
  memberSince: string;
}
