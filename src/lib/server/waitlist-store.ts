import "server-only";

import { Prisma } from "@prisma/client";

import { SPORTS } from "@/lib/data/sports";
import { db } from "@/lib/server/db";
import { ROLE_TO_DB, toWaitlistEntry } from "@/lib/waitlist";
import type { Storage } from "@/lib/server/storage";
import type { SportSlug } from "@/lib/types";

/**
 * The MySQL half of `Storage`. Only the waitlist lives here; bookings and
 * open-play joins are still served by the JSON driver in `storage.ts`, which
 * spreads this object over itself.
 *
 * `import type { Storage }` is erased at compile time, so the two modules
 * referencing each other is a type-level cycle only.
 */
type WaitlistStore = Pick<Storage, "listWaitlist" | "findWaitlistByEmail" | "addWaitlist">;

/** Every read returns the sport join rows — `toWaitlistEntry` requires them. */
const WITH_SPORTS = { sports: { select: { sportId: true } } } as const;

/**
 * The pitch demo has always reported a queue that already has weight, and
 * visitors have been handed numbers from this range. Changing it would make a
 * position someone screenshotted disagree with the one in the database.
 */
const POSITION_OFFSET = 1200;

/** Prisma's unique-constraint violation. Mirrors `isRecordNotFound` in auth.ts. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * `npm start` runs `prisma migrate deploy` and never seeds, so a production
 * database can have an empty `Sport` table. Sports are catalog constants rather
 * than transactional data, so the first signup mentioning one may create it —
 * from the same source `prisma/seed.ts` reads, so the two can't disagree.
 */
function sportSeed(slug: SportSlug) {
  const sport = SPORTS.find((s) => s.slug === slug);
  if (!sport) throw new Error(`Unknown sport slug: ${slug}`);

  return {
    id: sport.slug,
    name: sport.name,
    unitLabel: sport.unitLabel,
    unitLabelPlural: sport.unitLabelPlural,
    fromPriceCents: Math.round(sport.fromPrice * 100),
  };
}

/**
 * Link the typed city to a `City` row so the launch-order reports can join on
 * it. MySQL's default collation is case-insensitive, so "tagum city" finds the
 * seeded "Tagum City" and inherits its real province; anything unrecognised
 * gets a new row with `province: "Unknown"` for an admin to correct later.
 *
 * The raw text is stored in `cityText` either way — a mis-link must never lose
 * what the visitor actually wrote.
 */
async function resolveCityId(tx: Prisma.TransactionClient, cityText: string): Promise<string> {
  const existing = await tx.city.findFirst({ where: { name: cityText }, select: { id: true } });
  if (existing) return existing.id;

  const created = await tx.city.create({
    data: { name: cityText, province: "Unknown", status: "WAITLIST" },
    select: { id: true },
  });
  return created.id;
}

export const prismaWaitlist: WaitlistStore = {
  async listWaitlist() {
    const rows = await db.waitlistEntry.findMany({
      include: WITH_SPORTS,
      orderBy: { position: "asc" },
    });
    return rows.map(toWaitlistEntry);
  },

  async findWaitlistByEmail(email) {
    const row = await db.waitlistEntry.findUnique({
      where: { email: email.toLowerCase() },
      include: WITH_SPORTS,
    });
    return row ? toWaitlistEntry(row) : undefined;
  },

  async addWaitlist(entry) {
    try {
      return await db.$transaction(async (tx) => {
        const cityId = await resolveCityId(tx, entry.city);
        const position = POSITION_OFFSET + (await tx.waitlistEntry.count()) + 1;

        const row = await tx.waitlistEntry.create({
          data: {
            name: entry.name,
            email: entry.email.toLowerCase(),
            phone: entry.phone || null,
            cityText: entry.city,
            cityId,
            role: ROLE_TO_DB[entry.role],
            notes: entry.notes || null,
            position,
            sports: {
              create: entry.sports.map((slug) => ({
                sport: {
                  connectOrCreate: { where: { id: slug }, create: sportSeed(slug) },
                },
              })),
            },
          },
          include: WITH_SPORTS,
        });

        return toWaitlistEntry(row);
      });
    } catch (error) {
      // The route checks for an existing email first, but two submissions of
      // the same address milliseconds apart both pass that check. Hand back the
      // row that won rather than failing the one that lost — the visitor gets
      // their real queue position either way.
      if (isUniqueViolation(error)) {
        const existing = await prismaWaitlist.findWaitlistByEmail(entry.email);
        if (existing) return existing;
      }
      throw error;
    }
  },
};
