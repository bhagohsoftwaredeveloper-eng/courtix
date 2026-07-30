import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Courtix collects, uses and protects your personal data.",
  robots: { index: false },
};

// Derived from what the app actually does today: accounts, bookings, payments,
// the launch waitlist, and profile photos stored in the database.
const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    covers:
      "The registered business operating Courtix, its address, and the contact details of the person accountable for personal data under the Data Privacy Act.",
  },
  {
    heading: "What we collect",
    covers:
      "Account details (name, email, mobile, password hash), player profile (skill, DUPR rating and ID, gender, home city, favourite sports, uploaded photo), booking and open-play records, payment records held via the payment provider, waitlist signups, and session cookies.",
  },
  {
    heading: "Why we collect it",
    covers:
      "The lawful basis for each purpose: fulfilling a booking, taking payment, letting hosts identify who is arriving, telling waitlist members when their city opens, and keeping the platform secure.",
  },
  {
    heading: "Who we share it with",
    covers:
      "Court owners receive the contact details attached to bookings at their venue. Name the payment processor, the hosting provider, and any analytics or email service, and say what each one receives.",
  },
  {
    heading: "How long we keep it",
    covers:
      "Retention periods per record type, and what happens to bookings and payment records after an account is deleted.",
  },
  {
    heading: "Your rights",
    covers:
      "The Data Privacy Act rights — access, correction, erasure, objection, portability and complaint to the National Privacy Commission — and how to exercise each one.",
  },
  {
    heading: "Security",
    covers:
      "How data is protected in transit and at rest, how passwords are stored, and the breach-notification process.",
  },
  {
    heading: "Changes to this policy",
    covers: "How changes are announced and when they take effect.",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      intro="What Courtix collects about you, why, who sees it, and what you can ask us to do with it."
      sections={SECTIONS}
    />
  );
}
