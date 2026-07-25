import { BarChart, DashHeader, KpiRow, Panel, Row, RowList, Table, Td } from "@/components/dashboard/parts";
import { OWNER_WEEK } from "@/lib/data/dashboard";

export const metadata = { title: "Reports" };

const MONTHS = [
  { day: "Feb", pct: 44 },
  { day: "Mar", pct: 52 },
  { day: "Apr", pct: 61 },
  { day: "May", pct: 58 },
  { day: "Jun", pct: 79 },
  { day: "Jul", pct: 92 },
];

const BY_HOUR = [
  { h: "6–9 AM", pct: 71, label: "Morning regulars" },
  { h: "9 AM–12 PM", pct: 24, label: "Dead zone" },
  { h: "12–5 PM", pct: 31, label: "Dead zone" },
  { h: "5–9 PM", pct: 96, label: "Peak" },
  { h: "9–10 PM", pct: 58, label: "Late" },
];

export default function OwnerReportsPage() {
  return (
    <>
      <DashHeader
        title="Reports"
        sub="Utilisation and revenue across your courts"
        action={<button className="btn btn-ghost">Export PDF</button>}
      />

      <KpiRow
        items={[
          { label: "Revenue, 6 months", value: "₱212,940", delta: "↑ 34% vs. prior" },
          { label: "Best month", value: "July", delta: "₱45,680" },
          { label: "Peak utilisation", value: "96%", delta: "5–9 PM weekdays" },
          { label: "Weakest slot", value: "24%", delta: "9 AM–12 PM", warn: true },
        ]}
      />

      <div className="grid gap-[18px] xl:grid-cols-[1.3fr_1fr]">
        <div>
          <Panel title="Revenue by month" action={<span className="font-mono text-[10.5px] text-muted">% of best month</span>}>
            <BarChart data={MONTHS} />
          </Panel>

          <Panel title="Bookings by weekday" action={<span className="font-mono text-[10.5px] text-muted">% of slots booked</span>}>
            <BarChart data={OWNER_WEEK} />
          </Panel>
        </div>

        <div>
          <Panel title="Utilisation by time of day">
            <RowList>
              {BY_HOUR.map((b) => (
                <Row
                  key={b.h}
                  label={<span className="font-mono text-[12.5px]">{b.h}</span>}
                  sub={b.label}
                  right={
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-[90px] overflow-hidden rounded-full bg-line-white/10">
                        <div
                          className="h-full rounded-full bg-ball-yellow"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-[12px]">{b.pct}%</span>
                    </div>
                  }
                />
              ))}
            </RowList>
          </Panel>

          <Panel title="Revenue by court">
            <Table head={["Court", "Bookings", "Revenue"]}>
              {[
                ["Kitchen Line Club", "128", "₱45,680"],
                ["Sunrise Courts", "94", "₱30,080"],
                ["Third Shot Park", "61", "₱18,300"],
              ].map(([n, b, r]) => (
                <tr key={n}>
                  <Td>{n}</Td>
                  <Td mono>{b}</Td>
                  <Td mono>{r}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
      </div>
    </>
  );
}
