import type { Metadata } from "next";
import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { requireOwner } from "@/lib/server/auth";

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
  // requireOwner() is the gate and the lookup: it rejects non-owners and hands
  // back the organization the sidebar names.
  const { user, org } = await requireOwner();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Owner"
        subtitle={org.name}
        sections={NAV}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
