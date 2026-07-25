"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/courts", label: "Find a court" },
  { href: "/open-plays", label: "Open plays" },
  { href: "/sports", label: "Sports" },
  { href: "/list-your-court", label: "List your court" },
];

export function SiteNav({
  account,
}: {
  account: { name: string; email: string; href: string } | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation closes the mobile sheet — without this it stays open
  // over the new page after a link tap.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav className="sticky top-0 z-[100] border-b border-line-white/8 bg-court-deep/86 backdrop-blur-[10px]">
      <div className="shell flex h-[76px] items-center justify-between">
        <Logo />

        <div className="hidden gap-9 text-sm font-semibold text-muted lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname.startsWith(l.href)
                  ? "text-line-white"
                  : "transition-colors hover:text-line-white"
              }
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {account ? (
            <AccountMenu account={account} />
          ) : (
            <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link href="/courts" className="btn btn-solid">
            Book a court
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-white/20 lg:hidden"
          >
            <span className="relative block h-[11px] w-4">
              <span
                className={`absolute left-0 block h-0.5 w-4 bg-line-white transition-transform ${
                  open ? "top-[5px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-4 bg-line-white transition-transform ${
                  open ? "top-[5px] -rotate-45" : "top-[9px]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line-white/8 bg-court-deep lg:hidden">
          <div className="shell flex flex-col gap-1 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-3 text-[15px] font-semibold text-muted hover:bg-card hover:text-line-white"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={account ? account.href : "/login"}
              className="rounded-lg px-3 py-3 text-[15px] font-semibold text-muted hover:bg-card hover:text-line-white sm:hidden"
            >
              {account ? account.name.split(" ")[0] : "Sign in"}
            </Link>
            <Link href="/waitlist" className="btn btn-solid mt-2 w-full">
              Join the waitlist
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
