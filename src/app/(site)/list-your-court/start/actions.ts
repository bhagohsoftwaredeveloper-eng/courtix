"use server";

import { redirect } from "next/navigation";

import { OrganizationInput } from "@/app/(site)/list-your-court/start/schema";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { slugify } from "@/lib/slug";

export interface OrganizationState {
  errors?: Record<string, string>;
}

/**
 * A slug nobody else holds. `Organization.slug` is unique, and two hosts can
 * legitimately share a business name, so collisions are expected rather than
 * exceptional.
 */
async function availableSlug(name: string): Promise<string> {
  // A name of pure punctuation slugifies to "" — fall back rather than write it.
  const base = slugify(name) || "host";

  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    const taken = await db.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

export async function createOrganizationAction(
  _prev: OrganizationState,
  formData: FormData,
): Promise<OrganizationState> {
  const user = await requireUser();

  const parsed = OrganizationInput.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { name, contactEmail, contactPhone } = parsed.data;

  // Already a host: the form is not a way to collect organizations.
  const existing = await db.organizationMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) redirect("/owner");

  await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug: await availableSlug(name),
        name,
        contactEmail,
        contactPhone: contactPhone === "" ? null : contactPhone,
      },
      select: { id: true },
    });

    // This row is what grants owner access — getSession() counts it, and
    // requireOwner() reads it. The user's platform role stays PLAYER.
    await tx.organizationMember.create({
      data: { orgId: org.id, userId: user.id, role: "OWNER" },
    });
  });

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect("/owner");
}
