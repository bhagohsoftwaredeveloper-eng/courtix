"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function DashSidebar({
  role,
  items,
}: {
  role: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        // The index route would otherwise match every child path.
        const active =
          pathname === item.href || (item.href !== items[0].href && pathname.startsWith(item.href));
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
    </nav>
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
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            {role}
          </p>
          {links}
          <Link href="/" className="mt-3 block text-[12.5px] font-bold text-ball-yellow">
            ← Back to site
          </Link>
        </div>
      )}

      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col border-r border-line-white/8 bg-court-deep px-4 py-6 lg:flex">
        <div className="px-2 pb-6">
          <Logo size={20} />
        </div>
        <p className="px-2 pb-3.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
          {role}
        </p>
        {links}
        <Link
          href="/"
          className="mt-auto px-3 py-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ball-yellow"
        >
          ← Back to site
        </Link>
      </aside>
    </>
  );
}
