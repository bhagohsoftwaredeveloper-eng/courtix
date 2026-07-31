"use client";

import { useActionState } from "react";

import { venueAction, type StepState } from "@/app/(site)/list-your-court/start/actions";
import { Field } from "@/app/(site)/list-your-court/start/Field";

export function StepVenue({
  cities,
  sports,
}: {
  cities: { id: string; name: string; province: string }[];
  sports: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<StepState, FormData>(venueAction, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Your venue
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        This is what players see. It goes to a platform admin for review before it appears in
        the directory.
      </p>

      {errors.form && (
        <p role="alert" className="mb-4 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] font-semibold text-[#ff9370]">
          {errors.form}
        </p>
      )}

      <Field label="Venue name" error={errors.name}>
        <input type="text" name="name" required defaultValue={v.name} className="field" placeholder="Kitchen Line Club" />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea name="description" required rows={4} defaultValue={v.description} className="field" placeholder="Surface, lighting, parking, what to bring…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" error={errors.cityId}>
          <select name="cityId" required defaultValue={v.cityId ?? ""} className="field">
            <option value="" disabled>Choose a city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}, {c.province}</option>
            ))}
          </select>
        </Field>
        <Field label="Main sport" error={errors.primarySportId}>
          <select name="primarySportId" required defaultValue={v.primarySportId ?? ""} className="field">
            <option value="" disabled>Choose a sport</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Address" error={errors.addressText}>
        <input type="text" name="addressText" required defaultValue={v.addressText} className="field" placeholder="12 Rizal Street, Tagum City" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per hour (₱)" error={errors.pesos}>
          <input type="text" name="pesos" required inputMode="decimal" defaultValue={v.pesos} className="field" placeholder="350" />
        </Field>
        <Field label="Opens (24h)" error={errors.opens}>
          <input type="number" name="opens" required min={0} max={23} defaultValue={v.opens ?? "6"} className="field" />
        </Field>
        <Field label="Closes (24h)" error={errors.closes}>
          <input type="number" name="closes" required min={1} max={24} defaultValue={v.closes ?? "22"} className="field" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="How many courts" error={errors.courtCount}>
          <input type="number" name="courtCount" required min={1} max={40} defaultValue={v.courtCount ?? "1"} className="field" />
        </Field>
        <Field label="Photo (optional)" error={errors.photo}>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="field" />
        </Field>
      </div>

      <label className="mb-5 flex items-center gap-2.5 text-[13px]">
        <input type="checkbox" name="indoor" className="h-4 w-4" />
        This venue is indoors
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
