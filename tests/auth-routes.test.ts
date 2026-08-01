import { describe, expect, it } from "vitest";

import { SESSION_COOKIE, homeFor, isExpired, portalsFor, safeNext } from "@/lib/auth-routes";

describe("SESSION_COOKIE", () => {
  it("is the name middleware and the server both look for", () => {
    expect(SESSION_COOKIE).toBe("courtix_session");
  });
});

describe("homeFor", () => {
  // Owners land here too. Owner-ness is not a platform role and never changes
  // the landing route — the sidebar's portal switcher is how they reach /owner.
  // That there is no owner destination is guaranteed by PlatformRole itself:
  // homeFor("OWNER") no longer compiles, so no runtime case can assert it.
  it("lands players on the player dashboard", () => {
    expect(homeFor("PLAYER")).toBe("/account");
  });

  it("lands platform staff on the admin dashboard", () => {
    expect(homeFor("ADMIN")).toBe("/admin");
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
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

describe("portalsFor", () => {
  // The rule is one line: offer every portal the user holds, except the one
  // they are looking at. Each case below is that rule applied.
  const hrefs = (opts: Parameters<typeof portalsFor>[0]) =>
    portalsFor(opts).map((p) => p.href);

  it("offers nothing to a player who only plays", () => {
    expect(hrefs({ role: "PLAYER", isOwner: false, current: "player" })).toEqual([]);
  });

  it("offers the owner portal to a player who hosts", () => {
    expect(hrefs({ role: "PLAYER", isOwner: true, current: "player" })).toEqual(["/owner"]);
  });

  it("offers the player portal from inside the owner portal", () => {
    expect(hrefs({ role: "PLAYER", isOwner: true, current: "owner" })).toEqual(["/account"]);
  });

  it("offers the player portal to admin staff", () => {
    expect(hrefs({ role: "ADMIN", isOwner: false, current: "admin" })).toEqual(["/account"]);
    expect(hrefs({ role: "SUPER_ADMIN", isOwner: false, current: "admin" })).toEqual(["/account"]);
  });

  // Platform staff are ordinary people who may also play and may also host.
  it("offers both other portals to an admin who hosts", () => {
    expect(hrefs({ role: "ADMIN", isOwner: true, current: "admin" })).toEqual([
      "/account",
      "/owner",
    ]);
  });

  it("offers the admin portal to staff standing in another portal", () => {
    expect(hrefs({ role: "ADMIN", isOwner: false, current: "player" })).toEqual(["/admin"]);
    expect(hrefs({ role: "ADMIN", isOwner: true, current: "owner" })).toEqual([
      "/account",
      "/admin",
    ]);
  });

  it("never offers the portal you are already in", () => {
    for (const current of ["player", "owner", "admin"] as const) {
      const offered = hrefs({ role: "SUPER_ADMIN", isOwner: true, current });
      expect(offered).not.toContain(
        { player: "/account", owner: "/owner", admin: "/admin" }[current],
      );
    }
  });

  it("labels and icons every portal it offers", () => {
    for (const portal of portalsFor({ role: "ADMIN", isOwner: true, current: "player" })) {
      expect(portal.label.length).toBeGreaterThan(0);
      expect(portal.icon.length).toBeGreaterThan(0);
    }
  });
});
