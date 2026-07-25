import type { Kpi } from "@/lib/data/dashboard";

export function DashHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-sans text-[22px] font-extrabold normal-case tracking-normal">{title}</h1>
        {sub && <p className="mt-1 text-[12.5px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="panel">
          <p className="mb-2 text-[11px] uppercase tracking-[0.05em] text-muted">{k.label}</p>
          <p className="font-mono text-[24px] font-semibold">{k.value}</p>
          {k.delta && (
            <p className={`mt-1.5 text-[11.5px] ${k.warn ? "text-[#ff9370]" : "text-ball-yellow"}`}>
              {k.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel mb-[18px] ${className}`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-extrabold normal-case tracking-normal">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BarChart({ data }: { data: { day: string; pct: number }[] }) {
  return (
    <div>
      <div className="mb-1.5 flex h-[120px] items-end gap-2.5">
        {data.map((d) => (
          <div
            key={d.day}
            className="flex-1 rounded-t-[5px] bg-gradient-to-b from-ball-yellow to-kitchen-blue opacity-90"
            style={{ height: `${d.pct}%` }}
            title={`${d.day}: ${d.pct}%`}
          />
        ))}
      </div>
      <div className="flex gap-2.5">
        {data.map((d) => (
          <span key={d.day} className="flex-1 text-center text-[10.5px] text-muted">
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

export function Row({
  label,
  sub,
  right,
}: {
  label: React.ReactNode;
  sub?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-white/6 py-2.5 text-[13px] last:border-0">
      <div>
        {label}
        {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
      </div>
      <div className="flex-none text-right">{right}</div>
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "open" | "booked" | "pending";
  children: React.ReactNode;
}) {
  return <span className={`status-chip status-${tone}`}>{children}</span>;
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-line-white/8 pb-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`border-b border-line-white/5 py-2.5 ${mono ? "font-mono" : ""}`}>{children}</td>
  );
}

export interface Stat {
  label: string;
  value: string;
  icon: string;
  /** Any CSS colour — drives the underline that distinguishes the tiles. */
  accent: string;
}

/** The player dashboard's tile grid: four across, wrapping to as many rows as
 *  it needs. KpiRow stays as-is because owner and admin depend on its look. */
export function StatGrid({ items }: { items: Stat[] }) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="panel flex flex-col">
          <span
            aria-hidden
            className="mb-3 flex h-8 w-8 items-center justify-center rounded-[10px] bg-card text-[15px]"
          >
            {s.icon}
          </span>
          <p className="text-[11px] uppercase tracking-[0.05em] text-muted">{s.label}</p>
          <p className="mt-1 font-mono text-[24px] font-semibold">{s.value}</p>
          <span
            aria-hidden
            className="mt-3 block h-0.5 w-full rounded-full opacity-70"
            style={{ backgroundColor: s.accent }}
          />
        </div>
      ))}
    </div>
  );
}
