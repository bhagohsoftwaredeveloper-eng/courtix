/** Display formatting helpers. All money is PHP. */

export function peso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

/** 14 -> "2:00 PM". Accepts 24 (midnight close) and wraps it to 12:00 AM. */
export function hourLabel(hour: number): string {
  const h24 = ((hour % 24) + 24) % 24;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:00 ${h24 < 12 ? "AM" : "PM"}`;
}

/** 14 -> "2 PM". Compact variant for tight cells like opening-hours ranges. */
export function hourShort(hour: number): string {
  const h24 = ((hour % 24) + 24) % 24;
  const h = ((h24 + 11) % 12) + 1;
  return `${h} ${h24 < 12 ? "AM" : "PM"}`;
}

/** 14, 2 -> "2:00 PM – 4:00 PM" */
export function rangeLabel(startHour: number, hours: number): string {
  return `${hourLabel(startHour)} – ${hourLabel(startHour + hours)}`;
}

/** "2026-07-25" -> "Sat, Jul 25" */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-07-25" -> "Saturday, 25 July 2026" */
export function dateLabelLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short weekday + day-of-month, for the date strip chips. */
export function chipParts(iso: string): { weekday: string; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: dt.toLocaleDateString("en-PH", { weekday: "short", timeZone: "UTC" }),
    day: d,
  };
}

/**
 * "Rex I.T Support" -> "RI". Two words in, two letters out; a single word
 * gives up its first two. Used by the avatar in the nav and the sidebar.
 */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
