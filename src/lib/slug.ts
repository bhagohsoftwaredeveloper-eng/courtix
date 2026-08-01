/**
 * URL segment from a human name — "Kitchen Line Club" to "kitchen-line-club".
 *
 * Pure and dependency-free so it can be unit-tested directly. Returns "" when
 * the input has no alphanumeric characters at all; callers must supply a
 * fallback rather than writing an empty slug.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Strip the combining marks NFKD split off, so "é" becomes "e".
      // Written as escapes, not literal marks, so the source stays legible.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      // The slice can land mid-separator and leave a trailing hyphen.
      .replace(/-+$/g, "")
  );
}
