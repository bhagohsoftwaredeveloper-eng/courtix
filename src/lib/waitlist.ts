import type { SportSlug, WaitlistEntry, WaitlistRole } from "@/lib/types";

/**
 * Pure waitlist helpers. This module deliberately imports neither `server-only`
 * nor `@prisma/client`, so the mapping and the CSV escaping can be unit-tested
 * without a database — see `tests/waitlist.test.ts`.
 */

/** The DB enum values, as the `WaitlistRole` enum in prisma/schema.prisma spells them. */
export type WaitlistRoleDb = "PLAYER" | "OWNER" | "BOTH";

/**
 * Structural shape of a `WaitlistEntry` row loaded with its sport join rows.
 * Declared by hand rather than derived from Prisma so this file stays free of
 * the client import.
 */
export interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cityText: string;
  role: WaitlistRoleDb;
  notes: string | null;
  position: number;
  createdAt: Date;
  sports: { sportId: string }[];
}

export const ROLE_TO_DB: Record<WaitlistRole, WaitlistRoleDb> = {
  player: "PLAYER",
  owner: "OWNER",
  both: "BOTH",
};

const ROLE_FROM_DB: Record<WaitlistRoleDb, WaitlistRole> = {
  PLAYER: "player",
  OWNER: "owner",
  BOTH: "both",
};

/**
 * A database row as the rest of the app already expects it: the free-text city
 * rather than the linked one, lowercase role, sport slugs, ISO timestamp.
 * Nullable columns become `undefined` because `WaitlistEntry` marks them
 * optional, and `null` would render as the word "null".
 */
export function toWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    city: row.cityText,
    role: ROLE_FROM_DB[row.role],
    sports: row.sports.map((s) => s.sportId as SportSlug),
    notes: row.notes ?? undefined,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

const CSV_HEADERS = [
  "Position",
  "Name",
  "Email",
  "Phone",
  "City",
  "Role",
  "Sports",
  "Notes",
  "Joined",
];

/**
 * RFC 4180 CSV, CRLF-delimited, for the admin export.
 *
 * `notes` is free text a stranger typed, so it drives both escaping rules here:
 * quoting for commas/quotes/newlines, and the leading apostrophe on anything
 * starting with a formula character — otherwise opening the download in Excel
 * would execute it.
 */
export function waitlistCsv(entries: WaitlistEntry[]): string {
  const rows = entries.map((e) => [
    String(e.position),
    e.name,
    e.email,
    e.phone ?? "",
    e.city,
    e.role,
    e.sports.join("; "),
    e.notes ?? "",
    e.createdAt,
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string): string {
  const defused = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(defused) ? `"${defused.replace(/"/g, '""')}"` : defused;
}
