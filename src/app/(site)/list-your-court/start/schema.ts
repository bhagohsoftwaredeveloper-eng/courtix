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
