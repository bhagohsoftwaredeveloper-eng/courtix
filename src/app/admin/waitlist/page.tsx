import { DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";
import { sportName } from "@/lib/data/sports";
import { getStorage } from "@/lib/server/storage";
import type { SportSlug } from "@/lib/types";

export const metadata = { title: "Waitlist" };

// Reads live signups written by the CTA form, so it must not be prerendered.
export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const entries = (await getStorage().listWaitlist()).slice().reverse();

  const byCity = new Map<string, number>();
  const bySport = new Map<string, number>();
  let owners = 0;

  for (const e of entries) {
    byCity.set(e.city, (byCity.get(e.city) ?? 0) + 1);
    for (const s of e.sports) bySport.set(s, (bySport.get(s) ?? 0) + 1);
    if (e.role === "owner" || e.role === "both") owners++;
  }

  const topCities = [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topSports = [...bySport.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <DashHeader
        title="Waitlist"
        sub="Live signups from the CTA form — this is real stored data, not a mock"
        action={
          <a className="btn btn-ghost" href="/admin/waitlist/export">
            Export CSV
          </a>
        }
      />

      <KpiRow
        items={[
          { label: "Total signups", value: String(entries.length) },
          { label: "Court owners", value: String(owners) },
          { label: "Cities requested", value: String(byCity.size) },
          {
            label: "Top city",
            value: topCities[0]?.[0] ?? "—",
            delta: topCities[0] ? `${topCities[0][1]} signups` : undefined,
          },
        ]}
      />

      {entries.length === 0 ? (
        <Panel title="No signups yet">
          <p className="py-6 text-[13px] leading-relaxed text-muted">
            Nothing on the waitlist yet. Submit the form on the{" "}
            <span className="text-line-white">/waitlist</span> page and the entry lands here
            immediately — same storage layer, no seeding required.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-[18px] lg:grid-cols-2">
            <Panel title="Demand by city">
              <Table head={["City", "Signups", "Share"]}>
                {topCities.map(([city, n]) => (
                  <tr key={city}>
                    <Td>{city}</Td>
                    <Td mono>{n}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-[80px] overflow-hidden rounded-full bg-line-white/10">
                          <div
                            className="h-full rounded-full bg-ball-yellow"
                            style={{ width: `${(n / entries.length) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px]">
                          {Math.round((n / entries.length) * 100)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Panel>

            <Panel title="Demand by sport">
              <Table head={["Sport", "Signups"]}>
                {topSports.map(([slug, n]) => (
                  <tr key={slug}>
                    <Td>{sportName(slug as SportSlug)}</Td>
                    <Td mono>{n}</Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>

          <Panel title={`All signups (${entries.length})`}>
            <Table head={["#", "Name", "Email", "City", "Role", "Sports", "Joined"]}>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td mono>{e.position}</Td>
                  <Td>
                    {e.name}
                    {e.notes && (
                      <span
                        className="mt-0.5 line-clamp-2 block max-w-[260px] text-[10.5px] leading-snug text-muted"
                        title={e.notes}
                      >
                        {e.notes}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {e.email}
                    {e.phone && <span className="block text-[10.5px] text-muted">{e.phone}</span>}
                  </Td>
                  <Td>{e.city}</Td>
                  <Td>
                    <span
                      className={`status-chip ${
                        e.role === "player" ? "status-pending" : "status-open"
                      }`}
                    >
                      {e.role}
                    </span>
                  </Td>
                  <Td>{e.sports.map((s) => sportName(s)).join(", ")}</Td>
                  <Td mono>{new Date(e.createdAt).toLocaleDateString("en-PH")}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </>
      )}
    </>
  );
}
