import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Courtix account to manage bookings, courts, and payouts.",
};

/**
 * Auth is Phase 5 (see BOOKING_INTEGRATION_PLAN.md). This page renders the real
 * form so the flow can be demoed and styled, but submitting does nothing — the
 * dashboard links below are how you reach the owner and admin views today.
 */
export default function LoginPage() {
  return (
    <div className="shell flex max-w-[440px] flex-col py-20">
      <p className="eyebrow mb-4">Welcome back</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Log in</h1>
      <p className="mb-8 text-[14px] text-muted">
        Manage your bookings, courts, and payouts in one place.
      </p>

      <form className="panel" action="/login">
        <label className="mb-4 block">
          <span className="field-label">Email</span>
          <input type="email" name="email" className="field" placeholder="you@example.ph" autoComplete="email" />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input
            type="password"
            name="password"
            className="field"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-ball-yellow)]" />
            Keep me signed in
          </label>
          <Link href="/login" className="text-[12.5px] font-bold text-ball-yellow">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-solid mt-6 w-full py-3.5 text-sm">
          Log in
        </button>

        <p className="mt-5 rounded-[10px] border border-line-white/12 bg-court-deep/50 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          Accounts aren’t wired up in this prototype. Jump straight in:{" "}
          <Link href="/player-home" className="font-bold text-ball-yellow">
            player home
          </Link>{" "}
          ·{" "}
          <Link href="/owner" className="font-bold text-ball-yellow">
            owner
          </Link>{" "}
          ·{" "}
          <Link href="/admin" className="font-bold text-ball-yellow">
            super admin
          </Link>
        </p>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/waitlist" className="font-bold text-ball-yellow">
          Join the waitlist
        </Link>
      </p>
    </div>
  );
}
