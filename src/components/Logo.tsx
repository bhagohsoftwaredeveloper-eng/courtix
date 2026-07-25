import Link from "next/link";

export function Logo({ size = 22, href = "/" }: { size?: number; href?: string | null }) {
  const inner = (
    <span
      className="font-display uppercase tracking-[-0.02em] inline-flex items-center gap-2.5"
      style={{ fontSize: size }}
    >
      <span
        className="bg-ball-yellow inline-block rotate-45 rounded-[2px]"
        style={{ width: size * 0.5, height: size * 0.5 }}
        aria-hidden
      />
      Courtix
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} aria-label="Courtix home">
      {inner}
    </Link>
  );
}
