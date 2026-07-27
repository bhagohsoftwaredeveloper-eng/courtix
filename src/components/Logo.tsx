import Image from "next/image";
import Link from "next/link";

/** Intrinsic size of `public/courtix-wordmark.png`, so callers set a height and
 *  the width follows without the image ever being squashed. */
const WORDMARK_W = 5805;
const WORDMARK_H = 1092;

/**
 * The brand wordmark, for the public header and footer.
 *
 * The art is white on transparent, so it only reads on the dark surfaces the
 * public site uses. The dashboard rails keep the text `Logo` below.
 */
export function Wordmark({
  height = 24,
  href = "/",
  priority = false,
}: {
  height?: number;
  href?: string | null;
  /** Set on the header: it is above the fold on every page. */
  priority?: boolean;
}) {
  const image = (
    <Image
      src="/courtix-wordmark.png"
      alt={href === null ? "Courtix" : ""}
      width={Math.round((height * WORDMARK_W) / WORDMARK_H)}
      height={height}
      priority={priority}
      className="w-auto"
      style={{ height }}
    />
  );

  if (href === null) return image;
  return (
    <Link href={href} aria-label="Courtix home" className="inline-flex items-center">
      {image}
    </Link>
  );
}

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
