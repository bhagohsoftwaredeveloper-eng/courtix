import Link from "next/link";
import {
  BarChart,
  DashHeader,
  KpiRow,
  Panel,
  Row,
  RowList,
  StatusChip,
  Table,
  Td,
} from "@/components/dashboard/parts";
import {
  ADMIN_APPROVALS,
  ADMIN_DISPUTES,
  ADMIN_KPIS,
  ADMIN_REVENUE_BY_SPORT,
  ADMIN_TOP_FACILITIES,
} from "@/lib/data/dashboard";

export default function AdminOverviewPage() {
  return (
    <>
      <DashHeader
        title="Platform overview"
        sub="Across all cities and sports"
        action={<button className="btn btn-ghost">Export report</button>}
      />

      <KpiRow items={ADMIN_KPIS} />

      <div className="grid gap-[18px] xl:grid-cols-[1.4fr_1fr]">
        <div>
          <Panel
            title="Top-performing facilities"
            action={
              <Link href="/admin/facilities" className="text-[12px] font-bold text-ball-yellow">
                All facilities →
              </Link>
            }
          >
            <Table head={["Facility", "Sport", "Bookings", "Revenue"]}>
              {ADMIN_TOP_FACILITIES.map((f) => (
                <tr key={f.name}>
                  <Td>{f.name}</Td>
                  <Td>{f.sport}</Td>
                  <Td mono>{f.bookings}</Td>
                  <Td mono>{f.revenue}</Td>
                </tr>
              ))}
            </Table>
          </Panel>

          <Panel
            title="Revenue by sport"
            action={<span className="font-mono text-[10.5px] text-muted">% of top sport</span>}
          >
            <BarChart data={ADMIN_REVENUE_BY_SPORT} />
          </Panel>
        </div>

        <div>
          <Panel
            title="Facility approvals"
            action={
              <Link href="/admin/approvals" className="text-[12px] font-bold text-ball-yellow">
                Review all →
              </Link>
            }
          >
            <RowList>
              {ADMIN_APPROVALS.slice(0, 3).map((a) => (
                <Row
                  key={a.name}
                  label={<span className="font-semibold">{a.name}</span>}
                  sub={a.sub}
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

          <Panel
            title="Recent disputes"
            action={
              <Link href="/admin/disputes" className="text-[12px] font-bold text-ball-yellow">
                All →
              </Link>
            }
          >
            <RowList>
              {ADMIN_DISPUTES.map((d) => (
                <Row
                  key={d.sub}
                  label={d.label}
                  sub={d.sub}
                  right={<StatusChip tone={d.tone}>{d.state}</StatusChip>}
                />
              ))}
            </RowList>
          </Panel>

          <Panel title="Platform health">
            <RowList>
              {[
                ["Booking success rate", "99.4%"],
                ["Avg. time to book", "38s"],
                ["Failed payments (7d)", "3"],
                ["Support backlog", "6 open"],
              ].map(([k, v]) => (
                <Row key={k} label={k} right={<span className="font-mono">{v}</span>} />
              ))}
            </RowList>
          </Panel>
        </div>
      </div>
    </>
  );
}
