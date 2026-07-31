"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import {
  AccountInput,
  FacilityInput,
  OrganizationProfileInput,
} from "@/app/(site)/list-your-court/start/schema";
import { validateAvatar } from "@/lib/image-upload";
import { createSession, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createFacility, createOrganizationProfile, hostState } from "@/lib/server/host-store";
import { hashPassword } from "@/lib/server/password";

export interface StepState {
  errors?: Record<string, string>;
  /** Echoed back so a failed attempt does not clear what was typed. */
  values?: Record<string, string>;
}

const TAKEN = "An account with that email already exists.";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Field errors keyed the way the form names its inputs. */
function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Step 1. Creates the account and signs the visitor in, so the wizard
 *  continues in the same breath rather than bouncing out to /login. */
export async function accountAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const typed = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = AccountInput.safeParse({
    ...typed,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: typed };

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { errors: { email: TAKEN }, values: typed };

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        // role defaults to PLAYER. Hosting is granted by the membership in
        // step 2, never by the platform role.
        data: { name, email, passwordHash },
        select: { id: true },
      });
      await tx.playerProfile.create({ data: { userId: created.id } });
      return created;
    });
    userId = user.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { email: TAKEN }, values: typed };
    throw error;
  }

  await createSession(userId, true);
  // The page reads the session to pick a step, so it must not be served stale.
  revalidatePath("/list-your-court/start");
  return {};
}

/** Step 2. Creates the business and the membership that grants owner access. */
export async function profileAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();

  // Already a host: this form is not a way to collect organizations.
  const state = await hostState(user.id);
  if (state.hasOrganization) {
    revalidatePath("/list-your-court/start");
    return {};
  }

  const raw = Object.fromEntries(
    [
      "name", "legalName", "entityType", "registrationNo", "permitNo", "permitCity", "tin",
      "addressLine", "barangay", "addressCity", "province", "postalCode",
      "contactEmail", "contactPhone", "repName", "repPosition", "repMobile",
      "payoutMethod", "payoutBankName", "payoutAccountName", "payoutLast4",
    ].map((key) => [key, String(formData.get(key) ?? "")]),
  );

  const parsed = OrganizationProfileInput.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  await createOrganizationProfile(user.id, parsed.data);

  // The page re-reads hostState to pick the step, so it must not be stale.
  revalidatePath("/list-your-court/start");
  return {};
}

/** Step 3. Creates the venue, its courts, and an optional photograph. */
export async function venueAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();
  const state = await hostState(user.id);
  // No business yet: the venue has nothing to hang from.
  if (!state.orgId) return { errors: { form: "Finish your business details first." } };

  const raw = Object.fromEntries(
    ["name", "description", "cityId", "addressText", "primarySportId", "pesos", "opens", "closes", "courtCount"].map(
      (key) => [key, String(formData.get(key) ?? "")],
    ),
  );
  // A checkbox posts nothing when unticked, which must read as false.
  const indoor = String(formData.get("indoor") ?? "");

  const parsed = FacilityInput.safeParse({ ...raw, indoor });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  // The photo is optional. An empty file input posts a zero-byte File.
  let photo: { bytes: Buffer; mimeType: string } | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateAvatar(bytes);
    if (!check.ok) return { errors: { photo: check.error }, values: raw };
    photo = { bytes: Buffer.from(bytes), mimeType: check.mimeType };
  }

  await createFacility(state.orgId, parsed.data, photo);

  revalidatePath("/list-your-court/start");
  revalidatePath("/owner/courts");
  return {};
}
