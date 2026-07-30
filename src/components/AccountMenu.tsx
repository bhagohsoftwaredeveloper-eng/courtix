"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/(site)/login/actions";
import { initialsOf } from "@/lib/format";

export function AccountMenu({
  account,
}: {
  /** `href` is the signed-in role's own dashboard, from `homeFor()`. */
  account: { name: string; email: string; href: string };
}) {
  // Dashboard follows the role: an owner lands on /owner and an admin on
  // /admin, not on the player account page. Edit Profile is deliberately fixed
  // — /account/* is guarded by requireUser(), so it is shared by every role.
  const items = [
    { href: account.href, label: "Dashboard" },
    { href: "/account/profile", label: "Edit Profile" },
  ];

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Navigating away must not leave the menu hanging open over the new page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-label={`Account menu for ${account.name}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line-white/20 bg-card font-mono text-[12px] font-semibold text-ball-yellow"
      >
        {initialsOf(account.name)}
      </button>

      {open && (
        // Implemented as a disclosure (expandable region of navigation links) rather than
        // role="menu", which would promise arrow-key navigation and other menu semantics
        // that this component does not implement. WAI-ARIA APG recommends disclosure
        // pattern for navigation dropdowns.
        <div
          id="account-menu-panel"
          className="absolute right-0 top-11 z-[110] w-[260px] overflow-hidden rounded-[14px] border border-line-white/12 bg-court-deep shadow-2xl"
        >
          <div className="border-b border-line-white/8 px-4 py-3.5">
            <p className="truncate text-[13.5px] font-semibold text-line-white">{account.name}</p>
            <p className="truncate text-[11.5px] text-muted">{account.email}</p>
          </div>

          <div className="py-1.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-card hover:text-line-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <form action={logoutAction} className="border-t border-line-white/8">
            <button
              type="submit"
              className="w-full px-4 py-3 text-left text-[13px] font-bold text-[#ff6b6b] transition-colors hover:bg-card"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
