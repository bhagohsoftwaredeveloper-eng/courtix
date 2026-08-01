"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { SignupInput } from "@/app/(site)/signup/schema";
import { safeNext } from "@/lib/auth-routes";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export interface SignupState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear what was typed. */
  name?: string;
  email?: string;
}

const TAKEN = "An account with that email already exists.";

/** Prisma's unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const typedName = String(formData.get("name") ?? "");
  const typedEmail = String(formData.get("email") ?? "");
  const echo = { name: typedName, email: typedEmail };

  const parsed = SignupInput.safeParse({
    name: typedName,
    email: typedEmail,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, ...echo };
  }

  const { name, email, password } = parsed.data;
  const next = safeNext(String(formData.get("next") ?? "")) ?? "/account";

  // Unlike login, signup has to tell the visitor the address is taken — there
  // is no way to report the failure without it. loginAction keeps its single
  // generic message precisely because it does have that choice.
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: TAKEN, ...echo };

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        // role defaults to PLAYER. Every account is a player; hosting is added
        // later by creating an organization.
        data: { name, email, passwordHash },
        select: { id: true },
      });
      // The profile page's "member since" strip reads this row, so it exists
      // from the first request rather than being upserted later.
      await tx.playerProfile.create({ data: { userId: created.id } });
      return created;
    });
    userId = user.id;
  } catch (error) {
    // The findUnique above leaves a race window between the check and the
    // insert. The unique constraint closes it; this reports it the same way.
    if (isUniqueViolation(error)) return { error: TAKEN, ...echo };
    throw error;
  }

  // A fresh account stays signed in — there is no "keep me signed in" choice to
  // honour on a form the visitor is filling in for the first time.
  await createSession(userId, true);

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect(next);
}
