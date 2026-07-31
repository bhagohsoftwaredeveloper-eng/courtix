import { describe, expect, it } from "vitest";

import {
  AccountInput,
  FacilityInput,
  OrganizationProfileInput,
} from "@/app/(site)/list-your-court/start/schema";

describe("AccountInput", () => {
  const parse = (over: Record<string, unknown> = {}) =>
    AccountInput.safeParse({
      name: "Juan dela Cruz",
      email: "juan@example.ph",
      password: "correct-horse",
      confirm: "correct-horse",
      ...over,
    });

  it("accepts a matching pair", () => {
    expect(parse().success).toBe(true);
  });

  // The rules a host meets must be the rules a player meets, or the two signup
  // paths drift apart.
  it("keeps the player signup rules", () => {
    expect(parse({ password: "1234567", confirm: "1234567" }).success).toBe(false);
    expect(parse({ name: "J" }).success).toBe(false);
    expect(parse({ email: "juan" }).success).toBe(false);
  });

  it("rejects a mismatched confirmation", () => {
    const result = parse({ confirm: "something-else" });
    expect(result.success).toBe(false);
    // The error must land on the confirm field, not on the password the user
    // probably typed correctly.
    expect(result.error!.issues[0].path).toEqual(["confirm"]);
  });

  it("normalises the email", () => {
    expect(parse({ email: "  JUAN@Example.PH " }).data!.email).toBe("juan@example.ph");
  });
});

describe("OrganizationProfileInput", () => {
  const full = {
    name: "Kitchen Line Club",
    legalName: "Kitchen Line Sports Ventures",
    entityType: "SOLE_PROP",
    registrationNo: "DTI-1234567",
    permitNo: "BP-2026-00891",
    permitCity: "Tagum City",
    tin: "123456789",
    addressLine: "12 Rizal Street",
    barangay: "Magugpo Poblacion",
    addressCity: "Tagum City",
    province: "Davao del Norte",
    postalCode: "8100",
    contactEmail: "host@kitchenline.ph",
    contactPhone: "09171234567",
    repName: "Maria Santos",
    repPosition: "Owner",
    repMobile: "09171234567",
    payoutMethod: "BANK",
    payoutBankName: "BDO",
    payoutAccountName: "Kitchen Line Sports Ventures",
    payoutLast4: "4821",
  };
  const parse = (over: Record<string, unknown> = {}) =>
    OrganizationProfileInput.safeParse({ ...full, ...over });

  it("accepts a complete profile", () => {
    expect(parse().success).toBe(true);
  });

  it("treats the legal name as optional", () => {
    expect(parse({ legalName: "" }).success).toBe(true);
  });

  it("requires a known entity type", () => {
    expect(parse({ entityType: "CO-OP" }).success).toBe(false);
    for (const t of ["SOLE_PROP", "PARTNERSHIP", "CORPORATION"]) {
      expect(parse({ entityType: t }).success).toBe(true);
    }
  });

  it("accepts a TIN of nine to twelve digits and nothing else", () => {
    expect(parse({ tin: "123456789" }).success).toBe(true);
    expect(parse({ tin: "123456789012" }).success).toBe(true);
    expect(parse({ tin: "12345678" }).success).toBe(false);
    expect(parse({ tin: "1234567890123" }).success).toBe(false);
    expect(parse({ tin: "123-456-789" }).success).toBe(false);
  });

  it("uses the same mobile rule as the rest of the app", () => {
    expect(parse({ repMobile: "0917123456" }).success).toBe(false);
    expect(parse({ contactPhone: "12345678901" }).success).toBe(false);
  });

  it("requires a four-digit postal code", () => {
    expect(parse({ postalCode: "810" }).success).toBe(false);
    expect(parse({ postalCode: "81000" }).success).toBe(false);
  });

  // Only the last four digits are ever stored, so the form must not accept
  // anything that looks like a whole account number.
  it("accepts exactly four digits for the payout tail", () => {
    expect(parse({ payoutLast4: "4821" }).success).toBe(true);
    expect(parse({ payoutLast4: "482" }).success).toBe(false);
    expect(parse({ payoutLast4: "1234567890" }).success).toBe(false);
    expect(parse({ payoutLast4: "48a1" }).success).toBe(false);
  });

  it("normalises the contact email", () => {
    expect(parse({ contactEmail: " HOST@Kitchenline.PH " }).data!.contactEmail).toBe(
      "host@kitchenline.ph",
    );
  });
});

describe("FacilityInput", () => {
  const full = {
    name: "Kitchen Line Club",
    description:
      "Two outdoor pickleball courts with cushioned acrylic surface and lighting for evening play.",
    cityId: "city_1",
    addressText: "12 Rizal Street, Tagum City",
    primarySportId: "pickleball",
    pesos: "350",
    opens: "6",
    closes: "22",
    indoor: "false",
    courtCount: "2",
  };
  const parse = (over: Record<string, unknown> = {}) =>
    FacilityInput.safeParse({ ...full, ...over });

  it("accepts a complete venue", () => {
    expect(parse().success).toBe(true);
  });

  // Pesos in, centavos out, as integers — the money rule the whole app follows.
  it("converts the hourly price to centavos", () => {
    expect(parse({ pesos: "350" }).data!.basePriceCents).toBe(35000);
    expect(parse({ pesos: "350.50" }).data!.basePriceCents).toBe(35050);
    expect(parse({ pesos: "350.005" }).success).toBe(false);
    expect(parse({ pesos: "0" }).success).toBe(false);
  });

  it("requires a description a player can act on", () => {
    expect(parse({ description: "Nice court" }).success).toBe(false);
    expect(parse({ description: "a".repeat(2001) }).success).toBe(false);
  });

  it("requires closing to be after opening", () => {
    expect(parse({ opens: "22", closes: "6" }).success).toBe(false);
    expect(parse({ opens: "6", closes: "6" }).success).toBe(false);
    expect(parse({ opens: "6", closes: "24" }).success).toBe(true);
  });

  it("keeps hours inside the day", () => {
    expect(parse({ opens: "-1" }).success).toBe(false);
    expect(parse({ closes: "25" }).success).toBe(false);
  });

  it("requires at least one court and caps the count", () => {
    expect(parse({ courtCount: "0" }).success).toBe(false);
    expect(parse({ courtCount: "1" }).success).toBe(true);
    expect(parse({ courtCount: "40" }).success).toBe(true);
    expect(parse({ courtCount: "41" }).success).toBe(false);
  });

  it("reads the indoor checkbox as a boolean", () => {
    expect(parse({ indoor: "on" }).data!.indoor).toBe(true);
    expect(parse({ indoor: "false" }).data!.indoor).toBe(false);
  });
});
