import { z } from "zod";

/** The DisputeType values a player is allowed to pick from the support form.
 *  DOUBLE_BOOKING and DAMAGE are raised by hosts and admins, not here. */
export const ISSUE_TYPES = [
  { value: "REFUND_REQUEST", label: "Refund request" },
  { value: "NO_SHOW", label: "Court or host was a no-show" },
  { value: "OTHER", label: "Something else" },
] as const;

export const IssueInput = z.object({
  type: z.enum(["REFUND_REQUEST", "NO_SHOW", "OTHER"], {
    errorMap: () => ({ message: "Pick what the issue is about" }),
  }),
  /** A booking reference like "CTX-8F31A2", or blank for a platform issue. */
  bookingRef: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^CTX-[A-Z0-9]{6}$/.test(v), "A reference looks like CTX-8F31A2"),
  body: z
    .string()
    .trim()
    .min(20, "Tell us what happened — at least 20 characters")
    .max(2000, "Keep it under 2,000 characters"),
});

export type IssueInputValues = z.infer<typeof IssueInput>;
