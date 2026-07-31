# Host Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single become-a-host form into a three-step wizard that ends with the host's first court created, and make `/owner/courts` show their real facilities instead of three that belong to nobody.

**Architecture:** One route, `/list-your-court/start`, renders whichever step the account has not finished. A pure `wizardStep()` decides which, from three booleans, so every branch is testable without a database. Each step commits before the next: signup creates the `User`, step 2 creates the `Organization` and the membership that grants owner access, step 3 creates the `Facility` and its `CourtUnit`s as `DRAFT`. Because each step persists, the wizard resumes where it was abandoned.

**Tech Stack:** Next.js 15 (App Router, server actions), React 19, Prisma 6 + MySQL, Zod 3, Vitest 4, Tailwind 4.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-31-host-onboarding-and-court-listing-design.md`. Read it before starting.
- **Money is integer centavos.** A peso amount typed by a host is matched as a string and its halves multiplied separately — `"350.50"` becomes `350 * 100 + 50`. Never `Number(x) * 100`.
- **Never store a full bank account number.** Only bank/e-wallet name, account holder name, and the last four digits. `Organization.payoutRef` already carries the instruction "tokenised — never store raw bank numbers in prod".
- **No identity-document uploads.** No permit scans, no government IDs. The only image is an optional photograph of the venue.
- **Verification and payout fields are never selected by a public query.** Only the owning host and platform admins may read them.
- **`src/lib/*.ts` pure modules must not import Next, Prisma or React at runtime.** A type-only import from `@prisma/client` is permitted.
- **`src/lib/server/*` files start with `import "server-only";`**
- **Phases 3 and 4 are out of scope.** Do not build `/admin/approvals`, do not touch `/courts`, and do not delete `src/lib/data/courts.ts`. This plan ends at `PENDING_REVIEW`.
- **Tailwind classes must be copied from neighbouring components.** Reuse `panel`, `field`, `field-label`, `btn btn-solid`, `btn btn-ghost`, `eyebrow`, and the existing `Panel`, `DashHeader`, `StatusChip` parts.
- **Every commit message ends with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```
- **Run the full suite before every commit:** `npx vitest run`. It is 109 tests across 8 files at the start of this plan and must never be left red.
- **Typecheck before every commit:** `npx tsc --noEmit`. It must print nothing.
- **Never start a second dev server, and never run `npm run build` while one runs.** They share `d:\Courtix\.next` and corrupt it. Check first: `netstat -ano | grep -E ':300[0-9]\s' | grep LISTENING`.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `EntityType`, `PayoutMethod`; verification + payout fields on `Organization`; `Facility.declineReason`; `FacilityImage.data`/`mimeType` |
| `src/lib/host-wizard.ts` | pure: `wizardStep()`, `maskTail()` |
| `src/app/(site)/list-your-court/start/schema.ts` | `AccountInput`, `OrganizationProfileInput`, `FacilityInput` |
| `src/app/(site)/list-your-court/start/actions.ts` | one action per step |
| `src/app/(site)/list-your-court/start/StepAccount.tsx` | step 1 form |
| `src/app/(site)/list-your-court/start/StepProfile.tsx` | step 2 form |
| `src/app/(site)/list-your-court/start/StepVenue.tsx` | step 3 form |
| `src/app/(site)/list-your-court/start/Stepper.tsx` | the 1–2–3 progress header |
| `src/app/(site)/list-your-court/start/page.tsx` | picks the step, loads reference data |
| `src/lib/server/host-store.ts` | `hostState`, `createOrganizationProfile`, `createFacility`, `listOwnerFacilities` |
| `src/app/api/facility-image/[id]/route.ts` | serves an uploaded venue photo |
| `src/app/owner/courts/page.tsx` | the host's real facilities |
| `tests/host-wizard.test.ts` | `wizardStep`, `maskTail` |
| `tests/host-schema.test.ts` | all three step schemas |

---

## Task 1: Schema for verification, payout, and venue photos

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_host_verification/migration.sql` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: `EntityType` = `"SOLE_PROP" | "PARTNERSHIP" | "CORPORATION"`, `PayoutMethod` = `"BANK" | "GCASH" | "MAYA"`, and the new columns.

- [ ] **Step 1: Add the two enums**

Append to the enum block in `prisma/schema.prisma`, after `enum OrgRole`:

```prisma
// How the host business is registered. Decides which registry number applies:
// DTI for a sole proprietorship, SEC for the other two.
enum EntityType {
  SOLE_PROP
  PARTNERSHIP
  CORPORATION
}

// Where a host's payout goes. Not PaymentMethod — that is money coming in.
enum PayoutMethod {
  BANK
  GCASH
  MAYA
}
```

- [ ] **Step 2: Add the verification and payout fields**

In `model Organization`, after the existing `foundingRateUntil DateTime?` line:

```prisma
  // ---- Host verification. Every field nullable: organizations created before
  // this feature have none of it, and an admin verifies by checking these
  // numbers against public registries rather than against uploaded documents.
  legalName      String?  // registered name, when it differs from the trade name
  entityType     EntityType?
  registrationNo String?  // DTI for a sole proprietorship, SEC otherwise
  permitNo       String?  // Mayor's / business permit number
  permitCity     String?  // the LGU that issued it
  tin            String?

  // Business address as free text. City here is deliberately NOT a relation:
  // the City table is the curated list of places Courtix operates in, and a
  // business may be registered somewhere Courtix has not launched. The
  // facility's city is the one that must be a real City row.
  addressLine    String?
  barangay       String?
  addressCity    String?
  province       String?
  postalCode     String?

  // The human an admin telephones to verify the business.
  repName        String?
  repPosition    String?
  repMobile      String?

  // Payout destination. payoutBankName and payoutRef already exist above and
  // are reused: the bank or e-wallet name, and the last four digits. The full
  // account number is never stored — see the comment on payoutRef.
  payoutMethod      PayoutMethod?
  payoutAccountName String?

  // Stamped when an admin has checked the details. Read-only to hosts.
  verifiedAt     DateTime?
```

- [ ] **Step 3: Add the decline reason and the photo columns**

In `model Facility`, after `fastPay Boolean @default(true)`:

```prisma
  // Why an admin declined, shown to the host so they can fix and resubmit.
  // A decline with no reason is a dead end.
  declineReason  String? @db.Text
```

In `model FacilityImage`, after `alt String`:

```prisma
  // Courtix has no CDN. `url` stays for a future one; `data` is what is served
  // today, through /api/facility-image/[id], mirroring how avatars work.
  data     Bytes?  @db.LongBlob
  mimeType String?
```

- [ ] **Step 4: Validate and migrate**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

Run: `npx prisma migrate dev --name host_verification`
Expected: the migration is created and applied, and the client regenerates. Every change is additive — new enums, new nullable columns — so the generated SQL is correct and must not be hand-edited.

If `prisma generate` fails with `EPERM ... query_engine-windows.dll.node`, a dev server is holding the file. Stop it, confirm with `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` filtered on a `*Courtix*` command line, then run `npx prisma generate`.

- [ ] **Step 5: Verify the columns exist**

Write `.superpowers/sdd/verify-host-columns.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

db.organization
  .findFirst({
    select: { name: true, entityType: true, tin: true, payoutMethod: true, verifiedAt: true },
  })
  .then((row) => console.log("ORG =", JSON.stringify(row)))
  .catch((e) => {
    console.error("ERR", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

Run: `npx tsx .superpowers/sdd/verify-host-columns.ts`
Expected: a row printed with `entityType`, `tin`, `payoutMethod` and `verifiedAt` all `null`. An error naming an unknown column means the migration did not apply.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; 8 files, 109 tests pass.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "$(cat <<'EOF'
feat(schema): add host verification, payout and venue photos

Verification is typed numbers rather than uploaded documents: an admin
checks a DTI or SEC number, a Mayor's permit and a TIN against public
registries. That leaves no permit scans and no government IDs to secure,
serve or retain.

The payout account stores the bank or e-wallet name, the account holder,
and the last four digits only. payoutRef's own comment already says never
to store raw bank numbers, and with no payment provider a full number
could not be used even if held.

The business address is free text while the facility's city stays a City
relation. City is the curated list of places Courtix operates in, and a
business may be registered somewhere Courtix has not launched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `wizardStep()` and `maskTail()`

**Files:**
- Create: `src/lib/host-wizard.ts`
- Test: `tests/host-wizard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type WizardStep = 1 | 2 | 3 | "done";
  export function wizardStep(state: {
    signedIn: boolean; hasOrganization: boolean; hasFacility: boolean;
  }): WizardStep;
  export function maskTail(value: string | null | undefined, visible?: number): string | null;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/host-wizard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/host-wizard.test.ts`
Expected: FAIL — cannot resolve `@/lib/host-wizard`.

- [ ] **Step 3: Implement the module**

Create `src/lib/host-wizard.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/host-wizard.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Typecheck, full suite, commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; 9 files, 120 tests pass.

```bash
git add src/lib/host-wizard.ts tests/host-wizard.test.ts
git commit -m "$(cat <<'EOF'
feat(host): add the wizard's step rule and value masking

wizardStep resumes rather than restarts. Step 2 is long, and losing it to
a refresh would be punishing, so the entry point reopens at the first
unfinished step and never at one already completed.

maskTail returns null for an absent value rather than a row of dots,
because dots imply something is stored when nothing is.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The three step schemas

**Files:**
- Create: `src/app/(site)/list-your-court/start/schema.ts` (replacing the current one)
- Test: `tests/host-schema.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AccountInput`, `OrganizationProfileInput`, `FacilityInput`, and `pesosToCentavos`.

The existing `OrganizationInput` in this file is replaced. Its three fields — name, contactEmail, contactPhone — survive inside `OrganizationProfileInput`.

- [ ] **Step 1: Write the failing test**

Create `tests/host-schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/host-schema.test.ts`
Expected: FAIL — `AccountInput` and the others are not exported.

- [ ] **Step 3: Write the schemas**

Replace `src/app/(site)/list-your-court/start/schema.ts` entirely:

```ts
import { z } from "zod";

import { SignupInput } from "@/app/(site)/signup/schema";

/** The same mobile rule the player profile and the organization form use, so a
 *  host who also plays meets one format everywhere. */
const mobile = z
  .string()
  .trim()
  .regex(/^09\d{9}$/, "Use an 11-digit mobile number starting 09");

/** Pesos as typed, to centavos as an integer. The string is matched before any
 *  arithmetic and the halves multiplied separately, so "350.50" becomes
 *  350 * 100 + 50 and floating point never enters. */
const pesosToCentavos = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 350 or 350.50")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  })
  .refine((cents) => cents > 0, "Amount must be more than zero");

/** Whole number from a form field, which always arrives as a string. */
const wholeNumber = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^-?\d+$/, message)
    .transform(Number);

/** Step 1. Extends the player signup rules rather than restating them: the
 *  rules a host meets must be the rules a player meets, or the two paths
 *  drift apart. */
export const AccountInput = SignupInput.extend({
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  message: "Both passwords must match",
  // On the confirmation, not the password — that one is probably right.
  path: ["confirm"],
});

/** Step 2. Business identity and payout destination. */
export const OrganizationProfileInput = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120, "That name is too long"),
  legalName: z.string().trim().max(120, "That name is too long"),
  entityType: z.enum(["SOLE_PROP", "PARTNERSHIP", "CORPORATION"], {
    errorMap: () => ({ message: "Choose how the business is registered" }),
  }),
  registrationNo: z
    .string()
    .trim()
    .min(3, "Enter your DTI or SEC number")
    .max(40, "That number is too long"),
  permitNo: z
    .string()
    .trim()
    .min(3, "Enter your business permit number")
    .max(40, "That number is too long"),
  permitCity: z.string().trim().min(2, "Which city issued the permit?").max(80, "Too long"),
  tin: z.string().trim().regex(/^\d{9,12}$/, "A TIN is 9 to 12 digits"),

  addressLine: z.string().trim().min(3, "Enter the street address").max(160, "Too long"),
  barangay: z.string().trim().min(2, "Enter the barangay").max(80, "Too long"),
  addressCity: z.string().trim().min(2, "Enter the city or municipality").max(80, "Too long"),
  province: z.string().trim().min(2, "Enter the province").max(80, "Too long"),
  postalCode: z.string().trim().regex(/^\d{4}$/, "A postal code is 4 digits"),

  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  contactPhone: mobile,

  repName: z.string().trim().min(2, "Enter the representative's name").max(80, "Too long"),
  repPosition: z.string().trim().min(2, "Enter their position").max(80, "Too long"),
  repMobile: mobile,

  payoutMethod: z.enum(["BANK", "GCASH", "MAYA"], {
    errorMap: () => ({ message: "Choose where payouts should go" }),
  }),
  payoutBankName: z.string().trim().min(2, "Enter the bank or e-wallet").max(80, "Too long"),
  payoutAccountName: z
    .string()
    .trim()
    .min(2, "Enter the account holder's name")
    .max(120, "Too long"),
  // Four digits, never the whole number. Courtix does not store account
  // numbers — see the comment on Organization.payoutRef.
  payoutLast4: z.string().trim().regex(/^\d{4}$/, "Enter the last 4 digits only"),
});

/** Step 3. The venue and how many courts it has. */
export const FacilityInput = z
  .object({
    name: z.string().trim().min(2, "Enter the venue name").max(120, "That name is too long"),
    description: z
      .string()
      .trim()
      .min(20, "Describe the venue in at least 20 characters")
      .max(2000, "That description is too long"),
    cityId: z.string().trim().min(1, "Choose a city"),
    addressText: z.string().trim().min(3, "Enter the address").max(200, "Too long"),
    primarySportId: z.string().trim().min(1, "Choose the main sport"),
    pesos: pesosToCentavos,
    opens: wholeNumber("Enter an opening hour"),
    closes: wholeNumber("Enter a closing hour"),
    // A checkbox posts "on" when ticked and nothing at all when not.
    indoor: z.string().transform((v) => v === "on" || v === "true"),
    courtCount: wholeNumber("Enter how many courts"),
  })
  .refine((v) => v.opens >= 0 && v.opens <= 23, {
    message: "Opening hour must be between 0 and 23",
    path: ["opens"],
  })
  .refine((v) => v.closes >= 1 && v.closes <= 24, {
    message: "Closing hour must be between 1 and 24",
    path: ["closes"],
  })
  .refine((v) => v.closes > v.opens, {
    message: "Closing must be later than opening",
    path: ["closes"],
  })
  .refine((v) => v.courtCount >= 1 && v.courtCount <= 40, {
    message: "A venue has between 1 and 40 courts",
    path: ["courtCount"],
  })
  .transform(({ pesos, ...rest }) => ({ ...rest, basePriceCents: pesos }));

export type AccountValues = z.infer<typeof AccountInput>;
export type OrganizationProfileValues = z.infer<typeof OrganizationProfileInput>;
export type FacilityValues = z.infer<typeof FacilityInput>;
```

- [ ] **Step 4: Point the old form at the new schema name**

`src/app/(site)/list-your-court/start/OrganizationForm.tsx` and `actions.ts` import `OrganizationInput`, which no longer exists. They are replaced wholesale in Tasks 5–7. To keep this task's commit green, delete both files now:

```bash
git rm "src/app/(site)/list-your-court/start/OrganizationForm.tsx"
git rm "src/app/(site)/list-your-court/start/actions.ts"
```

Then replace the body of `src/app/(site)/list-your-court/start/page.tsx` with a temporary placeholder so the route still builds:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Become a host", robots: { index: false } };

// Replaced by the wizard in Task 5. Until then the route sends visitors to the
// marketing page rather than rendering a form whose action has been removed.
export default function BecomeHostPage() {
  redirect("/list-your-court");
}
```

Also delete the `OrganizationInput` block from `tests/signup.test.ts` — it tests a schema that no longer exists. Remove its `import` line and the whole `describe("OrganizationInput", ...)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: PASS. `tests/host-schema.test.ts` contributes 21 cases; `tests/signup.test.ts` drops the 6 organization cases.

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no output.

```bash
git add "src/app/(site)/list-your-court/start" tests/host-schema.test.ts tests/signup.test.ts
git commit -m "$(cat <<'EOF'
feat(host): add the three wizard step schemas

AccountInput extends the player signup rules rather than restating them,
so the two signup paths cannot drift. Its mismatch error lands on the
confirmation field rather than the password, which is probably right.

The payout field accepts exactly four digits, so the form cannot take a
whole account number even by accident.

Hours, court counts and prices arrive from the form as strings and are
converted once, here — the price by matching the string and multiplying
its halves separately, never by float arithmetic.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The host store

**Files:**
- Create: `src/lib/server/host-store.ts`

**Interfaces:**
- Consumes: `slugify` from `src/lib/slug.ts`; `db`.
- Produces:
  ```ts
  export function hostState(userId: string): Promise<{
    hasOrganization: boolean; hasFacility: boolean; orgId: string | null;
  }>;
  export function createOrganizationProfile(
    userId: string, values: OrganizationProfileValues,
  ): Promise<string>;                                   // the new orgId
  export function createFacility(
    orgId: string, values: FacilityValues,
    photo: { bytes: Buffer; mimeType: string } | null,
  ): Promise<string>;                                   // the new facility slug
  export function listOwnerFacilities(orgId: string): Promise<OwnerFacility[]>;
  export function referenceData(): Promise<{
    cities: { id: string; name: string; province: string }[];
    sports: { id: string; name: string }[];
  }>;
  ```

- [ ] **Step 1: Write the store**

Create `src/lib/server/host-store.ts`:

```ts
import "server-only";

import type { FacilityStatus } from "@prisma/client";

import type {
  FacilityValues,
  OrganizationProfileValues,
} from "@/app/(site)/list-your-court/start/schema";
import { db } from "@/lib/server/db";
import { slugify } from "@/lib/slug";

/** What the wizard needs to know to pick a step. Two counts, one query each,
 *  and no rows dragged back. */
export async function hostState(userId: string): Promise<{
  hasOrganization: boolean;
  hasFacility: boolean;
  orgId: string | null;
}> {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    orderBy: { orgId: "asc" },
    select: { orgId: true },
  });
  if (!membership) return { hasOrganization: false, hasFacility: false, orgId: null };

  const facilities = await db.facility.count({ where: { orgId: membership.orgId } });
  return { hasOrganization: true, hasFacility: facilities > 0, orgId: membership.orgId };
}

/** A slug nobody else holds. Two hosts can legitimately share a name, so
 *  collisions are expected rather than exceptional. */
async function availableSlug(
  name: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "host";
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix}`;
    if (!(await taken(candidate))) return candidate;
  }
}

/**
 * Step 2. Creates the business and the membership that grants owner access.
 *
 * Both in one transaction: an Organization with no member is unreachable by
 * anyone, and a membership pointing at nothing cannot exist.
 */
export async function createOrganizationProfile(
  userId: string,
  values: OrganizationProfileValues,
): Promise<string> {
  const slug = await availableSlug(values.name, async (candidate) =>
    Boolean(await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  return db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug,
        name: values.name,
        legalName: values.legalName || null,
        entityType: values.entityType,
        registrationNo: values.registrationNo,
        permitNo: values.permitNo,
        permitCity: values.permitCity,
        tin: values.tin,
        addressLine: values.addressLine,
        barangay: values.barangay,
        addressCity: values.addressCity,
        province: values.province,
        postalCode: values.postalCode,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        repName: values.repName,
        repPosition: values.repPosition,
        repMobile: values.repMobile,
        payoutMethod: values.payoutMethod,
        payoutBankName: values.payoutBankName,
        payoutAccountName: values.payoutAccountName,
        // The last four digits only. payoutRef's own comment forbids storing
        // a raw account number, and no provider exists to tokenise one.
        payoutRef: values.payoutLast4,
      },
      select: { id: true },
    });

    await tx.organizationMember.create({
      data: { orgId: org.id, userId, role: "OWNER" },
    });

    return org.id;
  });
}

/**
 * Step 3. The venue, its courts, and an optional photograph.
 *
 * Created DRAFT and immediately submitted, so the host leaves the wizard with
 * something an admin can act on rather than a draft they must remember to send.
 */
export async function createFacility(
  orgId: string,
  values: FacilityValues,
  photo: { bytes: Buffer; mimeType: string } | null,
): Promise<string> {
  const slug = await availableSlug(values.name, async (candidate) =>
    Boolean(await db.facility.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  await db.$transaction(async (tx) => {
    const facility = await tx.facility.create({
      data: {
        orgId,
        slug,
        name: values.name,
        description: values.description,
        cityId: values.cityId,
        addressText: values.addressText,
        primarySportId: values.primarySportId,
        basePriceCents: values.basePriceCents,
        opens: values.opens,
        closes: values.closes,
        indoor: values.indoor,
        status: "PENDING_REVIEW",
      },
      select: { id: true },
    });

    // One CourtUnit per court. The label is denormalised for display, which is
    // why it is written here rather than derived at render time.
    await tx.courtUnit.createMany({
      data: Array.from({ length: values.courtCount }, (_, i) => ({
        facilityId: facility.id,
        index: i,
        label: `Court ${i + 1}`,
        sportId: values.primarySportId,
      })),
    });

    // The facility's own sport, so the directory's sport filter finds it.
    await tx.facilitySport.create({
      data: { facilityId: facility.id, sportId: values.primarySportId },
    });

    if (photo) {
      await tx.facilityImage.create({
        data: {
          facilityId: facility.id,
          // url stays empty: the bytes are served by /api/facility-image/[id].
          url: "",
          alt: `${values.name} — venue photo`,
          position: 0,
          data: photo.bytes,
          mimeType: photo.mimeType,
        },
      });
    }
  });

  return slug;
}

export interface OwnerFacility {
  id: string;
  slug: string;
  name: string;
  status: FacilityStatus;
  declineReason: string | null;
  cityName: string;
  sportId: string;
  basePriceCents: number;
  opens: number;
  closes: number;
  courtCount: number;
  imageId: string | null;
}

/** The host's own venues, newest first. */
export async function listOwnerFacilities(orgId: string): Promise<OwnerFacility[]> {
  const rows = await db.facility.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      declineReason: true,
      basePriceCents: true,
      opens: true,
      closes: true,
      primarySportId: true,
      city: { select: { name: true } },
      _count: { select: { courtUnits: true } },
      images: {
        where: { data: { not: null } },
        orderBy: { position: "asc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    declineReason: row.declineReason,
    cityName: row.city.name,
    sportId: row.primarySportId,
    basePriceCents: row.basePriceCents,
    opens: row.opens,
    closes: row.closes,
    courtCount: row._count.courtUnits,
    imageId: row.images[0]?.id ?? null,
  }));
}

/** The curated lists step 3 offers. Cities are LIVE only: a venue in a city
 *  Courtix has not launched cannot be booked, so it must not be listable. */
export async function referenceData(): Promise<{
  cities: { id: string; name: string; province: string }[];
  sports: { id: string; name: string }[];
}> {
  const [cities, sports] = await Promise.all([
    db.city.findMany({
      where: { status: "LIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, province: true },
    }),
    db.sport.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { cities, sports };
}
```

- [ ] **Step 2: Typecheck, full suite, commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass. This task adds no tests — it is Prisma plumbing, and the rules it applies are covered by Task 3's schema tests.

```bash
git add src/lib/server/host-store.ts
git commit -m "$(cat <<'EOF'
feat(host): add the store behind the wizard

Each step's write is one transaction. The organization and its membership
are created together because an organization with no member is
unreachable by anyone, and a facility is created with its court units and
sport in one go so a half-built venue cannot be listed.

A venue is submitted as PENDING_REVIEW rather than left DRAFT: a host
should leave the wizard with something an admin can act on, not a draft
they must remember to send.

Cities offered are LIVE only. A venue in a city Courtix has not launched
cannot be booked, so it must not be listable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The wizard shell and step 1

**Files:**
- Create: `src/app/(site)/list-your-court/start/Stepper.tsx`, `StepAccount.tsx`, `actions.ts`
- Modify: `src/app/(site)/list-your-court/start/page.tsx`
- Modify: `src/middleware.ts` — remove `/list-your-court/start` from the matcher

**Interfaces:**
- Consumes: `wizardStep` (Task 2), `AccountInput` (Task 3), `hostState` (Task 4), `hashPassword`, `createSession`.
- Produces: `accountAction`, and the wizard route.

- [ ] **Step 1: Open the route to signed-out visitors**

Step 1 *is* the signup, so the route can no longer demand a session. In `src/middleware.ts`, remove the `/list-your-court/start` entry:

```ts
  matcher: ["/owner/:path*", "/admin/:path*", "/account/:path*"],
```

The page still gates every later step server-side, which was always the real check — middleware only ever tested for a cookie.

- [ ] **Step 2: Write the stepper**

Create `src/app/(site)/list-your-court/start/Stepper.tsx`:

```tsx
import type { WizardStep } from "@/lib/host-wizard";

const STEPS = [
  { n: 1, label: "Account" },
  { n: 2, label: "Profile" },
  { n: 3, label: "Venue" },
] as const;

/** The 1–2–3 header. A completed step is ticked so returning hosts can see
 *  what the wizard already has, which is the point of resuming. */
export function Stepper({ current }: { current: WizardStep }) {
  const active = current === "done" ? 4 : current;

  return (
    <ol className="mb-8 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = step.n < active;
        const here = step.n === active;
        return (
          <li key={step.n} className="flex flex-1 items-center gap-2">
            <span
              aria-current={here ? "step" : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                here
                  ? "bg-ball-yellow text-ink"
                  : done
                    ? "bg-fair-green text-line-white"
                    : "border border-line-white/20 text-muted"
              }`}
            >
              {done ? "✓" : step.n}
            </span>
            <span
              className={`text-[12.5px] font-semibold ${here ? "text-line-white" : "text-muted"}`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="ml-1 hidden h-px flex-1 bg-line-white/15 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Write the account action**

Create `src/app/(site)/list-your-court/start/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { AccountInput } from "@/app/(site)/list-your-court/start/schema";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export interface StepState {
  errors?: Record<string, string>;
  /** Echoed back so a failed attempt does not clear what was typed. */
  values?: Record<string, string>;
}

const TAKEN = "An account with that email already exists.";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Field errors keyed the way the form names its inputs. */
export function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Step 1. Creates the account and signs the visitor in, so the wizard
 *  continues in the same breath rather than bouncing out to /login. */
export async function accountAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const typed = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = AccountInput.safeParse({
    ...typed,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: typed };

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { errors: { email: TAKEN }, values: typed };

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        // role defaults to PLAYER. Hosting is granted by the membership in
        // step 2, never by the platform role.
        data: { name, email, passwordHash },
        select: { id: true },
      });
      await tx.playerProfile.create({ data: { userId: created.id } });
      return created;
    });
    userId = user.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { errors: { email: TAKEN }, values: typed };
    throw error;
  }

  await createSession(userId, true);
  // The page reads the session to pick a step, so it must not be served stale.
  revalidatePath("/list-your-court/start");
  return {};
}
```

- [ ] **Step 4: Write the step 1 form**

Create `src/app/(site)/list-your-court/start/StepAccount.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { accountAction, type StepState } from "@/app/(site)/list-your-court/start/actions";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-[11.5px] font-semibold text-[#ff9370]">
          {error}
        </span>
      )}
    </label>
  );
}

export function StepAccount() {
  const [state, action, pending] = useActionState<StepState, FormData>(accountAction, {});
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Create your host account
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        You keep your player account — the same login gets you both.
      </p>

      <Field label="Your name" error={errors.name}>
        <input
          type="text"
          name="name"
          required
          defaultValue={values.name}
          className="field"
          placeholder="Juan dela Cruz"
          autoComplete="name"
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <input
          type="email"
          name="email"
          required
          defaultValue={values.email}
          className="field"
          placeholder="you@example.ph"
          autoComplete="email"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" error={errors.password}>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="field"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm" error={errors.confirm}>
          <input
            type="password"
            name="confirm"
            required
            className="field"
            placeholder="Repeat password"
            autoComplete="new-password"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-2 w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Continue"}
      </button>

      <p className="mt-5 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link
          href="/login?next=/list-your-court/start"
          className="font-bold text-ball-yellow"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 5: Write the page**

Replace `src/app/(site)/list-your-court/start/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StepAccount } from "@/app/(site)/list-your-court/start/StepAccount";
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
      {/* Steps 2 and 3 arrive in Tasks 6 and 7. */}
      {step !== 1 && (
        <p className="panel text-[13px] text-muted">This step is being built.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass.

- [ ] **Step 7: Verify step 1**

Check no dev server is already running, then `npm run dev`.

1. Signed out, open `/list-your-court/start`. It renders — **no redirect to /login** — and the stepper shows step 1 active.
2. Submit a fresh name, email and matching passwords. You stay on the page and the stepper advances to step 2.
3. Open `/list-your-court/start` again in the same session: it opens at step 2, not step 1. That is the resume rule working.
4. Submit with mismatched passwords: the error appears under **Confirm**, and the name and email are still filled in.
5. Submit with an email that already exists: the inline "An account with that email already exists." appears.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(site)/list-your-court/start" src/middleware.ts
git commit -m "$(cat <<'EOF'
feat(host): add the wizard shell and the account step

Step 1 is the signup, so the route drops out of the middleware matcher —
a signed-out visitor belongs here now. Every later step is gated by what
the account actually has, which was always the real check; middleware
only ever tested for a cookie.

Creating the account signs the visitor in immediately, so the wizard
continues in the same breath instead of bouncing out to /login and back.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Step 2, the business profile

**Files:**
- Create: `src/app/(site)/list-your-court/start/StepProfile.tsx`
- Modify: `src/app/(site)/list-your-court/start/actions.ts` (append), `page.tsx`

**Interfaces:**
- Consumes: `OrganizationProfileInput` (Task 3), `createOrganizationProfile`, `hostState` (Task 4), `requireUser`.
- Produces: `profileAction`.

- [ ] **Step 1: Append the profile action**

Add to `src/app/(site)/list-your-court/start/actions.ts`:

```ts
import { OrganizationProfileInput } from "@/app/(site)/list-your-court/start/schema";
import { requireUser } from "@/lib/server/auth";
import { createOrganizationProfile, hostState } from "@/lib/server/host-store";

/** Step 2. Creates the business and the membership that grants owner access. */
export async function profileAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();

  // Already a host: this form is not a way to collect organizations.
  const state = await hostState(user.id);
  if (state.hasOrganization) {
    revalidatePath("/list-your-court/start");
    return {};
  }

  const raw = Object.fromEntries(
    [
      "name", "legalName", "entityType", "registrationNo", "permitNo", "permitCity", "tin",
      "addressLine", "barangay", "addressCity", "province", "postalCode",
      "contactEmail", "contactPhone", "repName", "repPosition", "repMobile",
      "payoutMethod", "payoutBankName", "payoutAccountName", "payoutLast4",
    ].map((key) => [key, String(formData.get(key) ?? "")]),
  );

  const parsed = OrganizationProfileInput.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  await createOrganizationProfile(user.id, parsed.data);

  // The page re-reads hostState to pick the step, so it must not be stale.
  revalidatePath("/list-your-court/start");
  return {};
}
```

- [ ] **Step 2: Write the step 2 form**

Create `src/app/(site)/list-your-court/start/StepProfile.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { profileAction, type StepState } from "@/app/(site)/list-your-court/start/actions";
import { Field } from "@/app/(site)/list-your-court/start/StepAccount";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function StepProfile() {
  const [state, action, pending] = useActionState<StepState, FormData>(profileAction, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Your business
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        A platform admin checks these against public registries before your venue goes live.
        We never ask for scans or ID photos.
      </p>

      <Group title="Business">
        <Field label="Business name" error={errors.name}>
          <input type="text" name="name" required defaultValue={v.name} className="field" placeholder="Kitchen Line Club" />
        </Field>
        <Field label="Registered name (optional)" error={errors.legalName}>
          <input type="text" name="legalName" defaultValue={v.legalName} className="field" placeholder="Kitchen Line Sports Ventures" />
        </Field>
        <Field label="How it is registered" error={errors.entityType}>
          <select name="entityType" required defaultValue={v.entityType ?? ""} className="field">
            <option value="" disabled>Choose one</option>
            <option value="SOLE_PROP">Sole proprietorship</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="CORPORATION">Corporation</option>
          </select>
        </Field>
        <Field label="DTI or SEC number" error={errors.registrationNo}>
          <input type="text" name="registrationNo" required defaultValue={v.registrationNo} className="field" placeholder="DTI-1234567" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business permit number" error={errors.permitNo}>
            <input type="text" name="permitNo" required defaultValue={v.permitNo} className="field" placeholder="BP-2026-00891" />
          </Field>
          <Field label="Issued by (city)" error={errors.permitCity}>
            <input type="text" name="permitCity" required defaultValue={v.permitCity} className="field" placeholder="Tagum City" />
          </Field>
        </div>
        <Field label="TIN" error={errors.tin}>
          <input type="text" name="tin" required inputMode="numeric" defaultValue={v.tin} className="field" placeholder="123456789" />
        </Field>
      </Group>

      <Group title="Business address">
        <Field label="Street address" error={errors.addressLine}>
          <input type="text" name="addressLine" required defaultValue={v.addressLine} className="field" placeholder="12 Rizal Street" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Barangay" error={errors.barangay}>
            <input type="text" name="barangay" required defaultValue={v.barangay} className="field" placeholder="Magugpo Poblacion" />
          </Field>
          <Field label="City or municipality" error={errors.addressCity}>
            <input type="text" name="addressCity" required defaultValue={v.addressCity} className="field" placeholder="Tagum City" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Province" error={errors.province}>
            <input type="text" name="province" required defaultValue={v.province} className="field" placeholder="Davao del Norte" />
          </Field>
          <Field label="Postal code" error={errors.postalCode}>
            <input type="text" name="postalCode" required inputMode="numeric" defaultValue={v.postalCode} className="field" placeholder="8100" />
          </Field>
        </div>
      </Group>

      <Group title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" error={errors.contactEmail}>
            <input type="email" name="contactEmail" required defaultValue={v.contactEmail} className="field" placeholder="host@example.ph" />
          </Field>
          <Field label="Business mobile" error={errors.contactPhone}>
            <input type="tel" name="contactPhone" required defaultValue={v.contactPhone} className="field" placeholder="09171234567" />
          </Field>
        </div>
        <Field label="Authorised representative" error={errors.repName}>
          <input type="text" name="repName" required defaultValue={v.repName} className="field" placeholder="Maria Santos" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Their position" error={errors.repPosition}>
            <input type="text" name="repPosition" required defaultValue={v.repPosition} className="field" placeholder="Owner" />
          </Field>
          <Field label="Their mobile" error={errors.repMobile}>
            <input type="tel" name="repMobile" required defaultValue={v.repMobile} className="field" placeholder="09171234567" />
          </Field>
        </div>
      </Group>

      <Group title="Payouts">
        <p className="mb-3 text-[12px] leading-relaxed text-muted">
          The last four digits only — Courtix does not store full account numbers.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where payouts go" error={errors.payoutMethod}>
            <select name="payoutMethod" required defaultValue={v.payoutMethod ?? ""} className="field">
              <option value="" disabled>Choose one</option>
              <option value="BANK">Bank account</option>
              <option value="GCASH">GCash</option>
              <option value="MAYA">Maya</option>
            </select>
          </Field>
          <Field label="Bank or e-wallet" error={errors.payoutBankName}>
            <input type="text" name="payoutBankName" required defaultValue={v.payoutBankName} className="field" placeholder="BDO" />
          </Field>
        </div>
        <Field label="Account holder name" error={errors.payoutAccountName}>
          <input type="text" name="payoutAccountName" required defaultValue={v.payoutAccountName} className="field" placeholder="Kitchen Line Sports Ventures" />
        </Field>
        <Field label="Last 4 digits" error={errors.payoutLast4}>
          <input type="text" name="payoutLast4" required inputMode="numeric" maxLength={4} defaultValue={v.payoutLast4} className="field" placeholder="4821" />
        </Field>
      </Group>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Render it from the page**

In `src/app/(site)/list-your-court/start/page.tsx`, add the import:

```tsx
import { StepProfile } from "@/app/(site)/list-your-court/start/StepProfile";
```

and replace the two placeholder lines:

```tsx
      {step === 1 && <StepAccount />}
      {step === 2 && <StepProfile />}
      {/* Step 3 arrives in Task 7. */}
      {step === 3 && (
        <p className="panel text-[13px] text-muted">This step is being built.</p>
      )}
```

- [ ] **Step 4: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass.

- [ ] **Step 5: Verify step 2**

With the dev server running, as the account created in Task 5:

1. `/list-your-court/start` opens at step 2 with the stepper's first circle ticked.
2. Submit with a bad TIN (`12345678`) and a five-digit payout tail: both errors appear on their own fields and every other value stays filled in.
3. Fill it correctly and submit. The stepper advances to step 3.
4. Open `/owner` — it loads, because the membership created here grants owner access.
5. Reload `/list-your-court/start`: it opens at step 3, never back at step 2.

Confirm what was stored, with `.superpowers/sdd/check-org.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

db.organization
  .findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      name: true, entityType: true, tin: true, permitNo: true, repName: true,
      payoutMethod: true, payoutBankName: true, payoutAccountName: true, payoutRef: true,
    },
  })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .finally(() => db.$disconnect());
```

Run: `npx tsx .superpowers/sdd/check-org.ts`
Expected: the typed values, and `payoutRef` holding **exactly four digits**. Anything longer means a full account number reached the database and must be fixed before continuing.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(site)/list-your-court/start"
git commit -m "$(cat <<'EOF'
feat(host): add the business profile step

Verification is typed numbers an admin checks against public registries,
so the form asks for no scans and no ID photos and the copy says so.

The payout field takes four digits and is labelled as such, so a host is
never invited to type a full account number that Courtix would then have
to protect.

Owner access is granted here, at the end of step 2, before any venue
exists. A host who abandons step 3 still reaches /owner, where their
empty courts page invites them to finish.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Step 3, the venue

**Files:**
- Create: `src/app/(site)/list-your-court/start/StepVenue.tsx`, `src/app/api/facility-image/[id]/route.ts`
- Modify: `actions.ts` (append), `page.tsx`

**Interfaces:**
- Consumes: `FacilityInput` (Task 3), `createFacility`, `referenceData`, `hostState` (Task 4), `validateAvatar`/`sniffImageType` from `src/lib/image-upload.ts`.
- Produces: `venueAction`, and the image route.

- [ ] **Step 1: Append the venue action**

Add to `src/app/(site)/list-your-court/start/actions.ts`:

```ts
import { FacilityInput } from "@/app/(site)/list-your-court/start/schema";
import { createFacility } from "@/lib/server/host-store";
import { validateAvatar } from "@/lib/image-upload";

/** Step 3. Creates the venue, its courts, and an optional photograph. */
export async function venueAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();
  const state = await hostState(user.id);
  // No business yet: the venue has nothing to hang from.
  if (!state.orgId) return { errors: { form: "Finish your business details first." } };

  const raw = Object.fromEntries(
    ["name", "description", "cityId", "addressText", "primarySportId", "pesos", "opens", "closes", "courtCount"].map(
      (key) => [key, String(formData.get(key) ?? "")],
    ),
  );
  // A checkbox posts nothing when unticked, which must read as false.
  const indoor = String(formData.get("indoor") ?? "");

  const parsed = FacilityInput.safeParse({ ...raw, indoor });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: raw };

  // The photo is optional. An empty file input posts a zero-byte File.
  let photo: { bytes: Buffer; mimeType: string } | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateAvatar(bytes);
    if (!check.ok) return { errors: { photo: check.error }, values: raw };
    photo = { bytes: Buffer.from(bytes), mimeType: check.mimeType };
  }

  await createFacility(state.orgId, parsed.data, photo);

  revalidatePath("/list-your-court/start");
  revalidatePath("/owner/courts");
  return {};
}
```

- [ ] **Step 2: Write the image route**

Create `src/app/api/facility-image/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";

/** Serves an uploaded venue photo.
 *
 *  Public by design — it is a picture of a court on a public listing — but it
 *  serves only rows that actually hold bytes, so a facility with no upload
 *  cannot be probed for one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const image = await db.facilityImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
  if (!image?.data || !image.mimeType) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      // Immutable: a new upload creates a new row with a new id.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Step 3: Write the step 3 form**

Create `src/app/(site)/list-your-court/start/StepVenue.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { venueAction, type StepState } from "@/app/(site)/list-your-court/start/actions";
import { Field } from "@/app/(site)/list-your-court/start/StepAccount";

export function StepVenue({
  cities,
  sports,
}: {
  cities: { id: string; name: string; province: string }[];
  sports: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<StepState, FormData>(venueAction, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="panel">
      <h2 className="mb-1 font-sans text-[18px] font-extrabold normal-case tracking-normal">
        Your venue
      </h2>
      <p className="mb-5 text-[13px] text-muted">
        This is what players see. It goes to a platform admin for review before it appears in
        the directory.
      </p>

      {errors.form && (
        <p role="alert" className="mb-4 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] font-semibold text-[#ff9370]">
          {errors.form}
        </p>
      )}

      <Field label="Venue name" error={errors.name}>
        <input type="text" name="name" required defaultValue={v.name} className="field" placeholder="Kitchen Line Club" />
      </Field>
      <Field label="Description" error={errors.description}>
        <textarea name="description" required rows={4} defaultValue={v.description} className="field" placeholder="Surface, lighting, parking, what to bring…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" error={errors.cityId}>
          <select name="cityId" required defaultValue={v.cityId ?? ""} className="field">
            <option value="" disabled>Choose a city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}, {c.province}</option>
            ))}
          </select>
        </Field>
        <Field label="Main sport" error={errors.primarySportId}>
          <select name="primarySportId" required defaultValue={v.primarySportId ?? ""} className="field">
            <option value="" disabled>Choose a sport</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Address" error={errors.addressText}>
        <input type="text" name="addressText" required defaultValue={v.addressText} className="field" placeholder="12 Rizal Street, Tagum City" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per hour (₱)" error={errors.pesos}>
          <input type="text" name="pesos" required inputMode="decimal" defaultValue={v.pesos} className="field" placeholder="350" />
        </Field>
        <Field label="Opens (24h)" error={errors.opens}>
          <input type="number" name="opens" required min={0} max={23} defaultValue={v.opens ?? "6"} className="field" />
        </Field>
        <Field label="Closes (24h)" error={errors.closes}>
          <input type="number" name="closes" required min={1} max={24} defaultValue={v.closes ?? "22"} className="field" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="How many courts" error={errors.courtCount}>
          <input type="number" name="courtCount" required min={1} max={40} defaultValue={v.courtCount ?? "1"} className="field" />
        </Field>
        <Field label="Photo (optional)" error={errors.photo}>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="field" />
        </Field>
      </div>

      <label className="mb-5 flex items-center gap-2.5 text-[13px]">
        <input type="checkbox" name="indoor" className="h-4 w-4" />
        This venue is indoors
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Render it from the page**

In `page.tsx`, add the imports and load the reference data only when it is needed:

```tsx
import { StepVenue } from "@/app/(site)/list-your-court/start/StepVenue";
import { hostState, referenceData } from "@/lib/server/host-store";
```

After the `step === "done"` redirect:

```tsx
  // Only step 3 needs the curated lists, so nothing else pays for the query.
  const reference = step === 3 ? await referenceData() : null;
```

and replace the step 3 placeholder:

```tsx
      {step === 3 && reference && (
        <StepVenue cities={reference.cities} sports={reference.sports} />
      )}
```

- [ ] **Step 5: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass.

- [ ] **Step 6: Verify step 3**

1. As the account from Task 6, `/list-your-court/start` opens at step 3 with two circles ticked.
2. Submit with `closes` earlier than `opens`: the error lands on **Closes**.
3. Submit a price of `350.005`: the format error lands on the price.
4. Fill it correctly, choose 2 courts, attach a JPEG, and submit. You are redirected to `/owner/courts`.
5. Reload `/list-your-court/start`: it redirects straight to `/owner/courts`, because the wizard is done.

Confirm the rows with `.superpowers/sdd/check-facility.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

db.facility
  .findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true, name: true, status: true, basePriceCents: true, opens: true, closes: true,
      indoor: true, city: { select: { name: true } }, primarySportId: true,
      _count: { select: { courtUnits: true, images: true, sports: true } },
      courtUnits: { select: { index: true, label: true }, orderBy: { index: "asc" } },
      images: { select: { id: true, mimeType: true } },
    },
  })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .finally(() => db.$disconnect());
```

Run: `npx tsx .superpowers/sdd/check-facility.ts`
Expected: `status: "PENDING_REVIEW"`, `basePriceCents` an integer, two `courtUnits` labelled `Court 1` and `Court 2`, one `sports` row, and one image with a real `mimeType`. Then open `/api/facility-image/<that id>` and confirm the photo loads.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/list-your-court/start" src/app/api/facility-image
git commit -m "$(cat <<'EOF'
feat(host): add the venue step and serve its photo

The venue, its court units and its sport are written in one transaction,
so a half-built listing cannot exist. It is submitted as PENDING_REVIEW
rather than left DRAFT: a host should leave the wizard with something an
admin can act on.

The photo is optional and validated by sniffing the bytes, so a renamed
executable cannot enter as a JPEG. It is served from its own route like
avatars are, because Courtix has no CDN.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: The host's real courts page

**Files:**
- Modify: `src/app/owner/courts/page.tsx` (replaced wholesale)

**Interfaces:**
- Consumes: `requireOwner`, `listOwnerFacilities` (Task 4), `formatCentavos`-style peso rendering via the existing `peso()` helper, `DashHeader`, `Panel`, `StatusChip`.
- Produces: nothing further.

- [ ] **Step 1: Replace the page**

Replace `src/app/owner/courts/page.tsx` entirely:

```tsx
import Image from "next/image";
import Link from "next/link";

import { DashHeader, StatusChip } from "@/components/dashboard/parts";
import { hourShort } from "@/lib/format";
import { requireOwner } from "@/lib/server/auth";
import { listOwnerFacilities } from "@/lib/server/host-store";

export const metadata = { title: "My courts" };

export const dynamic = "force-dynamic";

/** What each status means to the host, in their words rather than the enum's.
 *  Tones are StatusChip's three: "open" reads positive, "pending" neutral,
 *  "booked" negative. */
const STATUS_COPY: Record<
  string,
  { label: string; note: string; tone: "open" | "booked" | "pending" }
> = {
  DRAFT: { label: "Draft", note: "Not submitted yet.", tone: "pending" },
  PENDING_REVIEW: {
    label: "In review",
    note: "A platform admin is checking your details.",
    tone: "pending",
  },
  APPROVED: {
    label: "Live",
    note: "Players can find and book this venue.",
    tone: "open",
  },
  DECLINED: {
    label: "Declined",
    note: "Fix the note below and submit again.",
    tone: "booked",
  },
  SUSPENDED: {
    label: "Suspended",
    note: "Taken off the directory. Contact support.",
    tone: "booked",
  },
};

export default async function OwnerCourtsPage() {
  const { org } = await requireOwner();
  const facilities = await listOwnerFacilities(org.id);

  return (
    <>
      <DashHeader
        title="My courts"
        sub={
          facilities.length === 0
            ? "No venues yet"
            : `${facilities.length} venue${facilities.length === 1 ? "" : "s"} at ${org.name}`
        }
        action={
          <Link href="/list-your-court/start" className="btn btn-solid">
            + Add court
          </Link>
        }
      />

      {facilities.length === 0 ? (
        <div className="rounded-[16px] border border-line-white/10 bg-card px-6 py-16 text-center">
          <p className="mb-1.5 font-sans text-[16px] font-extrabold normal-case tracking-normal">
            No venues yet
          </p>
          <p className="mx-auto mb-6 max-w-[380px] text-[13px] leading-relaxed text-muted">
            Add your first venue and we&apos;ll review it. Once approved it appears in the
            Courtix directory and players can book it.
          </p>
          <Link href="/list-your-court/start" className="btn btn-solid">
            Add your first court
          </Link>
        </div>
      ) : (
        <div className="grid gap-[18px] lg:grid-cols-2">
          {facilities.map((f) => {
            const copy = STATUS_COPY[f.status] ?? { label: f.status, note: "", tone: "pending" as const };
            return (
              <section key={f.id} className="panel">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-sans text-[15px] font-extrabold normal-case tracking-normal">
                      {f.name}
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {f.cityName} · {f.courtCount} court{f.courtCount === 1 ? "" : "s"} ·{" "}
                      {hourShort(f.opens)}–{hourShort(f.closes)}
                    </p>
                  </div>
                  <StatusChip tone={copy.tone}>{copy.label}</StatusChip>
                </div>

                {f.imageId && (
                  <Image
                    src={`/api/facility-image/${f.imageId}`}
                    alt={`${f.name} — venue photo`}
                    width={640}
                    height={360}
                    unoptimized
                    className="mb-3 h-[150px] w-full rounded-[10px] object-cover"
                  />
                )}

                <p className="text-[12.5px] text-muted">{copy.note}</p>

                {f.status === "DECLINED" && f.declineReason && (
                  <p className="mt-2.5 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] text-[#ff9370]">
                    {f.declineReason}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck and run the suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no typecheck output; all tests pass.

- [ ] **Step 3: Verify the courts page**

1. As the host from Task 7, open `/owner/courts`. It shows **their** venue with an "In review" chip, the right city, court count and hours — and the photo if one was uploaded.
2. Confirm the three demo courts are **gone**: no Kitchen Line Club, Sunrise Courts or Dink District unless the host actually created them.
3. Sign in as the seeded `owner@kitchenline.ph` and open `/owner/courts`. That org has facilities from the seed, so they appear with "Live" chips.
4. Create a second host with no venue and open `/owner/courts`: the empty state appears, with a working "Add your first court".
5. Click `+ Add court` as a finished host: it opens `/list-your-court/start`, which redirects to `/owner/courts` because the wizard is done.

> Step 5 exposes a real limitation: a host with one venue cannot add a second, because `wizardStep()` reports "done". `/owner/courts/new` is listed in the spec's surfaces and is **not built by this plan** — note it in your report as follow-up work rather than patching it here.

- [ ] **Step 4: Commit**

```bash
git add src/app/owner/courts/page.tsx
git commit -m "$(cat <<'EOF'
feat(owner): show the host's real venues

The page filtered a static catalogue by three hardcoded ids, so every
owner saw the same three courts and none of them were theirs. It now
lists the facilities their organization actually owns.

Status is shown in the host's words rather than the enum's, and a
declined venue shows the admin's reason, because a decline with no reason
is a dead end.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §4 wizard, three steps, commit-per-step | 5, 6, 7 |
| §4 resume rule, `wizardStep()` | 2, and the page in 5 |
| §5.1 Organization verification + payout fields | 1 |
| §5.2 FacilityImage bytes | 1, 7 |
| §5.3 Facility.declineReason | 1, surfaced in 8 |
| §6 no full account numbers | 1 (`payoutRef` = last 4), 3 (4-digit rule), 6 (copy says so) |
| §6 no document or ID uploads | nothing collects them; only a venue photo exists |
| §6 verification never in a public query | `listOwnerFacilities` selects none of it |
| §7 lifecycle to PENDING_REVIEW | 4, 7 |
| §7 `/owner/courts` real, demo courts removed | 8 |
| §9 `/list-your-court/start` | 5, 6, 7 |
| §10 validation | 3 |
| §11 testing | 2, 3 |
| §12 phases 1–2 | all tasks |

**Deliberately not built, per this plan's scope:** `/admin/approvals` (phase 3), the directory switch and deleting `src/lib/data/courts.ts` (phase 4).

**Three gaps I am naming rather than hiding:**

1. **`/owner/courts/new` is in the spec's surfaces table but has no task.** A host with one venue cannot add a second, because `wizardStep()` returns "done". Task 8 Step 3 makes the implementer confirm this and report it. It is a small follow-up — reuse `StepVenue` on its own route — but adding it here would widen a plan that is already eight tasks.
2. **`§6`'s masking is implemented (`maskTail`, Task 2) but nothing renders it yet.** Nothing in phases 1–2 redisplays a stored verification value: step 2 is create-only, and `/owner/courts` shows none of it. The function exists and is tested, ready for the admin approvals page in phase 3, which is the first surface that shows these values back.
3. **`OpeningHour` rows are not written.** `Facility.opens`/`closes` carry the window, which is what the directory and availability use today; per-weekday overrides are listed as out of scope in the spec.

**Placeholder scan:** no TBD or TODO. Both borrowed signatures were verified against the source rather than assumed: `validateAvatar` returns `{ ok: true; mimeType } | { ok: false; error }`, which Task 7 uses as written, and `StatusChip` takes `tone` plus children rather than a `label` prop, which Task 8 now matches.

**Type consistency:** `OrganizationProfileValues` and `FacilityValues` (Task 3) are the parameter types of `createOrganizationProfile` and `createFacility` (Task 4). `FacilityInput` transforms `pesos` into `basePriceCents`, which is the field name the store writes and the schema column. `hostState()` returns `orgId`, which Task 7's action passes to `createFacility`. `wizardStep()`'s `WizardStep` is the `Stepper`'s `current` prop. `StepState` is shared by all three actions, so `fieldErrors()` produces one shape every form reads.
