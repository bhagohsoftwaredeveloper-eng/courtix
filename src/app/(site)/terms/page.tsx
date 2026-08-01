import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The agreement between Courtix, the players who book, and the courts we list.",
  robots: { index: false },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "The agreement",
    covers:
      "Who the contract is between, and the fact that Courtix is a booking platform — the court time itself is supplied by the host, not by us.",
  },
  {
    heading: "Accounts",
    covers:
      "Eligibility and age, accuracy of the details you give, responsibility for what happens under your login, and the grounds for suspending an account.",
  },
  {
    heading: "Bookings and payment",
    covers:
      "When a booking becomes binding, the service fee added at checkout, accepted payment methods, and what happens to a held booking that is never paid.",
  },
  {
    heading: "Cancellations, refunds and no-shows",
    covers:
      "The cancellation window and who sets it, how refunds are calculated and paid, and the consequences of repeated no-shows.",
  },
  {
    heading: "Host obligations",
    covers:
      "What a listed court must provide, the accuracy of listings and pricing, commission, and the payout schedule.",
  },
  {
    heading: "Conduct and safety",
    covers:
      "Expected behaviour at venues and in open plays, and that players use facilities at their own risk.",
  },
  {
    heading: "Liability",
    covers:
      "The limits of Courtix's liability for injury, property damage, cancelled sessions and platform downtime, and what cannot be limited under Philippine law.",
  },
  {
    heading: "Disputes",
    covers:
      "The support process, response times, and the governing law and venue for anything that cannot be resolved there.",
  },
  {
    heading: "Changes to these terms",
    covers: "Notice given before changes take effect, and their effect on existing bookings.",
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & conditions"
      intro="The rules for booking a court through Courtix, and for listing one."
      sections={SECTIONS}
    />
  );
}
