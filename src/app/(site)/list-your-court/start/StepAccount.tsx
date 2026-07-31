"use client";

import { useActionState } from "react";
import Link from "next/link";

import { accountAction, type StepState } from "@/app/(site)/list-your-court/start/actions";
import { Field } from "@/app/(site)/list-your-court/start/Field";

export function StepAccount() {
  const [state, action, pending] = useActionState<StepState, FormData>(accountAction, {});
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Create your host account
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        You keep your player account — the same login gets you both.
      </p>

      <Field label="Your name" error={errors.name}>
        <input
          type="text"
          name="name"
          required
          defaultValue={values.name}
          className="field"
          placeholder="Juan dela Cruz"
          autoComplete="name"
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <input
          type="email"
          name="email"
          required
          defaultValue={values.email}
          className="field"
          placeholder="you@example.ph"
          autoComplete="email"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="field"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm" error={errors.confirm}>
          <input
            type="password"
            name="confirm"
            required
            className="field"
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-2 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Continue"}
      </button>

      <p className="mt-5 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link
          href="/login?next=/list-your-court/start"
          className="font-bold text-ball-yellow"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
