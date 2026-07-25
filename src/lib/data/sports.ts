import type { Sport, SportSlug } from "@/lib/types";

export const SPORTS: Sport[] = [
  {
    slug: "pickleball",
    name: "Pickleball",
    tagline: "118 courts · from ₱350/hr",
    blurb:
      "The fastest-growing sport in the country, and the hardest to get a slot for. Courtix lists every open pickleball court from Tagum to Davao — cushioned acrylic, stadium lighting, paddle rental included at most venues. Book the kitchen, not a group chat.",
    courtCount: 118,
    fromPrice: 350,
    gradient: "from-kitchen-blue to-court-green",
    accent: "#2f5185",
    includes: [
      "Court for your full booked hour",
      "Net set up and tensioned before you arrive",
      "Paddle rental at most venues",
      "Outdoor balls provided",
    ],
    durations: [60, 90, 120],
    unitLabel: "court",
    unitLabelPlural: "courts",
  },
  {
    slug: "badminton",
    name: "Badminton",
    tagline: "96 courts · from ₱280/hr",
    blurb:
      "Wooden-floor halls, proper ceiling clearance, and air-conditioning that actually works. We list the indoor badminton courts serious players already fight over — with live availability so you stop calling five venues to find one open hall.",
    courtCount: 96,
    fromPrice: 280,
    gradient: "from-court-green to-court-deep",
    accent: "#4c7a3f",
    includes: [
      "Full court for your booked session",
      "Shuttlecocks included at most halls",
      "Racket rental available on request",
      "Air-conditioned indoor play",
    ],
    durations: [60, 90, 120],
    unitLabel: "court",
    unitLabelPlural: "courts",
  },
  {
    slug: "basketball",
    name: "Basketball",
    tagline: "142 courts · from ₱500/hr",
    blurb:
      "From barangay hardcourts to full-length hardwood fieldhouses with electronic scoreboards. Book the whole court for your team run, or split a half-court when it's just five of you. No deposit envelopes, no caretaker hunting.",
    courtCount: 142,
    fromPrice: 500,
    gradient: "from-[#7a2e1a] to-board-red",
    accent: "#e4572e",
    includes: [
      "Full or half court booking",
      "Scoreboard and shot clock where available",
      "Ball rental at most venues",
      "Bleacher seating for spectators",
    ],
    durations: [60, 90, 120, 180],
    unitLabel: "court",
    unitLabelPlural: "courts",
  },
  {
    slug: "golf",
    name: "Golf",
    tagline: "56 bays · from ₱900/hr",
    blurb:
      "Simulator bays with swing analytics and 60+ championship courses, plus driving range stalls by the bucket. Practice at 9pm when the real course is long closed — and see your carry distance before you next tee off for real.",
    courtCount: 56,
    fromPrice: 900,
    gradient: "from-fair-green to-[#1c3016]",
    accent: "#4c7a3f",
    includes: [
      "Simulator bay or range stall for your hour",
      "Swing analytics and shot tracking",
      "Club rental included at most bays",
      "60+ championship course library",
    ],
    durations: [60, 120, 180],
    unitLabel: "bay",
    unitLabelPlural: "bays",
  },
];

export const SPORT_SLUGS: SportSlug[] = SPORTS.map((s) => s.slug);

export function getSport(slug: string): Sport | undefined {
  return SPORTS.find((s) => s.slug === slug);
}

export function sportName(slug: SportSlug): string {
  return getSport(slug)?.name ?? slug;
}

/** Court-line geometry for the animated hero diagram, drawn on a 400×400 box. */
export const COURT_DIAGRAMS: Record<SportSlug, string> = {
  pickleball: `
    <line x1="30" y1="200" x2="370" y2="200" stroke-width="2"/>
    <line x1="140" y1="30" x2="140" y2="370" stroke-width="2"/>
    <line x1="260" y1="30" x2="260" y2="370" stroke-width="2"/>
    <line x1="30" y1="115" x2="370" y2="115" stroke-width="2" opacity="0.6"/>
    <line x1="30" y1="285" x2="370" y2="285" stroke-width="2" opacity="0.6"/>
  `,
  badminton: `
    <line x1="30" y1="200" x2="370" y2="200" stroke-width="4"/>
    <line x1="30" y1="90" x2="370" y2="90" stroke-width="2"/>
    <line x1="30" y1="310" x2="370" y2="310" stroke-width="2"/>
    <line x1="200" y1="30" x2="200" y2="370" stroke-width="2" opacity="0.5"/>
  `,
  basketball: `
    <circle cx="200" cy="200" r="55" stroke-width="2"/>
    <line x1="30" y1="200" x2="370" y2="200" stroke-width="2"/>
    <path d="M110,30 L110,120 A90,90 0 0,0 290,120 L290,30" stroke-width="2"/>
    <path d="M110,370 L110,280 A90,90 0 0,1 290,280 L290,370" stroke-width="2"/>
  `,
  golf: `
    <circle cx="200" cy="130" r="14" stroke-width="2"/>
    <path d="M60,340 C120,220 280,220 340,340" stroke-width="2"/>
    <line x1="200" y1="360" x2="200" y2="300" stroke-width="2"/>
  `,
};
