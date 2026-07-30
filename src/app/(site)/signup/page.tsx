import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/app/(site)/signup/SignupForm";
import { homeFor, safeNext } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Courtix account to book courts and join open plays across Davao.",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNext(next);

  // Already signed in: nothing to create.
  const user = await getSession();
  if (user) redirect(destination ?? homeFor(user.role));

  return (
    <div className="shell flex max-w-[440px] flex-col py-20">
      <p className="eyebrow mb-4">Get on court</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Create your account</h1>
      <p className="mb-8 text-[14px] text-muted">
        Book courts, join open plays, and keep every reference in one place.
      </p>

      <SignupForm next={destination ?? undefined} />

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ball-yellow">
          Log in
        </Link>
      </p>
    </div>
  );
}
