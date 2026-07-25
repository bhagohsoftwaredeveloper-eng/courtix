import { describe, expect, it } from "vitest";

import { initialsOf } from "@/lib/format";

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Rex I.T Support")).toBe("RI");
    expect(initialsOf("Jomar Reyes")).toBe("JR");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(initialsOf("Courtix")).toBe("CO");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(initialsOf("  Mica   Alvarez  ")).toBe("MA");
  });

  it("falls back to a placeholder for an empty name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});
