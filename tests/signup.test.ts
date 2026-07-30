import { describe, expect, it } from "vitest";

import { SignupInput } from "@/app/(site)/signup/schema";

function parse(over: Partial<Record<string, unknown>> = {}) {
  return SignupInput.safeParse({
    name: "Juan dela Cruz",
    email: "juan@example.ph",
    password: "correct-horse",
    ...over,
  });
}

describe("SignupInput", () => {
  it("accepts a complete signup", () => {
    const result = parse();
    expect(result.success).toBe(true);
  });

  it("trims the name and requires two characters", () => {
    const trimmed = parse({ name: "  Jo  " });
    expect(trimmed.success).toBe(true);
    // Asserted unconditionally: guarding this behind `if (trimmed.success)`
    // would let the check vanish silently the day trimming regresses.
    expect(trimmed.data!.name).toBe("Jo");

    // One character survives the trim but fails the minimum; whitespace alone
    // leaves nothing at all.
    expect(parse({ name: " J " }).success).toBe(false);
    expect(parse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    expect(parse({ name: "a".repeat(81) }).success).toBe(false);
  });

  // The email is the login identifier, so it is stored exactly as the login
  // action will look it up: trimmed and lowercased.
  it("normalises the email", () => {
    const result = parse({ email: "  JUAN@Example.PH  " });
    expect(result.success).toBe(true);
    expect(result.data!.email).toBe("juan@example.ph");
  });

  it("rejects a malformed email", () => {
    expect(parse({ email: "juan" }).success).toBe(false);
    expect(parse({ email: "" }).success).toBe(false);
  });

  it("requires eight password characters", () => {
    expect(parse({ password: "12345678" }).success).toBe(true);
    expect(parse({ password: "1234567" }).success).toBe(false);
  });

  // Passwords are hashed, never trimmed — leading and trailing spaces are
  // legitimate characters the user chose.
  it("does not trim the password", () => {
    const result = parse({ password: "  spaces  " });
    expect(result.success).toBe(true);
    expect(result.data!.password).toBe("  spaces  ");
  });
});
