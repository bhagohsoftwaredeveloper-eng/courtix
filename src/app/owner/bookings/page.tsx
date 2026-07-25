import { DashHeader, Panel, StatusChip, Table, Td } from "@/components/dashboard/parts";
import { OWNER_UPCOMING } from "@/lib/data/dashboard";
import { dateLabel, peso, rangeLabel } from "@/lib/format";
import { getStorage } from "@/lib/server/storage";

export const metadata = { title: "Bookings" };

// Real bookings are written at request time, so this page can't be prerendered.
export const dynamic = "force-dynamic";

export default async function OwnerBookingsPage() {
  const bookings = (await getStorage().listBookings()).slice().reverse();

  return (
    <>
      <DashHeader
        title="Bookings"
        sub="Everything booked across your courts"
        action={<button className="btn btn-ghost">Export CSV</button>}
      />

      <Panel
        title={`Live bookings (${bookings.length})`}
        action={
          <span className="font-mono text-[10.5px] text-muted">
            From the booking API
          </span>
        }
      >
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-[13px] leading-relaxed text-muted">
            No live bookings yet. Complete a booking on the player site and it appears here
            instantly — that’s the same storage layer, not a mock.
          </p>
        ) : (
          <Table head={["Reference", "Venue", "Court", "Date", "Time", "Player", "Total", "Status"]}>
            {bookings.map((b) => (
              <tr key={b.ref}>
                <Td mono>{b.ref}</Td>
                <Td>{b.courtName}</Td>
                <Td>
                  <span className="rounded-full bg-court-green px-2.5 py-1 text-[10.5px] font-bold text-ball-yellow">
                    {b.unitLabel}
                  </span>
                </Td>
                <Td>{dateLabel(b.date)}</Td>
                <Td mono>{rangeLabel(b.startHour, b.hours)}</Td>
                <Td>
                  {b.playerName}
                  <span className="block text-[10.5px] text-muted">{b.playerPhone}</span>
                </Td>
                <Td mono>{peso(b.total)}</Td>
                <Td>
                  <StatusChip tone={b.status === "confirmed" ? "open" : "pending"}>
                    {b.status}
                  </StatusChip>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel title="Scheduled this week" action={<span className="font-mono text-[10.5px] text-muted">Sample data</span>}>
        <Table head={["Court", "When", "Player", "Status"]}>
          {OWNER_UPCOMING.map((b, i) => (
            <tr key={i}>
              <Td>{b.unit}</Td>
              <Td>{b.when}</Td>
              <Td>{b.player}</Td>
              <Td>
                <StatusChip tone={b.status === "pending" ? "pending" : "open"}>
                  {b.status === "pending" ? "Pending" : "Confirmed"}
                </StatusChip>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
