import { DashHeader, KpiRow, Panel, Row, RowList, StatusChip } from "@/components/dashboard/parts";
import { ADMIN_DISPUTES } from "@/lib/data/dashboard";

export const metadata = { title: "Disputes" };

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

export default function AdminDisputesPage() {
  return (
    <>
      <DashHeader title="Disputes" sub="Refunds, no-shows, and damage claims" />

      <KpiRow
        items={[
          { label: "Open", value: "6", delta: "2 over SLA", warn: true },
          { label: "Resolved (30d)", value: "41" },
          { label: "Avg. resolution", value: "26h" },
          { label: "Refunded (30d)", value: "₱18,240" },
        ]}
      />

      <div className="grid gap-[18px] xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Active disputes">
          <RowList>
            {ADMIN_DISPUTES.map((d) => (
              <Row
                key={d.sub}
                label={<span className="font-semibold">{d.label}</span>}
                sub={d.sub}
                right={
                  <div className="flex items-center gap-3">
                    <StatusChip tone={d.tone}>{d.state}</StatusChip>
                    <button className="rounded-lg border border-line-white/18 px-3 py-1.5 text-[11px] font-bold">
                      Open
                    </button>
                  </div>
                }
              />
            ))}
            {[
              { label: "Damage claim", sub: "Hoop House Davao · CTX-3QT7ZB", tone: "pending" as const, state: "Open" },
              { label: "Refund request", sub: "Tee Line Driving Range · CTX-8CD2WM", tone: "pending" as const, state: "Open" },
              { label: "No-show claim", sub: "Sunrise Courts · CTX-1XY9RK", tone: "booked" as const, state: "Over SLA" },
            ].map((d) => (
              <Row
                key={d.sub}
                label={<span className="font-semibold">{d.label}</span>}
                sub={d.sub}
                right={
                  <div className="flex items-center gap-3">
                    <StatusChip tone={d.tone}>{d.state}</StatusChip>
                    <button className="rounded-lg border border-line-white/18 px-3 py-1.5 text-[11px] font-bold">
                      Open
                    </button>
                  </div>
                }
              />
            ))}
          </RowList>
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
