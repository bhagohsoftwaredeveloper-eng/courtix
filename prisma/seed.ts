// ============================================================================
// Courtix — database seed
// ----------------------------------------------------------------------------
// Loads the catalog the app currently hard-codes in `src/lib/data` into MySQL:
// sports, cities, amenities, host organizations, facilities and their court
// units, and the open-play sessions.
//
// It reads those files directly rather than restating the data, so the catalog
// can never drift from what the pages render. The demo player is the one
// exception: `src/lib/data/player.ts` is gone now that getCurrentPlayer() reads
// the session, so its fixture is restated as a literal below instead.
//
//   npm run db:seed
//
// Every write is an upsert keyed on a natural unique — running it twice is
// safe, and it never deletes a row a booking might point at.
//
// What it deliberately does NOT seed: bookings, payments, payouts, reviews,
// disputes and waitlist entries. Those are transactional records; inventing
// them would put fake money in the owner and admin dashboards.
// ============================================================================

import { PrismaClient } from "@prisma/client";

import { COURTS, unitLabelFor } from "@/lib/data/courts";
import { allOpenPlays } from "@/lib/data/openplays";
import { SPORTS } from "@/lib/data/sports";
import { hashPassword } from "@/lib/server/password";

const db = new PrismaClient();

/** "Paddle rental" -> "paddle-rental". Amenity ids and org slugs are slugs. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The data files hold pesos; every money column is integer centavos. */
const centavos = (pesos: number): number => Math.round(pesos * 100);

/** @db.Date wants midnight UTC — a booking day has no timezone. */
const dateOnly = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/**
 * Hosts and players in `src/lib/data` are display-only; there are no real
 * contact details to import. Seed addresses use the reserved `.invalid` TLD so
 * a stray row can never reach a real person once notifications are wired up.
 */
const seedEmail = (local: string): string => `${local}@seed.courtix.invalid`;

/** "Mar 2026" -> 2026-03-01. The demo profile records no day. */
function monthYear(value: string): Date {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [month, year] = value.split(" ");
  return new Date(Date.UTC(Number(year), Math.max(0, months.indexOf(month)), 1));
}

/**
 * Seeded accounts exist so the three dashboards can be opened locally. They are
 * skipped entirely in production — a published password on a live platform is
 * a back door, not a convenience.
 */
const DEMO_PASSWORD = "demo1234";
const isProduction = process.env.NODE_ENV === "production";

let demoHash: string | null = null;
async function demoPassword(): Promise<string | null> {
  if (isProduction) return null;
  demoHash ??= await hashPassword(DEMO_PASSWORD);
  return demoHash;
}

/** UI skill labels -> the OpenPlaySkill / SkillLevel enums. */
const OPEN_PLAY_SKILL = {
  Beginner: "BEGINNER",
  Intermediate: "INTERMEDIATE",
  Advanced: "ADVANCED",
  "All Levels": "ALL_LEVELS",
} as const;

const PLAYER_SKILL = {
  Beginner: "BEGINNER",
  Intermediate: "INTERMEDIATE",
  Advanced: "ADVANCED",
} as const;

async function main(): Promise<void> {
  // ---------------------------------------------------------------- platform
  // One row, id "singleton". `update: {}` on purpose: re-seeding must never
  // clobber commission or policy values an admin has already edited.
  await db.platformSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  // ------------------------------------------------------------------ sports
  for (const sport of SPORTS) {
    const data = {
      name: sport.name,
      unitLabel: sport.unitLabel,
      unitLabelPlural: sport.unitLabelPlural,
      fromPriceCents: centavos(sport.fromPrice),
      enabled: true,
    };
    await db.sport.upsert({
      where: { id: sport.slug },
      create: { id: sport.slug, ...data },
      update: data,
    });
  }

  // ------------------------------------------------------------------ cities
  // Derived from each facility's `loc` ("Tagum City, Davao del Norte"). These
  // are LIVE by definition — a facility is already listed in them. Cities the
  // platform hasn't opened yet get added by the admin, not by the seed, so
  // `launchedAt` and `waitlistRank` are left unset here.
  const cityIdByName = new Map<string, string>();
  for (const court of COURTS) {
    if (cityIdByName.has(court.city)) continue;
    const province = court.loc.split(",")[1]?.trim() ?? "";
    const city = await db.city.upsert({
      where: { name_province: { name: court.city, province } },
      create: { name: court.city, province, status: "LIVE" },
      update: { status: "LIVE" },
    });
    cityIdByName.set(court.city, city.id);
  }

  // --------------------------------------------------------------- amenities
  const amenityIdByLabel = new Map<string, string>();
  for (const label of new Set(COURTS.flatMap((c) => c.amenities))) {
    const id = slugify(label);
    await db.amenity.upsert({ where: { id }, create: { id, label }, update: { label } });
    amenityIdByLabel.set(label, id);
  }

  // ----------------------------------------------------------- organizations
  // One org per distinct host. Commission is left null so every host inherits
  // the platform default until an admin sets a founding rate.
  const orgIdByHost = new Map<string, string>();
  for (const host of new Set(COURTS.map((c) => c.host))) {
    const slug = slugify(host);
    const org = await db.organization.upsert({
      where: { slug },
      create: { slug, name: host, contactEmail: seedEmail(slug) },
      update: { name: host },
    });
    orgIdByHost.set(host, org.id);
  }

  // ------------------------------------------- facilities, images, units
  const facilityIdByCourtId = new Map<number, string>();
  let unitCount = 0;

  for (const court of COURTS) {
    const fields = {
      orgId: orgIdByHost.get(court.host)!,
      name: court.name,
      description: court.desc,
      cityId: cityIdByName.get(court.city)!,
      addressText: court.loc,
      primarySportId: court.sport,
      basePriceCents: centavos(court.price),
      opens: court.opens,
      closes: court.closes,
      indoor: court.indoor,
      // Everything in COURTS is a facility the public directory already shows.
      status: "APPROVED" as const,
      // Rollups the reviews table will maintain once reviews are real.
      ratingAvg: court.rating,
      reviewCount: court.reviewCount,
    };

    const facility = await db.facility.upsert({
      where: { slug: court.slug },
      create: { slug: court.slug, ...fields },
      update: fields,
    });
    facilityIdByCourtId.set(court.id, facility.id);

    // The facility plays its primary sport. Multi-sport venues add rows here.
    await db.facilitySport.upsert({
      where: { facilityId_sportId: { facilityId: facility.id, sportId: court.sport } },
      create: { facilityId: facility.id, sportId: court.sport },
      update: {},
    });

    for (const label of court.amenities) {
      const amenityId = amenityIdByLabel.get(label)!;
      await db.facilityAmenity.upsert({
        where: { facilityId_amenityId: { facilityId: facility.id, amenityId } },
        create: { facilityId: facility.id, amenityId },
        update: {},
      });
    }

    for (const [position, image] of court.images.entries()) {
      const id = `img_${court.slug}_${position}`;
      const data = { facilityId: facility.id, url: image.src, alt: image.alt, position };
      await db.facilityImage.upsert({ where: { id }, create: { id, ...data }, update: data });
    }

    // "Court 1"…"Court N", "Bay 1"…"Bay N" — the individually bookable units.
    for (let index = 0; index < court.units; index++) {
      const data = { label: unitLabelFor(court, index), sportId: court.sport, active: true };
      await db.courtUnit.upsert({
        where: { facilityId_index: { facilityId: facility.id, index } },
        create: { facilityId: facility.id, index, ...data },
        update: data,
      });
      unitCount++;
    }

    // If a facility shed units since the last run, retire the extras instead of
    // deleting them — past bookings still reference those rows.
    await db.courtUnit.updateMany({
      where: { facilityId: facility.id, index: { gte: court.units } },
      data: { active: false },
    });
  }

  // -------------------------------------------------------------- open plays
  // Dates in `openplays.ts` are day-offsets from today, so re-seeding rolls the
  // sessions forward to a fresh week — the same behaviour the demo has.
  const plays = allOpenPlays();
  let joinCount = 0;

  for (const play of plays) {
    const facilityId = facilityIdByCourtId.get(play.courtId);
    if (!facilityId) {
      console.warn(`  ! open play ${play.id} points at unknown court ${play.courtId} — skipped`);
      continue;
    }

    const data = {
      facilityId,
      sportId: play.sport,
      title: play.title,
      organizer: play.organizer,
      date: dateOnly(play.date),
      startHour: play.startHour,
      hours: play.hours,
      pricePerPlayerCents: centavos(play.pricePerPlayer),
      capacity: play.capacity,
      skill: OPEN_PLAY_SKILL[play.skill],
      fastPay: play.fastPay,
      status: "SCHEDULED" as const,
    };
    await db.openPlay.upsert({ where: { id: play.id }, create: { id: play.id, ...data }, update: data });

    // `seededJoined` is just a display number in the demo data. Here it has to
    // be actual rows, because seats-taken is now a COUNT over this table.
    for (let seat = 1; seat <= play.seededJoined; seat++) {
      const playerEmail = seedEmail(`seat${seat}.${play.id}`);
      await db.openPlayJoin.upsert({
        where: { openPlayId_playerEmail: { openPlayId: play.id, playerEmail } },
        create: {
          openPlayId: play.id,
          playerEmail,
          playerName: `Seeded Player ${seat}`,
          playerPhone: "09170000000",
          status: seat <= play.capacity ? "CONFIRMED" : "WAITLISTED",
        },
        update: {},
      });
      joinCount++;
    }
  }

  // ------------------------------------------------------------- demo player
  // The profile behind /player-home. Its email matches bookings the demo
  // creates, so that page keeps working once it reads from the database.
  //
  // Used to come from src/lib/data/player.ts; now that getCurrentPlayer()
  // reads the session instead, this script is the fixture's one remaining
  // home.
  const demo = {
    name: "Jomar Reyes",
    email: "jomar.r@example.ph",
    phone: "09171234567",
    city: "Tagum City",
    skill: "Intermediate",
    rating: 3.5,
    favouriteSports: ["pickleball", "badminton"],
    savedCourtIds: [1, 7, 3],
    memberSince: "Mar 2026",
  } as const;

  // Read the existing hash first: the upsert must only fill a missing one, so
  // that a password changed since the last seed survives a re-seed.
  const existing = await db.user.findUnique({
    where: { email: demo.email },
    select: { passwordHash: true },
  });

  const user = await db.user.upsert({
    where: { email: demo.email },
    create: {
      email: demo.email,
      name: demo.name,
      phone: demo.phone,
      role: "PLAYER",
      passwordHash: await demoPassword(),
    },
    update: {
      name: demo.name,
      phone: demo.phone,
      passwordHash: existing?.passwordHash ?? (await demoPassword()),
    },
  });

  const profileFields = {
    skill: PLAYER_SKILL[demo.skill],
    rating: demo.rating,
    homeCityId: cityIdByName.get(demo.city) ?? null,
  };
  const profile = await db.playerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, memberSince: monthYear(demo.memberSince), ...profileFields },
    update: profileFields,
  });

  for (const sportId of demo.favouriteSports) {
    await db.playerSport.upsert({
      where: { playerProfileId_sportId: { playerProfileId: profile.id, sportId } },
      create: { playerProfileId: profile.id, sportId },
      update: {},
    });
  }

  for (const courtId of demo.savedCourtIds) {
    const facilityId = facilityIdByCourtId.get(courtId);
    if (!facilityId) continue;
    await db.savedCourt.upsert({
      where: { playerId_facilityId: { playerId: user.id, facilityId } },
      create: { playerId: user.id, facilityId },
      update: {},
    });
  }

  // ------------------------------------------------------------ staff logins
  if (!isProduction) {
    const ownerOrg = await db.organization.findUnique({
      where: { slug: "kitchen-line-club" },
      select: { id: true, name: true },
    });

    const owner = await db.user.upsert({
      where: { email: "owner@kitchenline.ph" },
      create: {
        email: "owner@kitchenline.ph",
        name: "Kitchen Line Club",
        role: "OWNER",
        passwordHash: await demoPassword(),
      },
      update: { role: "OWNER" },
    });

    if (ownerOrg) {
      await db.organizationMember.upsert({
        where: { orgId_userId: { orgId: ownerOrg.id, userId: owner.id } },
        create: { orgId: ownerOrg.id, userId: owner.id, role: "OWNER" },
        update: {},
      });
    }

    await db.user.upsert({
      where: { email: "admin@courtix.ph" },
      create: {
        email: "admin@courtix.ph",
        name: "Courtix Admin",
        role: "SUPER_ADMIN",
        passwordHash: await demoPassword(),
      },
      update: { role: "SUPER_ADMIN" },
    });
  }

  console.log(
    [
      "Seeded:",
      `  ${SPORTS.length} sports`,
      `  ${cityIdByName.size} cities (LIVE)`,
      `  ${amenityIdByLabel.size} amenities`,
      `  ${orgIdByHost.size} host organizations`,
      `  ${COURTS.length} facilities · ${unitCount} court units`,
      `  ${plays.length} open plays · ${joinCount} seats taken`,
      "  1 demo player + profile",
      isProduction ? "  staff logins skipped (production)" : "  3 login accounts (password: demo1234)",
      "  1 platform settings row",
    ].join("\n"),
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
