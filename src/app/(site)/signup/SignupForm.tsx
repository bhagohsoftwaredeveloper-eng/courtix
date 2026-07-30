"use client";

import { useActionState } from "react";

import { signupAction, type SignupState } from "@/app/(site)/signup/actions";

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});

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
        <span className="field-label">Full name</span>
        <input
          type="text"
          name="name"
          required
          defaultValue={state.name}
          className="field"
          placeholder="Juan dela Cruz"
          autoComplete="name"
        />
      </label>
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
          minLength={8}
          className="field"
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-6 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
