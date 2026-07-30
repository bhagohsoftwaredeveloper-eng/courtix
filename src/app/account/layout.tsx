import type { Metadata } from "next";

import { DashSidebar, type NavSection } from "@/components/dashboard/DashSidebar";
import { portalsFor } from "@/lib/auth-routes";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s · Courtix" },
  robots: { index: false },
};

const NAV: NavSection[] = [
  {
    title: "Your account",
    items: [
      { href: "/account", label: "Player Dashboard", icon: "☺" },
      { href: "/account/profile", label: "Edit Profile", icon: "✎" },
      { href: "/account/bookings", label: "My Bookings", icon: "▤" },
      { href: "/account/open-plays", label: "My Open Plays", icon: "☰" },
    ],
  },
  {
    title: "Quick actions",
    items: [
      { href: "/courts", label: "Book a Court", icon: "◆" },
      { href: "/open-plays", label: "Join Open Play", icon: "⚡" },
    ],
  },
  {
    title: "Support & legal",
    items: [
      { href: "/help", label: "Help", icon: "?" },
      { href: "/report-issue", label: "Report Issue", icon: "⚑" },
      { href: "/contact", label: "Contact Us", icon: "✉" },
      { href: "/privacy", label: "Privacy Policy", icon: "◇" },
      { href: "/terms", label: "Terms & Conditions", icon: "§" },
      { href: "/cookies", label: "Cookie Policy", icon: "◉" },
    ],
  },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <DashSidebar
        role="Player"
        sections={NAV}
        portals={portalsFor({ role: user.role, isOwner: user.isOwner, current: "player" })}
        user={{ name: user.name, email: user.email }}
      />
      <div className="min-w-0 flex-1 px-5 py-7 lg:px-8 lg:py-7">{children}</div>
    </div>
  );
}
