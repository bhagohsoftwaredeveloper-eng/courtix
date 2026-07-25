/**
 * Demo figures for the owner and super-admin dashboards.
 *
 * These are static on purpose — the dashboards exist to show the shape of the
 * product to investors and pilot hosts, and wiring them to live aggregates is
 * Phase 4 work (see BOOKING_INTEGRATION_PLAN.md). Every field here maps to a
 * query described in that document.
 */

export interface Kpi {
  label: string;
  value: string;
  delta?: string;
  /** Renders the delta in warm red instead of yellow. */
  warn?: boolean;
}

export const OWNER_KPIS: Kpi[] = [
  { label: "Bookings this month", value: "128", delta: "↑ 18.5%" },
  { label: "Revenue this month", value: "₱45,680", delta: "↑ 15.7%" },
  { label: "Court utilization", value: "78%", delta: "↑ 8.2%" },
  { label: "Active players", value: "435", delta: "↑ 12.7%" },
];

export const OWNER_WEEK = [
  { day: "Mon", pct: 38 },
  { day: "Tue", pct: 55 },
  { day: "Wed", pct: 70 },
  { day: "Thu", pct: 48 },
  { day: "Fri", pct: 90 },
  { day: "Sat", pct: 100 },
  { day: "Sun", pct: 64 },
];

export const OWNER_UPCOMING = [
  { unit: "Court 1", when: "Today · 6:00 PM", player: "J. Reyes", status: "confirmed" as const },
  { unit: "Court 2", when: "Today · 7:00 PM", player: "M. Alvarez", status: "confirmed" as const },
  { unit: "Court 1", when: "Tomorrow · 8:00 AM", player: "League group ×4", status: "confirmed" as const },
  { unit: "Court 2", when: "Tomorrow · 5:00 PM", player: "R. Bautista", status: "pending" as const },
  { unit: "Court 1", when: "Sat · 9:00 AM", player: "Tagum Dinkers", status: "confirmed" as const },
];

export const OWNER_COURT_STATUS = [
  { unit: "Court 1", state: "Booked", tone: "booked" as const },
  { unit: "Court 2", state: "Available", tone: "open" as const },
  { unit: "Court 3", state: "Maintenance", tone: "pending" as const },
];

export const OWNER_TRANSACTIONS = [
  { label: "Booking payment", sub: "J. Reyes · CTX-4KP2QA", amount: "₱1,200" },
  { label: "Membership", sub: "M. Alvarez · monthly", amount: "₱1,050" },
  { label: "Paddle rental", sub: "Court 1", amount: "₱150" },
  { label: "Booking payment", sub: "Tagum Dinkers · CTX-9WR3TX", amount: "₱2,100" },
];

export const OWNER_PAYOUTS = [
  { period: "01–15 Jul 2026", gross: "₱24,300", fee: "₱2,916", net: "₱21,384", state: "Paid" },
  { period: "16–30 Jun 2026", gross: "₱21,380", fee: "₱2,566", net: "₱18,814", state: "Paid" },
  { period: "01–15 Jun 2026", gross: "₱19,900", fee: "₱2,388", net: "₱17,512", state: "Paid" },
  { period: "16–31 Jul 2026", gross: "₱21,380", fee: "₱2,566", net: "₱18,814", state: "Scheduled" },
];

/* ------------------------------------------------------------ super admin */

export const ADMIN_KPIS: Kpi[] = [
  { label: "Total facilities", value: "142", delta: "↑ 9 this month" },
  { label: "Total players", value: "18,940", delta: "↑ 6.4%" },
  { label: "Platform revenue", value: "₱612,400", delta: "↑ 11.3%" },
  { label: "Pending approvals", value: "7", delta: "Needs review", warn: true },
];

export const ADMIN_TOP_FACILITIES = [
  { name: "Kitchen Line Club", sport: "Pickleball", bookings: 128, revenue: "₱45,680" },
  { name: "Fairway Bay Simulator", sport: "Golf", bookings: 96, revenue: "₱86,400" },
  { name: "Baseline Fieldhouse", sport: "Basketball", bookings: 110, revenue: "₱55,000" },
  { name: "Smash Point Arena", sport: "Badminton", bookings: 142, revenue: "₱39,760" },
  { name: "Hoop House Davao", sport: "Basketball", bookings: 187, revenue: "₱121,550" },
];

export const ADMIN_REVENUE_BY_SPORT = [
  { day: "Pickleball", pct: 60 },
  { day: "Badminton", pct: 45 },
  { day: "Basketball", pct: 80 },
  { day: "Golf", pct: 100 },
];

export const ADMIN_APPROVALS = [
  { name: "Riverside Courts", sub: "Pickleball · Panabo City", submitted: "2 days ago" },
  { name: "Green Bay Golf Bays", sub: "Golf · Davao City", submitted: "3 days ago" },
  { name: "Hoop House", sub: "Basketball · Tagum City", submitted: "4 days ago" },
  { name: "Ace Shuttle Center", sub: "Badminton · Digos City", submitted: "6 days ago" },
];

export const ADMIN_DISPUTES = [
  { label: "Refund request", sub: "Smash Point Arena · CTX-2LM8QP", tone: "pending" as const, state: "Open" },
  { label: "No-show claim", sub: "Backboard Barangay Court · CTX-7HJ4KD", tone: "open" as const, state: "Resolved" },
  { label: "Double booking", sub: "Rally Hall Tagum · CTX-5NB1CV", tone: "booked" as const, state: "Escalated" },
];

export const ADMIN_USERS = [
  { name: "Jomar Reyes", email: "jomar.r@example.ph", role: "Player", city: "Tagum City", joined: "Mar 2026", bookings: 34 },
  { name: "Kitchen Line Club", email: "hello@kitchenline.ph", role: "Owner", city: "Tagum City", joined: "Jan 2026", bookings: 128 },
  { name: "Mica Alvarez", email: "mica.a@example.ph", role: "Player", city: "Davao City", joined: "Feb 2026", bookings: 51 },
  { name: "Fairway Bay", email: "ops@fairwaybay.ph", role: "Owner", city: "Davao City", joined: "Dec 2025", bookings: 96 },
  { name: "Rico Bautista", email: "rico.b@example.ph", role: "Player", city: "Panabo City", joined: "May 2026", bookings: 12 },
];
