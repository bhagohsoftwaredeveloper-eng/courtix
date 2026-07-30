import type { Metadata } from "next";
import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { requirePlatformRole } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Platform admin", template: "%s · Courtix Admin" },
  robots: { index: false },
};

const NAV: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: "▤" },
      { href: "/admin/facilities", label: "Facilities", icon: "◆" },
      { href: "/admin/users", label: "Users", icon: "☺" },
      { href: "/admin/approvals", label: "Approvals", icon: "✓" },
      { href: "/admin/waitlist", label: "Waitlist", icon: "☰" },
      { href: "/admin/payouts", label: "Commission", icon: "₱" },
      { href: "/admin/disputes", label: "Disputes", icon: "⚑" },
      { href: "/admin/settings", label: "Platform settings", icon: "⚙" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformRole("ADMIN", "SUPER_ADMIN");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Super Admin"
        subtitle="Platform"
        sections={NAV}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
