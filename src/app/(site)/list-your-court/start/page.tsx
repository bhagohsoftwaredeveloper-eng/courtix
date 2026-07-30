import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrganizationForm } from "@/app/(site)/list-your-court/start/OrganizationForm";
import { getSession } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Become a host",
  robots: { index: false },
};

export default async function BecomeHostPage() {
  // Middleware only checks that a cookie exists, so the real gate is here.
  const user = await getSession();
  if (!user) redirect("/login?next=/list-your-court/start");
  // Already hosting — the owner dashboard is where they wanted to go.
  if (user.isOwner) redirect("/owner");

  return (
    <div className="shell flex max-w-[520px] flex-col py-20">
      <p className="eyebrow mb-4">List your court</p>
      <h1 className="mb-2 text-[32px] leading-[1.05]">Become a host</h1>
      <p className="mb-8 text-[14px] text-muted">
        Tell us about your business and we&apos;ll open your host dashboard. You keep your
        player account — the same login gets you both.
      </p>

      <OrganizationForm />
    </div>
  );
}
