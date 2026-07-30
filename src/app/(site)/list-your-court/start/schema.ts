import { z } from "zod";

/** Shared by the form and the action, so the error a host sees is the error the
 *  server would produce. The action re-validates regardless. */
export const OrganizationInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your business name")
    .max(120, "That name is too long"),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Same rule as the player profile, so a host who plays sees one format.
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^09\d{9}$/.test(v), "Use an 11-digit mobile number starting 09"),
});

export type OrganizationInputValues = z.infer<typeof OrganizationInput>;
