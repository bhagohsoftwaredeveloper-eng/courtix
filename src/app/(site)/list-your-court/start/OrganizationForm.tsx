"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type OrganizationState,
} from "@/app/(site)/list-your-court/start/actions";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11.5px] font-semibold text-[#ff9370]">
          {error}
        </span>
      )}
    </label>
  );
}

export function OrganizationForm() {
  const [state, action, pending] = useActionState<OrganizationState, FormData>(
    createOrganizationAction,
    {},
  );
  const errors = state.errors ?? {};

  return (
    <form action={action} className="panel">
      <Field label="Business name" error={errors.name}>
        <input
          type="text"
          name="name"
          required
          className="field"
          placeholder="Kitchen Line Club"
          autoComplete="organization"
        />
      </Field>
      <Field label="Contact email" error={errors.contactEmail}>
        <input
          type="email"
          name="contactEmail"
          required
          className="field"
          placeholder="host@example.ph"
          autoComplete="email"
        />
      </Field>
      <Field label="Contact mobile (optional)" error={errors.contactPhone}>
        <input
          type="tel"
          name="contactPhone"
          className="field"
          placeholder="09171234567"
          autoComplete="tel"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-2 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Setting up…" : "Create host account"}
      </button>
    </form>
  );
}
