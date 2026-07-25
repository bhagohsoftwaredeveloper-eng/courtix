"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/(site)/login/actions";
import { Logo } from "@/components/Logo";
import { initialsOf } from "@/lib/format";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** A titled group of links. Owner and admin pass one group with no title. */
export interface NavSection {
  title?: string;
  items: NavItem[];
}

export function DashSidebar({
  role,
  subtitle,
  sections,
  user,
}: {
  /** Short badge text: "Player", "Owner", "Super Admin". */
  role: string;
  /** Secondary line under the badge — the owner's organization. */
  subtitle?: string;
  sections: NavSection[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The first link of the first section is an index route; without this it
  // would match every child path and light up permanently.
  const indexHref = sections[0]?.items[0]?.href;

  const nav = (
    <nav className="flex flex-col gap-5">
      {sections.map((section, i) => (
        <div key={section.title ?? `section-${i}`}>
          {section.title && (
            <p className="mb-2 px-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
              {section.title}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href || (item.href !== indexHref && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                    active ? "bg-card text-line-white" : "text-muted hover:text-line-white"
                  }`}
                >
                  <span className="w-4 text-center" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const identity = (
    <div className="mb-5 flex items-center gap-3 px-2">
      <span
        aria-hidden
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-card font-mono text-[13px] font-semibold text-ball-yellow"
      >
        {initialsOf(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-line-white">{user.name}</p>
        <p className="truncate text-[11px] text-muted">{user.email}</p>
        <span className="mt-1 inline-block rounded-full bg-court-green px-2 py-0.5 text-[10px] font-bold text-ball-yellow">
          {role}
        </span>
        {subtitle && <p className="mt-1 truncate text-[11px] text-muted">{subtitle}</p>}
      </div>
    </div>
  );

  const account = (
    <div className="border-t border-line-white/8 pt-3">
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-[10px] px-3 py-2 text-left text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
        >
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* mobile bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-line-white/8 bg-court-deep px-4 py-3.5 lg:hidden">
        <Logo size={17} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-lg border border-line-white/20 px-3 py-1.5 text-[12px] font-bold"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="border-b border-line-white/8 bg-court-deep px-4 py-4 lg:hidden">
          {identity}
          {nav}
          <Link href="/" className="mt-3 mb-3 block text-[12.5px] font-bold text-ball-yellow">
            ← Back to site
          </Link>
          {account}
        </div>
      )}

      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col overflow-y-auto border-r border-line-white/8 bg-court-deep px-4 py-6 lg:flex">
        <div className="px-2 pb-6">
          <Logo size={20} />
        </div>
        {identity}
        {nav}
        <div className="mt-auto pt-6">
          <Link
            href="/"
            className="block px-3 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
          >
            ← Back to site
          </Link>
          {account}
        </div>
      </aside>
    </>
  );
}
