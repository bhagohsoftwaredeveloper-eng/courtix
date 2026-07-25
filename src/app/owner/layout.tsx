import type { Metadata } from "next";
import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export const metadata: Metadata = {
  title: { default: "Owner dashboard", template: "%s · Courtix Owner" },
  robots: { index: false },
};

const NAV: NavSection[] = [
  {
    items: [
      { href: "/owner", label: "Dashboard", icon: "▤" },
      { href: "/owner/bookings", label: "Bookings", icon: "📅" },
      { href: "/owner/courts", label: "My courts", icon: "◆" },
      { href: "/owner/players", label: "Players", icon: "☺" },
      { href: "/owner/payouts", label: "Payouts", icon: "₱" },
      { href: "/owner/reports", label: "Reports", icon: "▦" },
      { href: "/owner/settings", label: "Settings", icon: "⚙" },
    ],
  },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("OWNER");

  // The sidebar names the facility this owner actually manages.
  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    // An owner can belong to several orgs; order so the sidebar name is stable
    // between requests. Choosing among them properly is a later-phase concern.
    orderBy: { orgId: "asc" },
    select: { org: { select: { name: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Owner"
        subtitle={membership?.org.name ?? "No facility yet"}
        sections={NAV}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
