import Link from "next/link";
import { redirect } from "next/navigation";

import { DashHeader, Panel, StatGrid, type Stat } from "@/components/dashboard/parts";
import { upcomingDates } from "@/lib/availability";
import { allOpenPlays } from "@/lib/data/openplays";
import { playerSessions, playerStats } from "@/lib/player-stats";
import { getCurrentPlayer } from "@/lib/server/player";
import { getStorage } from "@/lib/server/storage";

// Reads the player's stored activity, so it must render per request.
export const dynamic = "force-dynamic";

const CALORIE_NOTE = "Estimated from session length and sport.";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AccountDashboard() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=/account");

  const today = upcomingDates(1)[0];
  const storage = getStorage();
  const [bookings, joins] = await Promise.all([storage.listBookings(), storage.listOpenPlayJoins()]);

  const sessions = playerSessions(bookings, joins, allOpenPlays(), player.email, today);
  const stats = playerStats(sessions, today);

  const tiles: Stat[] = [
    { label: "Total Bookings", value: String(stats.totalBookings), icon: "▤", accent: "#2f5185" },
    { label: "Upcoming", value: String(stats.upcoming), icon: "📅", accent: "#4c7a3f" },
    { label: "Open Plays", value: String(stats.openPlays), icon: "☰", accent: "#e4c95b" },
    { label: "Cal This Month", value: stats.calThisMonth.toLocaleString("en-PH"), icon: "🔥", accent: "#e4572e" },
    { label: "Hours Played", value: `${stats.hoursPlayed}h`, icon: "🕘", accent: "#7a5fb0" },
    { label: "Week Streak", value: String(stats.weekStreak), icon: "⚡", accent: "#e4572e" },
    { label: "Avg Cal/Session", value: stats.avgCalPerSession.toLocaleString("en-PH"), icon: "🌿", accent: "#4c7a3f" },
    { label: "Total Sessions", value: String(stats.totalSessions), icon: "🏆", accent: "#c05c8e" },
  ];

  return (
    <>
      <DashHeader
        title={`${greeting()}, ${player.name.split(" ")[0]}`}
        sub={player.city ? `Your court time around ${player.city}` : "Your court time so far"}
        action={
          <Link href="/courts" className="btn btn-solid">
            Book a court
          </Link>
        }
      />

      <StatGrid items={tiles} />

      <div className="grid gap-[18px] xl:grid-cols-2">
        <Panel title="Calories Burned" action={<span className="font-mono text-[10.5px] text-muted">this month</span>}>
          {stats.sessionsThisMonth === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-1.5 font-sans text-[14px] font-extrabold">No activity data yet</p>
              <p className="text-[12.5px] text-muted">
                Book a court or join an open play and this fills in.
              </p>
            </div>
          ) : (
            <>
              <p className="font-mono text-[28px] font-semibold">
                {stats.calThisMonth.toLocaleString("en-PH")}
                <span className="ml-1.5 text-[13px] text-muted">kcal</span>
              </p>
              <p className="mt-1.5 text-[12.5px] text-muted">
                Across {stats.sessionsThisMonth} session{stats.sessionsThisMonth === 1 ? "" : "s"} ·{" "}
                {stats.hoursThisMonth}h on court.
              </p>
            </>
          )}
          <p className="mt-3.5 border-t border-line-white/8 pt-3 text-[11.5px] text-muted">
            {CALORIE_NOTE}
          </p>
        </Panel>

        <Panel title="Courts Explored">
          <p className="font-mono text-[28px] font-semibold">{stats.courtsExplored}</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            unique venue{stats.courtsExplored === 1 ? "" : "s"} visited
          </p>
          {stats.courtsExplored === 0 && (
            <p className="mt-3.5 text-[12.5px] text-muted">
              Start booking to explore new courts.{" "}
              <Link href="/courts" className="font-bold text-ball-yellow">
                Find a court →
              </Link>
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
