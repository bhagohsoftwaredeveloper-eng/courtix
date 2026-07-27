import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { SPORTS } from "@/lib/data/sports";

const COLUMNS = [
  {
    title: "Play",
    links: [
      { href: "/courts", label: "Find a court" },
      { href: "/open-plays", label: "Open plays" },
      { href: "/account", label: "Your home" },
      { href: "/sports", label: "All sports" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Host",
    links: [
      { href: "/list-your-court", label: "List your court" },
      { href: "/owner", label: "Owner dashboard" },
      { href: "/admin", label: "Platform admin" },
      { href: "/app", label: "Mobile app" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line-white/8 pt-14 pb-10">
      <div className="shell">
        <div className="grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark height={22} />
            <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-muted">
              Every sport, every court, one booking. Courtix lists bookable courts across Davao del
              Norte and Davao del Sur — with live availability instead of a group chat.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 font-mono text-[11px] tracking-[0.1em] text-ball-yellow">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-muted transition-colors hover:text-line-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-4 font-mono text-[11px] tracking-[0.1em] text-ball-yellow">Sports</h3>
            <ul className="flex flex-col gap-2.5">
              {SPORTS.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/sports/${s.slug}`}
                    className="text-[13px] text-muted transition-colors hover:text-line-white"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-white/8 pt-7">
          <p className="text-[12.5px] text-muted">
            © 2026 Courtix. Every court, one booking.
          </p>
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted/70">
            Prototype build — sample data and imagery
          </p>
        </div>
      </div>
    </footer>
  );
}
