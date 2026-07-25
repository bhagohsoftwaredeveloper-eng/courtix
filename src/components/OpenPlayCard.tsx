import Link from "next/link";
import { sportName } from "@/lib/data/sports";
import { dateLabel, hourLabel, peso } from "@/lib/format";
import type { OpenPlay, SkillLevel } from "@/lib/types";
import type { OpenPlayStatus } from "@/lib/server/openplay-status";

const SKILL_TONE: Record<SkillLevel, string> = {
  Beginner: "bg-fair-green/20 text-[#8fd07a]",
  Intermediate: "bg-kitchen-blue/30 text-[#9db8e6]",
  Advanced: "bg-board-red/20 text-[#ff9370]",
  "All Levels": "bg-ball-yellow/15 text-ball-yellow",
};

export function SkillChip({ skill }: { skill: SkillLevel }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${SKILL_TONE[skill]}`}>
      {skill}
    </span>
  );
}

export function SeatMeter({ status }: { status: OpenPlayStatus }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line-white/12">
        <div
          className={`h-full rounded-full ${status.isFull ? "bg-board-red" : "bg-ball-yellow"}`}
          style={{ width: `${(status.filled / status.capacity) * 100}%` }}
        />
      </div>
      <span className={`font-mono text-[11.5px] ${status.isFull ? "text-[#ff9370]" : "text-line-white"}`}>
        {status.filled}/{status.capacity}
        {status.isFull ? " Full" : ""}
      </span>
    </div>
  );
}

export function OpenPlayCard({ play, status }: { play: OpenPlay; status: OpenPlayStatus }) {
  return (
    <Link
      href={`/open-plays/${play.id}`}
      className="group flex flex-col rounded-card border border-line-white/8 bg-card p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-ball-yellow/40"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-court-green px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ball-yellow">
          {sportName(play.sport)}
        </span>
        <SkillChip skill={play.skill} />
        {play.fastPay && (
          <span className="rounded-full border border-line-white/16 px-2.5 py-1 text-[10.5px] font-bold text-muted">
            ⚡ FastPay
          </span>
        )}
      </div>

      <h3 className="font-sans text-[16px] font-extrabold normal-case leading-tight tracking-normal">
        {play.title}
      </h3>
      <p className="mt-1 text-[12.5px] text-muted">
        {play.courtName} · {play.city}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-line-white/8 pt-3.5">
        <div>
          <p className="font-mono text-[13px]">{dateLabel(play.date)}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {hourLabel(play.startHour)} · {play.hours}h
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[14px]">
            {peso(play.pricePerPlayer)}
            <span className="text-[10.5px] text-muted">/player</span>
          </p>
          <div className="mt-1.5">
            <SeatMeter status={status} />
          </div>
        </div>
      </div>

      <span className="mt-3.5 text-[12px] font-bold text-ball-yellow">
        {status.isFull ? "Join waitlist →" : "Join session →"}
      </span>
    </Link>
  );
}
