"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveProfileAction, type ProfileState } from "@/app/account/profile/actions";
import type { ProfileFormValues } from "@/lib/server/player";

const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export function ProfileForm({
  values,
  cities,
  sports,
}: {
  values: ProfileFormValues;
  cities: { id: string; name: string; province: string }[];
  sports: { slug: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});
  const err = (field: string) => state.errors?.[field];

  return (
    <form action={action} className="panel">
      <h2 className="mb-5 font-sans text-sm font-extrabold normal-case tracking-normal">
        Profile details
      </h2>

      {state.saved && (
        <p
          role="status"
          className="mb-4 rounded-[10px] border border-court-green bg-court-green/20 px-3.5 py-3 text-[12.5px] font-semibold text-ball-yellow"
        >
          Profile saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" hint="Your email is how you sign in — it can't be changed here.">
          <input value={values.email} readOnly disabled className="field opacity-60" />
        </Field>

        <Field label="Full name" required error={err("name")}>
          <input
            name="name"
            defaultValue={values.name}
            required
            className="field"
            autoComplete="name"
          />
        </Field>

        <Field label="Mobile number" error={err("phone")}>
          <input
            name="phone"
            defaultValue={values.phone}
            className="field"
            placeholder="09171234567"
            autoComplete="tel"
          />
        </Field>

        <Field label="Gender" error={err("gender")}>
          <select name="gender" defaultValue={values.gender} className="field">
            <option value="">Select gender</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Home city" error={err("homeCityId")}>
          <select name="homeCityId" defaultValue={values.homeCityId} className="field">
            <option value="">No home city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.province}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Skill level">
          <select name="skill" defaultValue={values.skill} className="field">
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </Field>

        <Field
          label="DUPR rating"
          hint="1.00–8.00. Helps with matching. Leave blank if unrated."
          error={err("rating")}
        >
          <input
            name="rating"
            defaultValue={values.rating}
            className="field"
            placeholder="e.g. 3.50"
            inputMode="decimal"
          />
        </Field>

        <Field label="DUPR ID" hint="Your DUPR account ID (optional)." error={err("duprId")}>
          <input
            name="duprId"
            defaultValue={values.duprId}
            className="field"
            placeholder="e.g. 12345678"
            inputMode="numeric"
          />
        </Field>
      </div>

      <fieldset className="mt-5">
        <legend className="field-label">Favourite sports</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {sports.map((s) => (
            <label key={s.slug} className="flex cursor-pointer items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                name="sportIds"
                value={s.slug}
                defaultChecked={values.sportIds.includes(s.slug)}
                className="h-3.5 w-3.5 accent-[var(--color-ball-yellow)]"
              />
              {s.name}
            </label>
          ))}
        </div>
        {err("sportIds") && (
          <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("sportIds")}</span>
        )}
      </fieldset>

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
        <Link href="/account" className="btn btn-ghost justify-center py-3 text-sm">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-solid justify-center py-3 text-sm disabled:opacity-60 sm:min-w-[170px]"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {required && <span className="text-ball-yellow"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{error}</span>}
    </label>
  );
}
