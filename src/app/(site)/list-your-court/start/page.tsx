import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Become a host", robots: { index: false } };

// Replaced by the wizard in Task 5. Until then the route sends visitors to the
// marketing page rather than rendering a form whose action has been removed.
export default function BecomeHostPage() {
  redirect("/list-your-court");
}
