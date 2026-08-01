import { DashHeader, KpiRow, Panel, Row, RowList, StatusChip } from "@/components/dashboard/parts";
import { dateLabel } from "@/lib/format";
import { db } from "@/lib/server/db";

export const metadata = { title: "Disputes" };

// Reads live rows filed by the report form, so it must not be prerendered.
export const dynamic = "force-dynamic";

const POLICY = [
  {
    t: "Refund requests",
    b: "Cancellations outside the 12-hour window are automatic. Inside it, we side with the host unless the venue was unusable — wrong surface, no lighting, locked gate.",
  },
  {
    t: "No-show claims",
    b: "Hosts must report within 24 hours with a timestamped photo of the empty court. Confirmed no-shows forfeit the booking; three in 30 days suspends the player.",
  },
  {
    t: "Double bookings",
    b: "Always the platform's fault, always refunded in full plus a free booking. Root-caused within 48 hours — a double booking means a constraint failed.",
  },
];

const TYPE_LABEL: Record<string, string> = {
  REFUND_REQUEST: "Refund request",
  NO_SHOW: "No-show claim",
  DAMAGE: "Damage claim",
  DOUBLE_BOOKING: "Double booking",
  OTHER: "Support request",
};

const OPEN_STATUSES = ["OPEN", "IN_REVIEW", "ESCALATED"] as const;

export default async function AdminDisputesPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [active, openCount, resolvedCount] = await Promise.all([
    db.dispute.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      orderBy: [{ slaDueAt: "asc" }, { createdAt: "desc" }],
      take: 25,
      include: {
        booking: { select: { ref: true } },
        facility: { select: { name: true } },
        raisedBy: { select: { name: true } },
      },
    }),
    db.dispute.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
    db.dispute.count({ where: { status: "RESOLVED", resolvedAt: { gte: thirtyDaysAgo } } }),
  ]);

  const overSla = active.filter((d) => d.slaDueAt !== null && d.slaDueAt < now).length;

  return (
    <>
      <DashHeader title="Disputes" sub="Refunds, no-shows, damage claims and support reports" />

      <KpiRow
        items={[
          {
            label: "Open",
            value: String(openCount),
            delta: overSla > 0 ? `${overSla} over SLA` : undefined,
            warn: overSla > 0,
          },
          { label: "Resolved (30d)", value: String(resolvedCount) },
          { label: "Showing", value: String(active.length) },
          {
            label: "Platform-wide",
            value: String(active.filter((d) => d.facilityId === null).length),
          },
        ]}
      />

      <div className="grid gap-[18px] xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Active disputes">
          {active.length === 0 ? (
            <p className="py-6 text-[13px] leading-relaxed text-muted">
              Nothing open. Reports filed from{" "}
              <span className="text-line-white">/report-issue</span> land here immediately.
            </p>
          ) : (
            <RowList>
              {active.map((d) => {
                // A report with no facility is about the platform itself, not a
                // venue — say so rather than leaving the line blank.
                const where = d.facility?.name ?? "Platform";
                const ref = d.booking?.ref;
                const late = d.slaDueAt !== null && d.slaDueAt < now;

                return (
                  <Row
                    key={d.id}
                    label={
                      <span className="font-semibold">
                        {TYPE_LABEL[d.type] ?? d.type}
                      </span>
                    }
                    sub={`${where}${ref ? ` · ${ref}` : ""} · ${d.raisedBy.name} · ${dateLabel(
                      d.createdAt.toISOString().slice(0, 10),
                    )}`}
                    right={
                      <div className="flex items-center gap-3">
                        <StatusChip tone={late ? "booked" : "pending"}>
                          {late ? "Over SLA" : d.status.replace("_", " ").toLowerCase()}
                        </StatusChip>
                      </div>
                    }
                  />
                );
              })}
            </RowList>
          )}
        </Panel>

        <Panel title="Resolution policy">
          <div className="flex flex-col gap-5">
            {POLICY.map((p) => (
              <div key={p.t}>
                <h3 className="mb-1.5 font-sans text-[13.5px] font-extrabold normal-case tracking-normal">
                  {p.t}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-muted">{p.b}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
