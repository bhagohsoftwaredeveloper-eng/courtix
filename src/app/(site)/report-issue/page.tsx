import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IssueForm } from "@/app/(site)/report-issue/IssueForm";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Report an issue",
  description: "Tell the Courtix support team what went wrong with a booking or the platform.",
};

export const dynamic = "force-dynamic";

export default async function ReportIssuePage() {
  // A report has to attach to an account — support needs someone to reply to,
  // and the booking-reference check is scoped to the signed-in player.
  const user = await getSession();
  if (!user) redirect("/login?next=/report-issue");

  return (
    <div className="shell flex max-w-[560px] flex-col py-20">
      <p className="eyebrow mb-4">Support</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Report an issue</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted">
        Court not as described, a charge you didn&apos;t expect, or something broken on the site —
        tell us here and it goes straight to the support queue.
      </p>
      <IssueForm />
    </div>
  );
}
