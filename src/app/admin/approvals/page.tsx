import { DashHeader, KpiRow, Panel, Row, RowList } from "@/components/dashboard/parts";
import { ADMIN_APPROVALS } from "@/lib/data/dashboard";

export const metadata = { title: "Approvals" };

const CHECKS = [
  "Business permit uploaded and legible",
  "At least 3 photos of the actual facility",
  "Opening hours and hourly rate set",
  "Payout account verified",
  "Contact number reachable",
];

export default function AdminApprovalsPage() {
  return (
    <>
      <DashHeader
        title="Approvals"
        sub={`${ADMIN_APPROVALS.length} facilities waiting for review`}
      />

      <KpiRow
        items={[
          { label: "Pending", value: String(ADMIN_APPROVALS.length), delta: "Needs review", warn: true },
          { label: "Approved this month", value: "9" },
          { label: "Declined this month", value: "2" },
          { label: "Avg. review time", value: "31h" },
        ]}
      />

      <div className="grid gap-[18px] xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Pending facilities">
          <RowList>
            {ADMIN_APPROVALS.map((a) => (
              <Row
                key={a.name}
                label={<span className="font-semibold">{a.name}</span>}
                sub={`${a.sub} · submitted ${a.submitted}`}
                right={
                  <div className="flex gap-1.5">
                    <button className="rounded-lg border border-ball-yellow bg-ball-yellow px-3 py-1.5 text-[11px] font-bold text-ink">
                      Approve
                    </button>
                    <button className="rounded-lg border border-line-white/18 px-3 py-1.5 text-[11px] font-bold">
                      Decline
                    </button>
                  </div>
                }
              />
            ))}
          </RowList>
        </Panel>

        <Panel title="Approval checklist">
          <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
            Every facility must clear all five before it goes live. Anything missing gets one
            follow-up email, then the application closes after 14 days.
          </p>
          <ul className="flex flex-col gap-3 text-[13px]">
            {CHECKS.map((c) => (
              <li key={c} className="flex gap-3">
                <span className="text-ball-yellow">✓</span>
                <span className="text-muted">{c}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
