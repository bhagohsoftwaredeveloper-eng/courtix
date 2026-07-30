import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "The cookies Courtix sets, what each one does, and how to control them.",
  robots: { index: false },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "What cookies we set",
    covers:
      "Today there is exactly one: `courtix_session`, an httpOnly cookie holding an opaque session token. It is strictly necessary — without it you cannot stay signed in. List any analytics or marketing cookies here as they are added.",
  },
  {
    heading: "How long each one lasts",
    covers:
      "The session cookie lasts 30 days when 'Keep me signed in' is ticked and 1 day when it isn't, matching the session row in the database.",
  },
  {
    heading: "Third-party cookies",
    covers:
      "Any cookie set by the payment provider during checkout, or by an embedded map or video, and what it is for.",
  },
  {
    heading: "Managing cookies",
    covers:
      "How to clear or block cookies in the browser, and what stops working when the session cookie is blocked.",
  },
  {
    heading: "Consent",
    covers:
      "Whether a consent banner is required. Strictly necessary cookies generally do not need consent; anything added for analytics or advertising will.",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie policy"
      intro="Courtix sets one cookie today. This page explains what it does and how to control it."
      sections={SECTIONS}
    />
  );
}
