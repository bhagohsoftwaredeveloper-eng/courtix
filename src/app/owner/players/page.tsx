import { DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";

export const metadata = { title: "Players" };

const PLAYERS = [
  { name: "Jomar Reyes", email: "jomar.r@example.ph", bookings: 34, spend: "₱11,900", last: "2 days ago", tier: "Regular" },
  { name: "Mica Alvarez", email: "mica.a@example.ph", bookings: 51, spend: "₱17,850", last: "Yesterday", tier: "Top 5%" },
  { name: "Tagum Dinkers", email: "league@tagumdinkers.ph", bookings: 28, spend: "₱29,400", last: "4 days ago", tier: "League" },
  { name: "Rico Bautista", email: "rico.b@example.ph", bookings: 12, spend: "₱4,200", last: "1 week ago", tier: "Regular" },
  { name: "Anne Lim", email: "anne.lim@example.ph", bookings: 9, spend: "₱3,150", last: "2 weeks ago", tier: "At risk" },
  { name: "Paolo Chua", email: "p.chua@example.ph", bookings: 41, spend: "₱14,350", last: "3 days ago", tier: "Top 5%" },
];

export default function OwnerPlayersPage() {
  return (
    <>
      <DashHeader
        title="Players"
        sub="Everyone who has booked one of your courts"
        action={<button className="btn btn-ghost">Message all</button>}
      />

      <KpiRow
        items={[
          { label: "Active players", value: "435", delta: "↑ 12.7%" },
          { label: "Repeat rate", value: "62%", delta: "↑ 4.1%" },
          { label: "Avg. bookings / player", value: "3.4", delta: "↑ 0.3" },
          { label: "At risk", value: "18", delta: "No booking in 30 days", warn: true },
        ]}
      />

      <Panel title="Top players by spend">
        <Table head={["Player", "Bookings", "Total spend", "Last booked", "Tier"]}>
          {PLAYERS.map((p) => (
            <tr key={p.email}>
              <Td>
                {p.name}
                <span className="block text-[10.5px] text-muted">{p.email}</span>
              </Td>
              <Td mono>{p.bookings}</Td>
              <Td mono>{p.spend}</Td>
              <Td>{p.last}</Td>
              <Td>
                <span
                  className={`status-chip ${
                    p.tier === "At risk"
                      ? "status-booked"
                      : p.tier === "Regular"
                        ? "status-pending"
                        : "status-open"
                  }`}
                >
                  {p.tier}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Win them back">
        <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
          18 players who used to book weekly haven’t been back in 30 days. A one-off off-peak
          discount brings roughly a third of them back.
        </p>
        <button className="btn btn-solid px-5 py-2.5 text-[12.5px]">
          Send off-peak offer to 18 players
        </button>
      </Panel>
    </>
  );
}
