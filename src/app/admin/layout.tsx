import type { Metadata } from "next";
import { DashSidebar, type NavItem } from "@/components/dashboard/DashSidebar";

export const metadata: Metadata = {
  title: { default: "Platform admin", template: "%s · Courtix Admin" },
  robots: { index: false },
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "▤" },
  { href: "/admin/facilities", label: "Facilities", icon: "◆" },
  { href: "/admin/users", label: "Users", icon: "☺" },
  { href: "/admin/approvals", label: "Approvals", icon: "✓" },
  { href: "/admin/waitlist", label: "Waitlist", icon: "☰" },
  { href: "/admin/payouts", label: "Commission", icon: "₱" },
  { href: "/admin/disputes", label: "Disputes", icon: "⚑" },
  { href: "/admin/settings", label: "Platform settings", icon: "⚙" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar role="Super Admin · Platform" items={NAV} />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
