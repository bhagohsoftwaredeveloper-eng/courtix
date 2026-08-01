/**
 * Rules for the become-a-host wizard.
 *
 * Imports nothing from Next, Prisma or React, so every branch is unit-testable
 * in plain Node.
 */

export type WizardStep = 1 | 2 | 3 | "done";

/**
 * Which step this account still has to finish.
 *
 * The wizard resumes rather than restarting, because step 2 is long and losing
 * it to a refresh would be punishing. Order is fixed: an account, then the
 * business, then the venue — each one is what the next is attached to.
 */
export function wizardStep({
  signedIn,
  hasOrganization,
  hasFacility,
}: {
  signedIn: boolean;
  hasOrganization: boolean;
  hasFacility: boolean;
}): WizardStep {
  if (!signedIn) return 1;
  if (!hasOrganization) return 2;
  if (!hasFacility) return 3;
  return "done";
}

/**
 * A stored identifier shown back with only its tail readable — "••••••789".
 *
 * Verification and payout values are redisplayed masked so a shoulder-surfed
 * screen gives nothing away; the full value is only ever in the browser at the
 * moment it is typed. Returns null for an absent value, because a row of dots
 * would imply something is stored when nothing is.
 */
export function maskTail(value: string | null | undefined, visible = 4): string | null {
  if (!value) return null;
  if (value.length <= visible) return "•".repeat(value.length);
  return "•".repeat(value.length - visible) + value.slice(-visible);
}
