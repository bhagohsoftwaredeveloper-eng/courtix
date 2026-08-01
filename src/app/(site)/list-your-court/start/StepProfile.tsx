"use client";

import { useActionState } from "react";

import { profileAction, type StepState } from "@/app/(site)/list-your-court/start/actions";
import { Field } from "@/app/(site)/list-your-court/start/Field";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function StepProfile() {
  const [state, action, pending] = useActionState<StepState, FormData>(profileAction, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Your business
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        A platform admin checks these against public registries before your venue goes live.
        We never ask for scans or ID photos.
      </p>

      <Group title="Business">
        <Field label="Business name" error={errors.name}>
          <input type="text" name="name" required defaultValue={v.name} className="field" placeholder="Kitchen Line Club" />
        </Field>
        <Field label="Registered name (optional)" error={errors.legalName}>
          <input type="text" name="legalName" defaultValue={v.legalName} className="field" placeholder="Kitchen Line Sports Ventures" />
        </Field>
        <Field label="How it is registered" error={errors.entityType}>
          <select name="entityType" required defaultValue={v.entityType ?? ""} className="field">
            <option value="" disabled>Choose one</option>
            <option value="SOLE_PROP">Sole proprietorship</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="CORPORATION">Corporation</option>
          </select>
        </Field>
        <Field label="DTI or SEC number" error={errors.registrationNo}>
          <input type="text" name="registrationNo" required defaultValue={v.registrationNo} className="field" placeholder="DTI-1234567" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business permit number" error={errors.permitNo}>
            <input type="text" name="permitNo" required defaultValue={v.permitNo} className="field" placeholder="BP-2026-00891" />
          </Field>
          <Field label="Issued by (city)" error={errors.permitCity}>
            <input type="text" name="permitCity" required defaultValue={v.permitCity} className="field" placeholder="Tagum City" />
          </Field>
        </div>
        <Field label="TIN" error={errors.tin}>
          <input type="text" name="tin" required inputMode="numeric" defaultValue={v.tin} className="field" placeholder="123456789" />
        </Field>
      </Group>

      <Group title="Business address">
        <Field label="Street address" error={errors.addressLine}>
          <input type="text" name="addressLine" required defaultValue={v.addressLine} className="field" placeholder="12 Rizal Street" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Barangay" error={errors.barangay}>
            <input type="text" name="barangay" required defaultValue={v.barangay} className="field" placeholder="Magugpo Poblacion" />
          </Field>
          <Field label="City or municipality" error={errors.addressCity}>
            <input type="text" name="addressCity" required defaultValue={v.addressCity} className="field" placeholder="Tagum City" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Province" error={errors.province}>
            <input type="text" name="province" required defaultValue={v.province} className="field" placeholder="Davao del Norte" />
          </Field>
          <Field label="Postal code" error={errors.postalCode}>
            <input type="text" name="postalCode" required inputMode="numeric" defaultValue={v.postalCode} className="field" placeholder="8100" />
          </Field>
        </div>
      </Group>

      <Group title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" error={errors.contactEmail}>
            <input type="email" name="contactEmail" required defaultValue={v.contactEmail} className="field" placeholder="host@example.ph" />
          </Field>
          <Field label="Business mobile" error={errors.contactPhone}>
            <input type="tel" name="contactPhone" required defaultValue={v.contactPhone} className="field" placeholder="09171234567" />
          </Field>
        </div>
        <Field label="Authorised representative" error={errors.repName}>
          <input type="text" name="repName" required defaultValue={v.repName} className="field" placeholder="Maria Santos" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Their position" error={errors.repPosition}>
            <input type="text" name="repPosition" required defaultValue={v.repPosition} className="field" placeholder="Owner" />
          </Field>
          <Field label="Their mobile" error={errors.repMobile}>
            <input type="tel" name="repMobile" required defaultValue={v.repMobile} className="field" placeholder="09171234567" />
          </Field>
        </div>
      </Group>

      <Group title="Payouts">
        <p className="mb-3 text-[12px] leading-relaxed text-muted">
          The last four digits only — Courtix does not store full account numbers.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where payouts go" error={errors.payoutMethod}>
            <select name="payoutMethod" required defaultValue={v.payoutMethod ?? ""} className="field">
              <option value="" disabled>Choose one</option>
              <option value="BANK">Bank account</option>
              <option value="GCASH">GCash</option>
              <option value="MAYA">Maya</option>
            </select>
          </Field>
          <Field label="Bank or e-wallet" error={errors.payoutBankName}>
            <input type="text" name="payoutBankName" required defaultValue={v.payoutBankName} className="field" placeholder="BDO" />
          </Field>
        </div>
        <Field label="Account holder name" error={errors.payoutAccountName}>
          <input type="text" name="payoutAccountName" required defaultValue={v.payoutAccountName} className="field" placeholder="Kitchen Line Sports Ventures" />
        </Field>
        <Field label="Last 4 digits" error={errors.payoutLast4}>
          <input type="text" name="payoutLast4" required inputMode="numeric" maxLength={4} defaultValue={v.payoutLast4} className="field" placeholder="4821" />
        </Field>
      </Group>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
