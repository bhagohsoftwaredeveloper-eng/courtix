import { z } from "zod";
import { SPORT_SLUGS } from "@/lib/data/sports";

/**
 * Schemas are shared by the client form and the API route, so the browser and
 * the server can never disagree about what "valid" means. The client uses them
 * for inline field errors; the route re-validates because client checks are a
 * convenience, never a guarantee.
 */

const phRegex = /^(\+63|0)9\d{9}$/;

export const waitlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell us your name")
    .max(80, "That name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("That doesn't look like a valid email"),
  phone: z
    .string()
    .trim()
    .regex(phRegex, "Use a PH mobile number, e.g. 09171234567")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().min(2, "Which city do you play in?").max(80),
  role: z.enum(["player", "owner", "both"], {
    errorMap: () => ({ message: "Pick how you'd use Courtix" }),
  }),
  sports: z
    .array(z.enum(SPORT_SLUGS as [string, ...string[]]))
    .min(1, "Pick at least one sport"),
  notes: z.string().trim().max(600, "Keep it under 600 characters").optional().or(z.literal("")),
  /**
   * Honeypot — real users never fill this, bots usually do. Deliberately
   * permissive: the route decides what to do with a filled value, and a
   * schema-level rejection here would 400 the bot instead of letting it
   * believe it succeeded.
   */
  website: z.string().max(200).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export const bookingSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  startHour: z.coerce.number().int().min(0).max(23),
  hours: z.coerce.number().int().min(1).max(6),
  /** Optional preferred court within the facility; omitted means auto-assign. */
  unitIndex: z.coerce.number().int().min(0).max(63).optional(),
  playerName: z.string().trim().min(2, "Tell us who's playing").max(80),
  playerEmail: z.string().trim().toLowerCase().email("We need a valid email for your receipt"),
  playerPhone: z
    .string()
    .trim()
    .regex(phRegex, "Use a PH mobile number, e.g. 09171234567"),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const joinOpenPlaySchema = z.object({
  openPlayId: z.string().min(1),
  playerName: z.string().trim().min(2, "Tell us who's joining").max(80),
  playerEmail: z.string().trim().toLowerCase().email("We need a valid email"),
  playerPhone: z
    .string()
    .trim()
    .regex(phRegex, "Use a PH mobile number, e.g. 09171234567"),
});

export type JoinOpenPlayInput = z.infer<typeof joinOpenPlaySchema>;

/** Flattens a ZodError into `{ fieldName: "first message" }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
