// ============================================================================
// Courtix — demo transactional seed (Phase 3)
// ----------------------------------------------------------------------------
// `seed.ts` loads the catalog and deliberately stops there: it says inventing
// bookings would "put fake money in the owner and admin dashboards". That is
// still true, which is why this is a separate script behind a separate command.
//
//   npm run db:seed:demo
//
// It generates 60 days of trading — bookings, payments, refunds, payouts,
// reviews, disputes, open-play joins — so the owner and admin dashboards have
// something real to query. Run `npm run db:seed` first; this script reads the
// catalog it creates and fails without it.
//
// REGENERATES, NOT APPENDS. Every run deletes the transactional tables listed
// in `wipe()` and rebuilds them. It never touches the catalog, users, or
// WaitlistEntry — real signups survive. It refuses to run in production.
//
// Deterministic: one fixed RNG seed and explicit `dm_*` row ids, so two runs
// produce byte-identical data and a row seen in the UI can be found by id.
// ============================================================================

import { PrismaClient, type Prisma } from "@prisma/client";

import { COURTS } from "@/lib/data/courts";

const db = new PrismaClient();

// ---------------------------------------------------------------- guardrails

if (process.env.NODE_ENV === "production") {
  console.error("seed-demo: refusing to run with NODE_ENV=production.");
  process.exit(1);
}

// -------------------------------------------------------------------- config

/** Trading days generated: 45 in the past, today, and 14 ahead. */
const DAYS_BACK = 45;
const DAYS_AHEAD = 14;
const TARGET_BOOKINGS = 500;
const PLAYER_COUNT = 40;

/** Fixed so re-runs are byte-identical. Change it to get a different dataset. */
const RNG_SEED = 20260728;

// ------------------------------------------------------------------- helpers

/** Small deterministic PRNG — Math.random() would make runs irreproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(RNG_SEED);

const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
/** True with probability `p`. */
const chance = (p: number): boolean => rand() < p;

/** @db.Date columns want midnight UTC — a booking day has no timezone. */
function dayOffset(days: number): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

/** Zero-padded sequence ids: readable in Studio, stable across runs. */
const id = (prefix: string, n: number): string => `dm_${prefix}_${String(n).padStart(4, "0")}`;

/** Booking refs use the same alphabet as the app — no I/O/0/1. */
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function bookingRef(n: number): string {
  let out = "";
  let v = n * 7919 + 104729; // spread sequential ids across the alphabet
  for (let i = 0; i < 6; i++) {
    out += REF_ALPHABET[v % REF_ALPHABET.length];
    v = Math.floor(v / REF_ALPHABET.length) + 31 * (i + 1);
  }
  return `CTX-${out}`;
}

const seedEmail = (local: string): string => `${local}@demo.courtix.invalid`;

const FIRST_NAMES = [
  "Jomar", "Rhea", "Kier", "Mylene", "Dexter", "Airah", "Noel", "Jhona",
  "Reymart", "Kristine", "Arvin", "Shaira", "Lloyd", "Marife", "Jayvee",
  "Chesca", "Rommel", "Divine", "Aldrin", "Precious",
];

const LAST_NAMES = [
  "Reyes", "Bautista", "Villanueva", "Cabrera", "Dela Peña", "Mendoza",
  "Sarmiento", "Gonzales", "Ang", "Padilla", "Tolentino", "Lumbao",
  "Espinosa", "Navarro", "Quilaton", "Bagayas", "Delos Santos", "Uy",
  "Panganiban", "Macasaet",
];

/** Comment bank for reviews — five bands so the text matches the stars. */
const REVIEW_TEXT: Record<number, string[]> = {
  5: [
    "Courts were spotless and the lights were already on when we arrived.",
    "Booked at 9pm, still got a proper warm-up. Staff were great.",
    "Best surface in the city, no question. We're moving our weekly game here.",
  ],
  4: [
    "Solid courts, only knock is parking gets tight after 6pm.",
    "Nets were tensioned properly. Aircon could be stronger.",
    "Good value for the rate. Will book again.",
  ],
  3: [
    "Fine for a casual game. One of the lights was out on court 2.",
    "Court was okay, but we started 15 minutes late waiting for staff.",
  ],
  2: [
    "Surface was slippery near the baseline. Told the front desk.",
    "Booked two hours, got moved to a different court halfway through.",
  ],
  1: ["Arrived and the court was double-booked with a league. Refunded, but still."],
};

// ------------------------------------------------------------------ the wipe

/**
 * Delete order follows the foreign keys inward: children before parents. Some
 * of these cascade anyway, but naming each one keeps the script honest about
 * exactly which tables it owns.
 */
async function wipe(): Promise<void> {
  await db.disputeMessage.deleteMany();
  await db.dispute.deleteMany();
  await db.review.deleteMany();
  await db.payoutItem.deleteMany();
  await db.payout.deleteMany();
  await db.refund.deleteMany();
  await db.payment.deleteMany();
  await db.bookingSlot.deleteMany();
  await db.booking.deleteMany();
  await db.openPlayJoin.deleteMany();
  await db.facilityTransaction.deleteMany();
  await db.membership.deleteMany();
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  // Facilities this script invented for the approvals queue. Catalog
  // facilities from seed.ts have real slugs and are left alone.
  await db.facility.deleteMany({ where: { slug: { startsWith: "demo-pending-" } } });
}

// ---------------------------------------------------------------------- main

async function main(): Promise<void> {
  const settings = await db.platformSetting.findUnique({ where: { id: "singleton" } });
  if (!settings) throw new Error("No PlatformSetting row. Run `npm run db:seed` first.");

  const facilities = await db.facility.findMany({
    where: { status: "APPROVED" },
    include: { courtUnits: { where: { active: true } }, org: true },
  });
  if (facilities.length === 0) throw new Error("No approved facilities. Run `npm run db:seed` first.");

  const cities = await db.city.findMany({ where: { status: "LIVE" } });
  const sports = await db.sport.findMany();

  await wipe();

  // ------------------------------------------------------------------ players
  // Upserted rather than wiped: a demo player may already hold a waitlist entry
  // or a session, and deleting the user would take those with it.
  const playerIds: string[] = [];
  const playerById = new Map<string, { name: string; email: string; phone: string }>();

  for (let i = 0; i < PLAYER_COUNT; i++) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`;
    const email = seedEmail(`player${String(i + 1).padStart(2, "0")}`);
    const phone = `09${String(170000000 + i * 137911).slice(0, 9)}`;

    const user = await db.user.upsert({
      where: { email },
      create: { email, name, phone, role: "PLAYER" },
      update: { name, phone },
    });

    const city = cities[i % cities.length];
    const profileFields = {
      skill: pick(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const),
      rating: Number((2.5 + rand() * 2).toFixed(2)),
      homeCityId: city?.id ?? null,
    };
    const profile = await db.playerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profileFields },
      update: profileFields,
    });

    // One or two favourite sports each.
    const favourites = new Set([pick(sports).id]);
    if (chance(0.45)) favourites.add(pick(sports).id);
    for (const sportId of favourites) {
      await db.playerSport.upsert({
        where: { playerProfileId_sportId: { playerProfileId: profile.id, sportId } },
        create: { playerProfileId: profile.id, sportId },
        update: {},
      });
    }

    playerIds.push(user.id);
    playerById.set(user.id, { name, email, phone });
  }

  // ----------------------------------------------------------------- bookings
  const bookings: Prisma.BookingCreateManyInput[] = [];
  const slots: Prisma.BookingSlotCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const refunds: Prisma.RefundCreateManyInput[] = [];

  /** `courtUnitId|YYYY-MM-DD|hour` — mirrors the DB's uniqueness rule so a
   *  generated booking can never collide with one already placed. */
  const takenSlots = new Set<string>();

  let bookingSeq = 0;
  let slotSeq = 0;
  let paymentSeq = 0;
  let refundSeq = 0;
  let attempts = 0;

  while (bookingSeq < TARGET_BOOKINGS && attempts < TARGET_BOOKINGS * 12) {
    attempts++;

    const facility = pick(facilities);
    if (facility.courtUnits.length === 0) continue;
    const unit = pick(facility.courtUnits);

    const offset = randInt(-DAYS_BACK, DAYS_AHEAD);
    const date = dayOffset(offset);
    const day = isoDay(date);

    // Evenings and weekends carry the load, the way court demand actually runs.
    const weekend = [0, 6].includes(date.getUTCDay());
    const startHour = chance(weekend ? 0.45 : 0.68)
      ? randInt(17, Math.max(18, facility.closes - 2))
      : randInt(facility.opens, Math.max(facility.opens + 1, facility.closes - 3));
    const hours = chance(0.72) ? 1 : chance(0.6) ? 2 : 3;

    if (startHour < facility.opens || startHour + hours > facility.closes) continue;

    const wanted = Array.from({ length: hours }, (_, i) => `${unit.id}|${day}|${startHour + i}`);
    if (wanted.some((k) => takenSlots.has(k))) continue;

    // Past days are settled; future days are still on the books.
    const status: Prisma.BookingCreateManyInput["status"] =
      offset > 0
        ? chance(0.06)
          ? "HELD"
          : "CONFIRMED"
        : chance(0.08)
          ? "CANCELLED"
          : chance(0.04)
            ? "NO_SHOW"
            : "COMPLETED";

    // A cancelled booking releases its court — the app deletes the slot rows on
    // cancel, so generating them here would misrepresent occupancy.
    if (status !== "CANCELLED") wanted.forEach((k) => takenSlots.add(k));

    bookingSeq++;
    const bookingId = id("bk", bookingSeq);

    const unitPriceCents = unit.priceCentsOverride ?? facility.basePriceCents;
    const subtotalCents = unitPriceCents * hours;
    const serviceFeeCents = Math.round((subtotalCents * settings.serviceFeeBps) / 10_000);
    const commissionBps = facility.org.commissionBps ?? settings.standardCommissionBps;
    const commissionCents = Math.round((subtotalCents * commissionBps) / 10_000);
    const totalCents = subtotalCents + serviceFeeCents;

    // A quarter of bookings are guests — no account, contact details only.
    const playerId = chance(0.75) ? pick(playerIds) : null;
    const contact = playerId
      ? playerById.get(playerId)!
      : {
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          email: seedEmail(`guest${bookingSeq}`),
          phone: `09${String(180000000 + bookingSeq * 5171).slice(0, 9)}`,
        };

    const createdAt = new Date(date);
    createdAt.setUTCDate(createdAt.getUTCDate() - randInt(1, 9));

    bookings.push({
      id: bookingId,
      ref: bookingRef(bookingSeq),
      facilityId: facility.id,
      courtUnitId: unit.id,
      sportId: unit.sportId,
      playerId,
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      date,
      startHour,
      hours,
      status,
      unitPriceCents,
      subtotalCents,
      serviceFeeCents,
      commissionBps,
      commissionCents,
      totalCents,
      notes: chance(0.12) ? "Please have the net set up before we arrive." : null,
      heldUntil: status === "HELD" ? new Date(Date.now() + 15 * 60_000) : null,
      cancelledAt: status === "CANCELLED" ? createdAt : null,
      createdAt,
    });

    if (status !== "CANCELLED") {
      for (let h = 0; h < hours; h++) {
        slotSeq++;
        slots.push({
          id: id("sl", slotSeq),
          bookingId,
          courtUnitId: unit.id,
          date,
          hour: startHour + h,
        });
      }
    }

    // ------------------------------------------------------------- payment
    paymentSeq++;
    const paymentId = id("pm", paymentSeq);
    const paymentStatus: Prisma.PaymentCreateManyInput["status"] =
      status === "CANCELLED" ? (chance(0.7) ? "REFUNDED" : "FAILED") : status === "HELD" ? "PENDING" : "PAID";

    payments.push({
      id: paymentId,
      bookingId,
      provider: chance(0.85) ? "PAYMONGO" : "MANUAL",
      method: pick(["CARD", "GCASH", "GRABPAY", "MAYA", "PAY_AT_VENUE"] as const),
      amountCents: totalCents,
      status: paymentStatus,
      paidAt: paymentStatus === "PAID" || paymentStatus === "REFUNDED" ? createdAt : null,
      createdAt,
    });

    if (paymentStatus === "REFUNDED") {
      refundSeq++;
      refunds.push({
        id: id("rf", refundSeq),
        paymentId,
        amountCents: totalCents,
        reason: pick([
          "Cancelled more than 12 hours ahead",
          "Venue closed for maintenance",
          "Player requested reschedule",
        ]),
        status: "PROCESSED",
        createdAt,
      });
    }
  }

  await db.booking.createMany({ data: bookings });
  await db.bookingSlot.createMany({ data: slots });
  await db.payment.createMany({ data: payments });
  await db.refund.createMany({ data: refunds });

  // ------------------------------------------------------------------ reviews
  // Only completed bookings by a signed-in player can be reviewed — a guest has
  // no account to attribute the rating to.
  const reviewable = bookings.filter((b) => b.status === "COMPLETED" && b.playerId);
  const reviews: Prisma.ReviewCreateManyInput[] = [];
  let reviewSeq = 0;

  for (const b of reviewable) {
    if (!chance(0.38)) continue;
    // Ratings skew high, as they do on any marketplace that removes bad hosts.
    const rating = chance(0.62) ? 5 : chance(0.6) ? 4 : chance(0.6) ? 3 : chance(0.5) ? 2 : 1;
    reviewSeq++;
    reviews.push({
      id: id("rv", reviewSeq),
      bookingId: b.id!,
      facilityId: b.facilityId,
      playerId: b.playerId!,
      rating,
      comment: chance(0.8) ? pick(REVIEW_TEXT[rating]) : null,
      createdAt: b.createdAt as Date,
    });
  }
  await db.review.createMany({ data: reviews });

  // Refresh the denormalised rollups from what was actually written, so the
  // directory's star ratings agree with the reviews behind them.
  for (const facility of facilities) {
    const mine = reviews.filter((r) => r.facilityId === facility.id);
    if (mine.length === 0) continue;
    const avg = mine.reduce((sum, r) => sum + r.rating, 0) / mine.length;
    await db.facility.update({
      where: { id: facility.id },
      data: { ratingAvg: Number(avg.toFixed(1)), reviewCount: mine.length },
    });
  }

  // ------------------------------------------------------------------ payouts
  // Twice-monthly remittance, the schedule the Payout model documents: the 1st
  // to the 15th, then the 16th to month end. Only settled bookings are
  // remitted, and each booking appears in exactly one payout.
  const settled = bookings.filter((b) => b.status === "COMPLETED" || b.status === "NO_SHOW");
  const payouts: Prisma.PayoutCreateManyInput[] = [];
  const payoutItems: Prisma.PayoutItemCreateManyInput[] = [];
  let payoutSeq = 0;
  let payoutItemSeq = 0;

  const periods: { start: Date; end: Date }[] = [];
  for (let back = 3; back >= 0; back--) {
    const ref = dayOffset(0);
    const month = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - Math.floor(back / 2), 1));
    const secondHalf = back % 2 === 0;
    const start = new Date(month);
    const end = new Date(month);
    if (secondHalf) {
      start.setUTCDate(16);
      end.setUTCMonth(end.getUTCMonth() + 1, 0);
    } else {
      start.setUTCDate(1);
      end.setUTCDate(15);
    }
    periods.push({ start, end });
  }

  const orgs = [...new Map(facilities.map((f) => [f.org.id, f.org])).values()];
  const facilityOrg = new Map(facilities.map((f) => [f.id, f.org.id]));
  const remitted = new Set<string>();

  for (const org of orgs) {
    for (const period of periods) {
      const items = settled.filter((b) => {
        if (remitted.has(b.id!)) return false;
        if (facilityOrg.get(b.facilityId) !== org.id) return false;
        const d = b.date as Date;
        return d >= period.start && d <= period.end;
      });
      if (items.length === 0) continue;

      const grossCents = items.reduce((sum, b) => sum + b.subtotalCents, 0);
      const commissionCents = items.reduce((sum, b) => sum + b.commissionCents, 0);

      payoutSeq++;
      const payoutId = id("po", payoutSeq);
      const paid = period.end < dayOffset(0);

      payouts.push({
        id: payoutId,
        orgId: org.id,
        periodStart: period.start,
        periodEnd: period.end,
        grossCents,
        commissionCents,
        netCents: grossCents - commissionCents,
        status: paid ? "PAID" : "SCHEDULED",
        paidAt: paid ? period.end : null,
        createdAt: period.end,
      });

      for (const b of items) {
        remitted.add(b.id!);
        payoutItemSeq++;
        payoutItems.push({ id: id("pi", payoutItemSeq), payoutId, bookingId: b.id! });
      }
    }
  }

  await db.payout.createMany({ data: payouts });
  await db.payoutItem.createMany({ data: payoutItems });

  // ----------------------------------------------------------- open-play joins
  const openPlays = await db.openPlay.findMany({ where: { status: "SCHEDULED" } });
  const joins: Prisma.OpenPlayJoinCreateManyInput[] = [];
  let joinSeq = 0;

  for (const play of openPlays) {
    // Fill most of the seats; the last few stay open so the join button works.
    const taken = Math.max(1, Math.round(play.capacity * (0.45 + rand() * 0.45)));
    const used = new Set<string>();

    for (let i = 0; i < taken; i++) {
      const playerId = pick(playerIds);
      const p = playerById.get(playerId)!;
      if (used.has(p.email)) continue; // one seat per player per session
      used.add(p.email);

      joinSeq++;
      joins.push({
        id: id("oj", joinSeq),
        openPlayId: play.id,
        playerId,
        playerName: p.name,
        playerEmail: p.email,
        playerPhone: p.phone,
        status: used.size > play.capacity ? "WAITLISTED" : "CONFIRMED",
      });
    }
  }
  await db.openPlayJoin.createMany({ data: joins });

  // -------------------------------------------------------- facility revenue
  // Non-booking income the owner's "recent transactions" panel shows.
  const transactions: Prisma.FacilityTransactionCreateManyInput[] = [];
  let txnSeq = 0;

  for (const facility of facilities) {
    for (let i = 0; i < randInt(2, 6); i++) {
      txnSeq++;
      const type = pick(["MEMBERSHIP", "RENTAL", "OTHER"] as const);
      transactions.push({
        id: id("tx", txnSeq),
        facilityId: facility.id,
        type,
        label:
          type === "MEMBERSHIP"
            ? "Monthly membership"
            : type === "RENTAL"
              ? pick(["Paddle rental", "Shuttlecock tube", "Ball hire"])
              : "Locker hire",
        amountCents: randInt(15_000, 250_000),
        createdAt: dayOffset(-randInt(1, DAYS_BACK)),
      });
    }
  }
  await db.facilityTransaction.createMany({ data: transactions });

  // ----------------------------------------------------------------- disputes
  // Raised against real bookings so opening one from the admin queue leads
  // somewhere. Cancelled and no-show bookings are the natural candidates.
  const disputeCandidates = bookings.filter(
    (b) => (b.status === "CANCELLED" || b.status === "NO_SHOW") && b.playerId,
  );
  const disputes: Prisma.DisputeCreateManyInput[] = [];
  const disputeMessages: Prisma.DisputeMessageCreateManyInput[] = [];
  let disputeSeq = 0;
  let messageSeq = 0;

  for (const b of disputeCandidates.slice(0, 9)) {
    disputeSeq++;
    const disputeId = id("dp", disputeSeq);
    const status = pick(["OPEN", "IN_REVIEW", "RESOLVED", "ESCALATED"] as const);
    const raisedAt = b.createdAt as Date;
    const slaDueAt = new Date(raisedAt);
    slaDueAt.setUTCDate(slaDueAt.getUTCDate() + 3);

    disputes.push({
      id: disputeId,
      bookingId: b.id!,
      facilityId: b.facilityId,
      raisedById: b.playerId!,
      type: b.status === "NO_SHOW" ? "NO_SHOW" : pick(["REFUND_REQUEST", "DOUBLE_BOOKING", "OTHER"] as const),
      status,
      slaDueAt,
      resolvedAt: status === "RESOLVED" ? slaDueAt : null,
      resolutionNote: status === "RESOLVED" ? "Refund issued in full and the slot released." : null,
      createdAt: raisedAt,
    });

    messageSeq++;
    disputeMessages.push({
      id: id("dm", messageSeq),
      disputeId,
      senderId: b.playerId!,
      body: pick([
        "We arrived on time and the court was occupied by a league game.",
        "I cancelled 14 hours ahead but was still charged the full amount.",
        "The booking confirmation says Court 2 but we were sent to Court 5.",
      ]),
      createdAt: raisedAt,
    });
  }

  await db.dispute.createMany({ data: disputes });
  await db.disputeMessage.createMany({ data: disputeMessages });

  // -------------------------------------------------------- approvals queue
  // `/admin/approvals` has nothing to show while every catalog facility is
  // APPROVED. These three exist purely to give that page real rows to act on.
  const pendingOrg = orgs[0];
  const pendingCity = cities[0];
  const pendingSport = COURTS[0].sport;

  const pending: Prisma.FacilityCreateManyInput[] = [
    {
      id: id("fc", 1),
      slug: "demo-pending-smash-lab",
      orgId: pendingOrg.id,
      name: "Smash Lab Panabo",
      description: "Two indoor badminton halls with sprung flooring, submitted for review.",
      cityId: pendingCity.id,
      addressText: "Panabo City, Davao del Norte",
      primarySportId: "badminton",
      basePriceCents: 28_000,
      opens: 6,
      closes: 22,
      indoor: true,
      status: "PENDING_REVIEW",
    },
    {
      id: id("fc", 2),
      slug: "demo-pending-riverside",
      orgId: orgs[1 % orgs.length].id,
      name: "Riverside Pickle Courts",
      description: "Four outdoor pickleball courts by the river, lights installed last month.",
      cityId: pendingCity.id,
      addressText: "Tagum City, Davao del Norte",
      primarySportId: pendingSport,
      basePriceCents: 32_000,
      opens: 6,
      closes: 21,
      indoor: false,
      status: "PENDING_REVIEW",
    },
    {
      id: id("fc", 3),
      slug: "demo-pending-northgate",
      orgId: orgs[2 % orgs.length].id,
      name: "Northgate Hoops",
      description: "Covered basketball court, submitted without proof of ownership.",
      cityId: pendingCity.id,
      addressText: "Davao City, Davao del Sur",
      primarySportId: "basketball",
      basePriceCents: 45_000,
      opens: 7,
      closes: 23,
      indoor: false,
      status: "DRAFT",
    },
  ];
  await db.facility.createMany({ data: pending });

  // -------------------------------------------------------------- audit trail
  const admin = await db.user.findUnique({ where: { email: "admin@courtix.ph" } });
  if (admin) {
    await db.auditLog.createMany({
      data: facilities.slice(0, 6).map((f, i) => ({
        id: id("al", i + 1),
        actorId: admin.id,
        action: "facility.approve",
        entity: "Facility",
        entityId: f.id,
        createdAt: dayOffset(-DAYS_BACK + i),
      })),
    });
  }

  // ------------------------------------------------------------ notifications
  const notifiable = bookings
    .filter((b) => b.playerId && b.status === "CONFIRMED")
    .slice(0, 25);

  await db.notification.createMany({
    data: notifiable.map((b, i) => ({
      id: id("nt", i + 1),
      userId: b.playerId!,
      event: "BOOKING_CONFIRMED" as const,
      channel: "EMAIL" as const,
      title: `Booking ${b.ref} confirmed`,
      body: `Your court is held for ${isoDay(b.date as Date)} at ${b.startHour}:00.`,
      readAt: chance(0.5) ? (b.createdAt as Date) : null,
      createdAt: b.createdAt as Date,
    })),
  });

  console.log(
    [
      "Demo data regenerated:",
      `  players            ${PLAYER_COUNT}`,
      `  bookings           ${bookings.length}  (${slots.length} court-hours held)`,
      `  payments           ${payments.length}  (${refunds.length} refunded)`,
      `  reviews            ${reviews.length}`,
      `  payouts            ${payouts.length}  (${payoutItems.length} items)`,
      `  open-play joins    ${joins.length}`,
      `  facility txns      ${transactions.length}`,
      `  disputes           ${disputes.length}`,
      `  pending facilities ${pending.length}`,
      "",
      `  window             ${isoDay(dayOffset(-DAYS_BACK))} to ${isoDay(dayOffset(DAYS_AHEAD))}`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
