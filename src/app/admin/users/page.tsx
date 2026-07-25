import { DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";
import { ADMIN_USERS } from "@/lib/data/dashboard";

export const metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <>
      <DashHeader
        title="Users"
        sub="Players and court owners across the platform"
        action={<button className="btn btn-ghost">Export CSV</button>}
      />

      <KpiRow
        items={[
          { label: "Total users", value: "18,940", delta: "↑ 6.4%" },
          { label: "Players", value: "18,798" },
          { label: "Owners", value: "142", delta: "↑ 9 this month" },
          { label: "Suspended", value: "4", delta: "Under review", warn: true },
        ]}
      />

      <Panel title="Recent users">
        <Table head={["Name", "Role", "City", "Joined", "Bookings", ""]}>
          {ADMIN_USERS.map((u) => (
            <tr key={u.email}>
              <Td>
                {u.name}
                <span className="block text-[10.5px] text-muted">{u.email}</span>
              </Td>
              <Td>
                <span className={`status-chip ${u.role === "Owner" ? "status-open" : "status-pending"}`}>
                  {u.role}
                </span>
              </Td>
              <Td>{u.city}</Td>
              <Td>{u.joined}</Td>
              <Td mono>{u.bookings}</Td>
              <Td>
                <button className="text-[11.5px] font-bold text-ball-yellow">Manage</button>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Needs attention">
        <Table head={["User", "Issue", "Since", ""]}>
          {[
            ["Anne Lim", "3 no-shows in 30 days", "12 Jul", "Warn"],
            ["Fastbreak Covered Court", "2 unresolved player complaints", "9 Jul", "Review"],
            ["Rico Bautista", "Payment method repeatedly declined", "18 Jul", "Contact"],
          ].map(([who, issue, since, action]) => (
            <tr key={String(who)}>
              <Td>{who}</Td>
              <Td>{issue}</Td>
              <Td>{since}</Td>
              <Td>
                <button className="rounded-lg border border-line-white/18 px-3 py-1.5 text-[11px] font-bold">
                  {action}
                </button>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
