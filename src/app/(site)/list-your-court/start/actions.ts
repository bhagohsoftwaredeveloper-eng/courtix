"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { AccountInput } from "@/app/(site)/list-your-court/start/schema";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
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
