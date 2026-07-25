import { BarChart, DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";
import { ADMIN_REVENUE_BY_SPORT } from "@/lib/data/dashboard";

export const metadata = { title: "Commission & payouts" };

const RUNS = [
  { period: "16–31 Jul 2026", venues: 142, gross: "₱1,024,300", commission: "₱61,458", net: "₱962,842", state: "Scheduled" },
  { period: "01–15 Jul 2026", venues: 138, gross: "₱986,100", commission: "₱59,166", net: "₱926,934", state: "Paid" },
  { period: "16–30 Jun 2026", venues: 134, gross: "₱902,400", commission: "₱54,144", net: "₱848,256", state: "Paid" },
  { period: "01–15 Jun 2026", venues: 131, gross: "₱871,200", commission: "₱52,272", net: "₱818,928", state: "Paid" },
];

export default function AdminPayoutsPage() {
  return (
    <>
      <DashHeader
        title="Commission & payouts"
        sub="Platform revenue and host remittances"
        action={<button className="btn btn-ghost">Download ledger</button>}
      />

      <KpiRow
        items={[
          { label: "Platform revenue (MTD)", value: "₱612,400", delta: "↑ 11.3%" },
          { label: "Next payout run", value: "₱962,842", delta: "31 Jul · 142 venues" },
          { label: "Standard commission", value: "6%" },
          { label: "Founding hosts on 3%", value: "38", delta: "Expires Jan 2027" },
        ]}
      />

      <div className="grid gap-[18px] xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Payout runs">
          <Table head={["Period", "Venues", "Gross", "Commission", "Net remitted", "Status"]}>
            {RUNS.map((r) => (
              <tr key={r.period}>
                <Td>{r.period}</Td>
                <Td mono>{r.venues}</Td>
                <Td mono>{r.gross}</Td>
                <Td mono>{r.commission}</Td>
                <Td mono>{r.net}</Td>
                <Td>
                  <span className={`status-chip ${r.state === "Paid" ? "status-open" : "status-pending"}`}>
                    {r.state}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <div>
          <Panel
            title="Commission by sport"
            action={<span className="font-mono text-[10.5px] text-muted">% of top sport</span>}
          >
            <BarChart data={ADMIN_REVENUE_BY_SPORT} />
          </Panel>

          <Panel title="Failed remittances">
            <Table head={["Venue", "Amount", "Reason"]}>
              {[
                ["Feather Court Panabo", "₱8,420", "Bank account closed"],
                ["Third Shot Park", "₱5,190", "Name mismatch"],
              ].map(([v, a, r]) => (
                <tr key={String(v)}>
                  <Td>{v}</Td>
                  <Td mono>{a}</Td>
                  <Td>
                    <span className="text-[#ff9370]">{r}</span>
                  </Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
      </div>
    </>
  );
}
