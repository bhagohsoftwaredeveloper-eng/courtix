import type { Metadata } from "next";

import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s · Courtix" },
  robots: { index: false },
};

// Only links whose pages exist in this chunk. Bookings, wallet, notifications
// and the support/legal group arrive with chunks B, C and D.
const NAV: NavSection[] = [
  {
    title: "Your account",
    items: [
      { href: "/account", label: "Player Dashboard", icon: "☺" },
      { href: "/account/profile", label: "Edit Profile", icon: "✎" },
    ],
  },
  {
    title: "Quick actions",
    items: [
      { href: "/courts", label: "Book a Court", icon: "◆" },
      { href: "/open-plays", label: "Join Open Play", icon: "☰" },
    ],
  },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar role="Player" sections={NAV} user={{ name: user.name, email: user.email }} />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
