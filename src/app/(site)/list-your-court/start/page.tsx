import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StepAccount } from "@/app/(site)/list-your-court/start/StepAccount";
import { StepProfile } from "@/app/(site)/list-your-court/start/StepProfile";
import { Stepper } from "@/app/(site)/list-your-court/start/Stepper";
import { wizardStep } from "@/lib/host-wizard";
import { getSession } from "@/lib/server/auth";
import { hostState } from "@/lib/server/host-store";

export const metadata: Metadata = {
  title: "Become a host",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function BecomeHostPage() {
  // No middleware gate: step 1 is the signup, so a signed-out visitor belongs
  // here. Every later step is gated by what the account actually has.
  const user = await getSession();
  const state = user
    ? await hostState(user.id)
    : { hasOrganization: false, hasFacility: false, orgId: null };

  const step = wizardStep({
    signedIn: Boolean(user),
    hasOrganization: state.hasOrganization,
    hasFacility: state.hasFacility,
  });

  // Nothing left to do — the courts page is where a finished host works.
  if (step === "done") redirect("/owner/courts");

  return (
    <div className="shell flex max-w-[560px] flex-col py-16">
      <p className="eyebrow mb-4">List your court</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Become a host</h1>
      <p className="mb-8 text-[14px] text-muted">
        Three steps: your account, your business, then your venue.
      </p>

      <Stepper current={step} />

      {step === 1 && <StepAccount />}
      {step === 2 && <StepProfile />}
      {/* Step 3 arrives in Task 7. */}
      {step === 3 && (
        <p className="panel text-[13px] text-muted">This step is being built.</p>
      )}
    </div>
  );
}
