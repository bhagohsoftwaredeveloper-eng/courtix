import "server-only";

import { Prisma, type FacilityStatus } from "@prisma/client";

import type {
  FacilityValues,
  OrganizationProfileValues,
} from "@/app/(site)/list-your-court/start/schema";
import { db } from "@/lib/server/db";
import { slugify } from "@/lib/slug";

/** What the wizard needs to know to pick a step. Two counts, one query each,
 *  and no rows dragged back. */
export async function hostState(userId: string): Promise<{
  hasOrganization: boolean;
  hasFacility: boolean;
  orgId: string | null;
}> {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    orderBy: { orgId: "asc" },
    select: { orgId: true },
  });
  if (!membership) return { hasOrganization: false, hasFacility: false, orgId: null };

  const facilities = await db.facility.count({ where: { orgId: membership.orgId } });
  return { hasOrganization: true, hasFacility: facilities > 0, orgId: membership.orgId };
}

/** A slug nobody else holds. Two hosts can legitimately share a name, so
 *  collisions are expected rather than exceptional. */
async function availableSlug(
  name: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "host";
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
}

/** Prisma's unique-constraint violation. Mirrors `isRecordNotFound` in auth.ts. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// availableSlug()'s check and the create it feeds run as two separate
// queries — the create happens inside a transaction opened after the check
// returns, so nothing holds the slug between them. Two hosts registering the
// same name within that window both see it as free, and the second one's
// create trips the unique constraint instead of falling through to the next
// suffix. Retrying re-runs the check, which by then sees the winner's row and
// hands the loser the next suffix instead. Bounded so a non-collision failure
// (or a suffix range that is somehow exhausted) doesn't spin forever — three
// concurrent registrants of the same name is already an implausible amount of
// contention.
const MAX_SLUG_ATTEMPTS = 3;

async function withSlugRetry<T>(attempt: () => Promise<T>): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (i === MAX_SLUG_ATTEMPTS || !isUniqueViolation(error)) throw error;
    }
  }
}

/**
 * Step 2. Creates the business and the membership that grants owner access.
 *
 * Both in one transaction: an Organization with no member is unreachable by
 * anyone, and a membership pointing at nothing cannot exist.
 */
export async function createOrganizationProfile(
  userId: string,
  values: OrganizationProfileValues,
): Promise<string> {
  return withSlugRetry(async () => {
    const slug = await availableSlug(values.name, async (candidate) =>
      Boolean(
        await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    );

    return db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          slug,
          name: values.name,
          legalName: values.legalName || null,
          entityType: values.entityType,
          registrationNo: values.registrationNo,
          permitNo: values.permitNo,
          permitCity: values.permitCity,
          tin: values.tin,
          addressLine: values.addressLine,
          barangay: values.barangay,
          addressCity: values.addressCity,
          province: values.province,
          postalCode: values.postalCode,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          repName: values.repName,
          repPosition: values.repPosition,
          repMobile: values.repMobile,
          payoutMethod: values.payoutMethod,
          payoutBankName: values.payoutBankName,
          payoutAccountName: values.payoutAccountName,
          // The last four digits only. payoutRef's own comment forbids storing
          // a raw account number, and no provider exists to tokenise one.
          payoutRef: values.payoutLast4,
        },
        select: { id: true },
      });

      await tx.organizationMember.create({
        data: { orgId: org.id, userId, role: "OWNER" },
      });

      return org.id;
    });
  });
}

/**
 * Step 3. The venue, its courts, and an optional photograph.
 *
 * Created DRAFT and immediately submitted, so the host leaves the wizard with
 * something an admin can act on rather than a draft they must remember to send.
 */
export async function createFacility(
  orgId: string,
  values: FacilityValues,
  photo: { bytes: Buffer; mimeType: string } | null,
): Promise<string> {
  return withSlugRetry(async () => {
    const slug = await availableSlug(values.name, async (candidate) =>
      Boolean(await db.facility.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );

    await db.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          orgId,
          slug,
          name: values.name,
          description: values.description,
          cityId: values.cityId,
          addressText: values.addressText,
          primarySportId: values.primarySportId,
          basePriceCents: values.basePriceCents,
          opens: values.opens,
          closes: values.closes,
          indoor: values.indoor,
          status: "PENDING_REVIEW",
        },
        select: { id: true },
      });

      // One CourtUnit per court. The label is denormalised for display, which is
      // why it is written here rather than derived at render time.
      await tx.courtUnit.createMany({
        data: Array.from({ length: values.courtCount }, (_, i) => ({
          facilityId: facility.id,
          index: i,
          label: `Court ${i + 1}`,
          sportId: values.primarySportId,
        })),
      });

      // The facility's own sport, so the directory's sport filter finds it.
      await tx.facilitySport.create({
        data: { facilityId: facility.id, sportId: values.primarySportId },
      });

      if (photo) {
        await tx.facilityImage.create({
          data: {
            facilityId: facility.id,
            // url stays empty: the bytes are served by /api/facility-image/[id].
            url: "",
            alt: `${values.name} — venue photo`,
            position: 0,
            // Buffer.from() re-wraps the bytes so the generic ArrayBuffer type
            // param matches what Prisma's Bytes scalar expects; a bare `Buffer`
            // (ArrayBufferLike) is not assignable to it directly.
            data: Buffer.from(photo.bytes),
            mimeType: photo.mimeType,
          },
        });
      }
    });

    return slug;
  });
}

export interface OwnerFacility {
  id: string;
  slug: string;
  name: string;
  status: FacilityStatus;
  declineReason: string | null;
  cityName: string;
  sportId: string;
  basePriceCents: number;
  opens: number;
  closes: number;
  courtCount: number;
  imageId: string | null;
}

/** The host's own venues, newest first. */
export async function listOwnerFacilities(orgId: string): Promise<OwnerFacility[]> {
  const rows = await db.facility.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      declineReason: true,
      basePriceCents: true,
      opens: true,
      closes: true,
      primarySportId: true,
      city: { select: { name: true } },
      _count: { select: { courtUnits: true } },
      images: {
        where: { data: { not: null } },
        orderBy: { position: "asc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    declineReason: row.declineReason,
    cityName: row.city.name,
    sportId: row.primarySportId,
    basePriceCents: row.basePriceCents,
    opens: row.opens,
    closes: row.closes,
    courtCount: row._count.courtUnits,
    imageId: row.images[0]?.id ?? null,
  }));
}

/** The curated lists step 3 offers. Cities are LIVE only: a venue in a city
 *  Courtix has not launched cannot be booked, so it must not be listable. */
export async function referenceData(): Promise<{
  cities: { id: string; name: string; province: string }[];
  sports: { id: string; name: string }[];
}> {
  const [cities, sports] = await Promise.all([
    db.city.findMany({
      where: { status: "LIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, province: true },
    }),
    db.sport.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { cities, sports };
}
