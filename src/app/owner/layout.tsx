import type { Metadata } from "next";
import { DashSidebar, type NavItem } from "@/components/dashboard/DashSidebar";

export const metadata: Metadata = {
  title: { default: "Owner dashboard", template: "%s · Courtix Owner" },
  robots: { index: false },
};

const NAV: NavItem[] = [
  { href: "/owner", label: "Dashboard", icon: "▤" },
  { href: "/owner/bookings", label: "Bookings", icon: "📅" },
  { href: "/owner/courts", label: "My courts", icon: "◆" },
  { href: "/owner/players", label: "Players", icon: "☺" },
  { href: "/owner/payouts", label: "Payouts", icon: "₱" },
  { href: "/owner/reports", label: "Reports", icon: "▦" },
  { href: "/owner/settings", label: "Settings", icon: "⚙" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar role="Owner · Kitchen Line Club" items={NAV} />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
