"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/(site)/login/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="panel">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p
          // Announced to screen readers the moment the action returns.
          role="alert"
          className="mb-4 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] font-semibold text-[#ff9370]"
        >
          {state.error}
        </p>
      )}

      <label className="mb-4 block">
        <span className="field-label">Email</span>
        <input
          type="email"
          name="email"
          required
          defaultValue={state.email}
          className="field"
          placeholder="you@example.ph"
          autoComplete="email"
        />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <input
          type="password"
          name="password"
          required
          className="field"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            name="remember"
            className="h-3.5 w-3.5 accent-[var(--color-ball-yellow)]"
          />
          Keep me signed in
        </label>
        <Link href="/waitlist" className="text-[12.5px] font-bold text-ball-yellow">
          Need an account?
        </Link>
      </div>

      <button type="submit" disabled={pending} className="btn btn-solid mt-6 w-full py-3.5 text-sm disabled:opacity-60">
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
