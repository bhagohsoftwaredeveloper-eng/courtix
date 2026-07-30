import { describe, expect, it } from "vitest";

import { SESSION_COOKIE, homeFor, isExpired, safeNext } from "@/lib/auth-routes";

describe("SESSION_COOKIE", () => {
  it("is the name middleware and the server both look for", () => {
    expect(SESSION_COOKIE).toBe("courtix_session");
  });
});

describe("homeFor", () => {
  it("lands players on the player dashboard", () => {
    expect(homeFor("PLAYER")).toBe("/account");
  });

  it("lands platform staff on the admin dashboard", () => {
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
  });

  // Owners land on /account like every other player. Owner-ness is not a
  // platform role and never changes the landing route — the portal switcher
  // in the sidebar is how they reach /owner.
  it("has no owner destination", () => {
    expect(homeFor("PLAYER")).toBe("/account");
  });
});

describe("safeNext", () => {
  it("keeps a same-origin path", () => {
    expect(safeNext("/owner")).toBe("/owner");
    expect(safeNext("/owner/bookings?date=2026-07-25")).toBe("/owner/bookings?date=2026-07-25");
  });

  it("rejects anything that could leave the site", () => {
    // "//evil.com" is protocol-relative: the browser treats it as absolute.
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext("owner")).toBeNull();
    // Browsers strip control characters before parsing, so "/\t/evil.com"
    // resolves to "//evil.com", a protocol-relative URL.
    expect(safeNext("/\t/evil.com")).toBeNull();
    expect(safeNext("/\n/evil.com")).toBeNull();
    expect(safeNext("/\r/evil.com")).toBeNull();
    expect(safeNext("/\t\t//evil.com")).toBeNull();
  });

  it("treats absent input as no destination", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
  });
});

describe("isExpired", () => {
  const now = new Date("2026-07-25T12:00:00Z");

  it("is false while the session still has time", () => {
    expect(isExpired(new Date("2026-07-25T12:00:01Z"), now)).toBe(false);
  });

  it("is true once the expiry has passed", () => {
    expect(isExpired(new Date("2026-07-25T11:59:59Z"), now)).toBe(true);
  });

  it("is true exactly at the expiry instant", () => {
    expect(isExpired(new Date("2026-07-25T12:00:00Z"), now)).toBe(true);
  });
});
