import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Kitchen Line Club")).toBe("kitchen-line-club");
  });

  it("drops punctuation rather than encoding it", () => {
    expect(slugify("Hoop House PH!")).toBe("hoop-house-ph");
    expect(slugify("Smash & Rally Co.")).toBe("smash-rally-co");
  });

  it("collapses runs of separators", () => {
    expect(slugify("Tee   Line -- Golf")).toBe("tee-line-golf");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Fairway Bay--  ")).toBe("fairway-bay");
  });

  it("strips accents to their base letters", () => {
    expect(slugify("Café Padel")).toBe("cafe-padel");
  });

  // Facility.slug is the public URL segment, so it must stay a sane length.
  it("caps the length at 60 characters", () => {
    expect(slugify("a".repeat(100))).toHaveLength(60);
  });

  it("never leaves a trailing hyphen after capping", () => {
    // 59 characters, then a space, then more — the cut lands on the separator.
    expect(slugify(`${"a".repeat(59)} bcdef`).endsWith("-")).toBe(false);
  });

  // Callers must handle this: a name of pure punctuation has no slug.
  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});
