import { describe, expect, it } from "vitest";

import { maskTail, wizardStep } from "@/lib/host-wizard";

describe("wizardStep", () => {
  const state = (over: Partial<Parameters<typeof wizardStep>[0]> = {}) => ({
    signedIn: true,
    hasOrganization: true,
    hasFacility: true,
    ...over,
  });

  it("starts a stranger at the account step", () => {
    expect(wizardStep(state({ signedIn: false, hasOrganization: false, hasFacility: false }))).toBe(1);
  });

  it("sends a signed-in visitor with no business to the profile step", () => {
    expect(wizardStep(state({ hasOrganization: false, hasFacility: false }))).toBe(2);
  });

  it("sends a host with no venue to the venue step", () => {
    expect(wizardStep(state({ hasFacility: false }))).toBe(3);
  });

  it("reports done once a venue exists", () => {
    expect(wizardStep(state())).toBe("done");
  });

  // The wizard resumes rather than restarting, so a half-finished account must
  // land on its own unfinished step and never on one it already completed.
  it("skips the account step for anyone already signed in", () => {
    for (const hasOrganization of [true, false]) {
      for (const hasFacility of [true, false]) {
        expect(wizardStep(state({ hasOrganization, hasFacility }))).not.toBe(1);
      }
    }
  });

  // Not reachable through the UI, but the function is total: a facility cannot
  // exist without an organization, and if the data ever says otherwise the
  // business details are still what is missing.
  it("demands the business before the venue even if the data disagrees", () => {
    expect(wizardStep(state({ hasOrganization: false, hasFacility: true }))).toBe(2);
  });

  it("puts a signed-out visitor on step 1 whatever else is true", () => {
    expect(wizardStep(state({ signedIn: false }))).toBe(1);
  });
});

describe("maskTail", () => {
  it("hides everything but the last four by default", () => {
    expect(maskTail("123456789012")).toBe("••••••••9012");
  });

  it("honours a different tail length", () => {
    expect(maskTail("123456789", 3)).toBe("••••••789");
  });

  // An absent value must read as absent. A row of dots would imply something is
  // stored when nothing is.
  it("returns null when there is nothing to mask", () => {
    expect(maskTail(null)).toBeNull();
    expect(maskTail(undefined)).toBeNull();
    expect(maskTail("")).toBeNull();
  });

  it("never reveals more than it hides on a short value", () => {
    // Four characters with four visible would print the whole thing, so a
    // value no longer than the tail is masked entirely.
    expect(maskTail("1234")).toBe("••••");
    expect(maskTail("12")).toBe("••");
  });
});
