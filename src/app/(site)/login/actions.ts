"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { homeFor, safeNext } from "@/lib/auth-routes";
import { createSession, destroySession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";

const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
  next: z.string().optional(),
});

export interface LoginState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear what was typed. */
  email?: string;
}

/**
 * One message for every credential failure. Distinguishing "no such account"
 * from "wrong password" tells an attacker which emails are registered.
 */
const GENERIC_FAILURE = "Email or password is incorrect";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const typedEmail = String(formData.get("email") ?? "");

  const parsed = LoginInput.safeParse({
    email: typedEmail,
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email: typedEmail };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true },
  });

  // Runs even when the user is missing — verifyPassword falls back to a dummy
  // hash so a failed login costs the same time either way.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !ok) return { error: GENERIC_FAILURE, email: typedEmail };

  await createSession(user.id, parsed.data.remember);

  // redirect() throws to unwind — it must sit outside any try/catch.
  redirect(safeNext(parsed.data.next) ?? homeFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
