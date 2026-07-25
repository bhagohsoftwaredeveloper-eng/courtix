"use client";

import { useActionState } from "react";

import { saveProfileAction, type ProfileState } from "@/app/account/profile/actions";
import type { ProfileFormValues } from "@/lib/server/player";

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
    <form action={action} className="panel max-w-[560px]">
      {state.saved && (
        <p role="status" className="mb-4 rounded-[10px] border border-court-green bg-court-green/20 px-3.5 py-3 text-[12.5px] font-semibold text-ball-yellow">
          Profile saved.
        </p>
      )}

      <label className="mb-4 block">
        <span className="field-label">Name</span>
        <input name="name" defaultValue={values.name} required className="field" autoComplete="name" />
        {err("name") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("name")}</span>}
      </label>

      <label className="mb-4 block">
        <span className="field-label">Email</span>
        <input value={values.email} readOnly disabled className="field opacity-60" />
        <span className="mt-1 block text-[11.5px] text-muted">
          Your email is how you sign in — it can&apos;t be changed here.
        </span>
      </label>

      <label className="mb-4 block">
        <span className="field-label">Mobile</span>
        <input name="phone" defaultValue={values.phone} className="field" placeholder="09171234567" autoComplete="tel" />
        {err("phone") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("phone")}</span>}
      </label>

      <label className="mb-4 block">
        <span className="field-label">Home city</span>
        <select name="homeCityId" defaultValue={values.homeCityId} className="field">
          <option value="">No home city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.province}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block">
        <span className="field-label">Skill level</span>
        <select name="skill" defaultValue={values.skill} className="field">
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </label>

      <label className="mb-4 block">
        <span className="field-label">DUPR rating</span>
        <input name="rating" defaultValue={values.rating} className="field" placeholder="3.50" inputMode="decimal" />
        <span className="mt-1 block text-[11.5px] text-muted">Self-reported, 1.00–8.00. Leave blank if unrated.</span>
        {err("rating") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("rating")}</span>}
      </label>

      <fieldset className="mb-5">
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
      </fieldset>

      <button type="submit" disabled={pending} className="btn btn-solid w-full py-3 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
