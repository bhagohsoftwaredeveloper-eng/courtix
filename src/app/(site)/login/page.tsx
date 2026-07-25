import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(site)/login/LoginForm";
import { homeFor, safeNext } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Courtix account to manage bookings, courts, and payouts.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  // Already signed in: don't make them log in twice.
  const user = await getSession();
  if (user) redirect(destination ?? homeFor(user.role));

  return (
    <div className="shell flex max-w-[440px] flex-col py-20">
      <p className="eyebrow mb-4">Welcome back</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Log in</h1>
      <p className="mb-8 text-[14px] text-muted">
        Manage your bookings, courts, and payouts in one place.
      </p>

      <LoginForm next={destination ?? undefined} />

      <p className="mt-6 text-center text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/waitlist" className="font-bold text-ball-yellow">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
