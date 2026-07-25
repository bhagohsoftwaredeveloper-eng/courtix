import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/server/password";

describe("hashPassword", () => {
  it("produces a bcrypt hash, never the plaintext", async () => {
    const hash = await hashPassword("demo1234");
    expect(hash).not.toBe("demo1234");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("salts, so the same password hashes differently each time", async () => {
    expect(await hashPassword("demo1234")).not.toBe(await hashPassword("demo1234"));
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    expect(await verifyPassword("demo1234", await hashPassword("demo1234"))).toBe(true);
  });

  it("rejects the wrong password", async () => {
    expect(await verifyPassword("wrong", await hashPassword("demo1234"))).toBe(false);
  });

  // A user with no password set, or a corrupted row, must fail the login —
  // a throw here would 500 the login page instead.
  it("returns false for a null hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", null)).toBe(false);
  });

  it("returns false for an undefined hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", undefined)).toBe(false);
  });

  it("returns false for a malformed hash rather than throwing", async () => {
    expect(await verifyPassword("demo1234", "not-a-bcrypt-hash")).toBe(false);
  });
});
