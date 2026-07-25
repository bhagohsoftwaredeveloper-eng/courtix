import { z } from "zod";

/** Shared by the form and the action, so the error a player sees is the error
 *  the server would produce. The action re-validates regardless. */
export const ProfileInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^09\d{9}$/.test(v), "Use an 11-digit mobile number starting 09"),
  homeCityId: z.string().trim(),
  skill: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  rating: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 8), "Rating must be between 1.00 and 8.00"),
  sportIds: z.array(z.string()),
});

export type ProfileInputValues = z.infer<typeof ProfileInput>;
