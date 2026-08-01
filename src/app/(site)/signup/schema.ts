import { z } from "zod";

/** Shared by the form and the action, so the error a visitor sees is the error
 *  the server would produce. The action re-validates regardless. */
export const SignupInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Not trimmed: spaces are characters the user chose, and the hash must cover
  // exactly what they typed.
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SignupInputValues = z.infer<typeof SignupInput>;
