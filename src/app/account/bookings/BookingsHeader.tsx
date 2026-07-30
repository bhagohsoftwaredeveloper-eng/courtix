import Link from "next/link";

export type BookingsTab = "court" | "open-plays" | "tournaments";

const TABS: { id: BookingsTab; label: string; href: string | null }[] = [
  { id: "court", label: "Court Bookings", href: "/account/bookings" },
  { id: "open-plays", label: "Open Plays", href: "/account/open-plays" },
  // No href: Courtix has no tournament model yet, so there is nowhere to go.
  { id: "tournaments", label: "Tournaments", href: null },
];

/**
 * The banner and tab strip shared by the two booking pages.
 *
 * Tabs are links rather than client-side state so each view has its own URL —
 * a player can bookmark their open plays, and the sidebar's active-link
 * highlighting keeps working.
 */
export function BookingsHeader({
  active,
  counts,
}: {
  active: BookingsTab;
  counts: { court: number; openPlays: number };
}) {
  const tiles = [
    { label: "Court Bookings", value: counts.court },
    { label: "Open Plays", value: counts.openPlays },
    { label: "Tournaments", value: 0 },
  ];

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-[16px] border border-line-white/10 bg-court-deep px-6 py-6">
        <h1 className="mb-5 font-sans text-[22px] font-extrabold normal-case tracking-normal">
          My bookings
        </h1>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-[12px] border border-line-white/10 bg-card px-4 py-3.5">
              <p className="font-mono text-[22px] font-semibold">{t.value}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line-white/10">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const className = `whitespace-nowrap border-b-2 px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
            isActive
              ? "border-ball-yellow text-line-white"
              : "border-transparent text-muted hover:text-line-white"
          }`;

          if (!tab.href) {
            return (
              <span
                key={tab.id}
                aria-disabled
                title="Tournaments aren't built yet"
                className={`${className} cursor-not-allowed opacity-45 hover:text-muted`}
              >
                {tab.label}
                <span className="ml-2 rounded-full border border-line-white/20 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em]">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** Centred empty state: icon, headline, one line of copy, one way forward. */
export function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="rounded-[16px] border border-line-white/10 bg-card px-6 py-16 text-center">
      <span
        aria-hidden
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-court-deep text-[20px]"
      >
        {icon}
      </span>
      <p className="mb-1.5 font-sans text-[16px] font-extrabold normal-case tracking-normal">
        {title}
      </p>
      <p className="mx-auto mb-6 max-w-[380px] text-[13px] leading-relaxed text-muted">{body}</p>
      <Link href={cta.href} className="btn btn-solid">
        {cta.label}
      </Link>
    </div>
  );
}
