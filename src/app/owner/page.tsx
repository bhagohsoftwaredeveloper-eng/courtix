import {
  BarChart,
  DashHeader,
  KpiRow,
  Panel,
  Row,
  RowList,
  StatusChip,
} from "@/components/dashboard/parts";
import {
  OWNER_KPIS,
  OWNER_TRANSACTIONS,
  OWNER_UPCOMING,
  OWNER_WEEK,
} from "@/lib/data/dashboard";
import { upcomingDates } from "@/lib/availability";
import { getCourt, unitLabels } from "@/lib/data/courts";
import { hourLabel, rangeLabel } from "@/lib/format";
import { getStorage } from "@/lib/server/storage";

// The demo owner's main facility.
const HOME_COURT_ID = 1;

// Reads live bookings for the per-court status board.
export const dynamic = "force-dynamic";

/** Today's booking status for each individual court at the owner's facility. */
async function courtStatusToday() {
  const court = getCourt(HOME_COURT_ID);
  if (!court) return [];
  const today = upcomingDates(1)[0];
  const bookings = (await getStorage().listBookings()).filter(
    (b) => b.courtId === court.id && b.date === today && b.status !== "cancelled",
  );

  return unitLabels(court).map((label, index) => {
    const onThisCourt = bookings
      .filter((b) => (b.unitIndex ?? 0) === index)
      .sort((a, b) => a.startHour - b.startHour);
    const next = onThisCourt[0];
    return {
      label,
      bookings: onThisCourt.length,
      next: next ? rangeLabel(next.startHour, next.hours) : null,
      // A demo maintenance flag on the last court keeps the board realistic.
      maintenance: index === court.units - 1 && court.units > 2,
      opens: court.opens,
      closes: court.closes,
    };
  });
}

/** Real bookings for the owner's facility, today onward, newest date first. */
async function liveUpcoming() {
  const court = getCourt(HOME_COURT_ID);
  if (!court) return [];
  const today = upcomingDates(1)[0];
  return (await getStorage().listBookings())
    .filter((b) => b.courtId === court.id && b.date >= today && b.status !== "cancelled")
    .sort((a, b) => (a.date === b.date ? a.startHour - b.startHour : a.date.localeCompare(b.date)))
    .slice(0, 4);
}

export default async function OwnerDashboard() {
  const [courts, live] = await Promise.all([courtStatusToday(), liveUpcoming()]);

  return (
    <>
      <DashHeader
        title="Welcome back, Kitchen Line Club"
        sub="Here's how your courts are doing this week"
        action={<button className="btn btn-solid">+ Add court</button>}
      />

      <KpiRow items={OWNER_KPIS} />

      <div className="grid gap-[18px] xl:grid-cols-[1.4fr_1fr]">
        <div>
          <Panel title="Bookings overview" action={<Legend />}>
            <BarChart data={OWNER_WEEK} />
          </Panel>

          <Panel title="Upcoming bookings">
            <RowList>
              {live.map((b) => (
                <Row
                  key={b.ref}
                  label={
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-court-green px-2 py-0.5 text-[10.5px] font-bold text-ball-yellow">
                        {b.unitLabel}
                      </span>
                      <span className="font-semibold">{b.playerName}</span>
                    </span>
                  }
                  sub={`${b.date} · ${rangeLabel(b.startHour, b.hours)} · ${b.ref}`}
                  right={<StatusChip tone="open">Confirmed</StatusChip>}
                />
              ))}
              {OWNER_UPCOMING.map((b, i) => (
                <Row
                  key={i}
                  label={<span className="font-semibold">{b.unit}</span>}
                  sub={b.when}
                  right={
                    <div className="flex items-center gap-3">
                      <span className="text-[12.5px]">{b.player}</span>
                      <StatusChip tone={b.status === "pending" ? "pending" : "open"}>
                        {b.status === "pending" ? "Pending" : "Confirmed"}
                      </StatusChip>
                    </div>
                  }
                />
              ))}
            </RowList>
          </Panel>
        </div>

        <div>
          <Panel
            title="Court status · today"
            action={
              <span className="font-mono text-[10.5px] text-muted">Kitchen Line Club</span>
            }
          >
            <RowList>
              {courts.map((c) => (
                <Row
                  key={c.label}
                  label={<span className="font-semibold">{c.label}</span>}
                  sub={
                    c.maintenance
                      ? "Closed for maintenance"
                      : c.next
                        ? `Next: ${c.next}`
                        : `Open ${hourLabel(c.opens)}–${hourLabel(c.closes)}`
                  }
                  right={
                    c.maintenance ? (
                      <StatusChip tone="pending">Maintenance</StatusChip>
                    ) : c.bookings > 0 ? (
                      <StatusChip tone="booked">
                        {c.bookings} booked
                      </StatusChip>
                    ) : (
                      <StatusChip tone="open">Available</StatusChip>
                    )
                  }
                />
              ))}
            </RowList>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              Each court books independently — this reflects real bookings for today.
            </p>
          </Panel>

          <Panel title="Recent transactions">
            <RowList>
              {OWNER_TRANSACTIONS.map((t, i) => (
                <Row
                  key={i}
                  label={t.label}
                  sub={t.sub}
                  right={<span className="font-mono">{t.amount}</span>}
                />
              ))}
            </RowList>
          </Panel>

          <Panel title="Your dead hours">
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-muted">
              These slots sold under 20% of the time in the last 30 days. Consider an off-peak rate.
            </p>
            <RowList>
              {[
                { h: "Tue 1:00 – 3:00 PM", pct: "8%" },
                { h: "Wed 10:00 AM – 12:00 PM", pct: "12%" },
                { h: "Thu 2:00 – 4:00 PM", pct: "16%" },
              ].map((d) => (
                <Row
                  key={d.h}
                  label={d.h}
                  right={<span className="font-mono text-[#ff9370]">{d.pct}</span>}
                />
              ))}
            </RowList>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Legend() {
  return <span className="font-mono text-[10.5px] text-muted">% of slots booked</span>;
}
