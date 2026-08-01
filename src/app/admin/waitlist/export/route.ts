import { requirePlatformRole } from "@/lib/server/auth";
import { getStorage } from "@/lib/server/storage";
import { waitlistCsv } from "@/lib/waitlist";

/**
 * The admin waitlist download. Built server-side because the alternative —
 * serialising every entry into the client bundle for the browser to format —
 * would put the whole list's names, emails and phone numbers in the page source.
 *
 * Route handlers do not run `admin/layout.tsx`, so the role gate is explicit.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  await requirePlatformRole("ADMIN", "SUPER_ADMIN");

  const entries = await getStorage().listWaitlist();
  const today = new Date().toISOString().slice(0, 10);

  return new Response(waitlistCsv(entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="courtix-waitlist-${today}.csv"`,
    },
  });
}
