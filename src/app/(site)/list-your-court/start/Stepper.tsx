import type { WizardStep } from "@/lib/host-wizard";

const STEPS = [
  { n: 1, label: "Account" },
  { n: 2, label: "Profile" },
  { n: 3, label: "Venue" },
] as const;

/** The 1–2–3 header. A completed step is ticked so returning hosts can see
 *  what the wizard already has, which is the point of resuming. */
export function Stepper({ current }: { current: WizardStep }) {
  const active = current === "done" ? 4 : current;

  return (
    <ol className="mb-8 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = step.n < active;
        const here = step.n === active;
        return (
          <li key={step.n} className="flex flex-1 items-center gap-2">
            <span
              aria-current={here ? "step" : undefined}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                here
                  ? "bg-ball-yellow text-ink"
                  : done
                    ? "bg-fair-green text-line-white"
                    : "border border-line-white/20 text-muted"
              }`}
            >
              {done ? "✓" : step.n}
            </span>
            <span
              className={`text-[12.5px] font-semibold ${here ? "text-line-white" : "text-muted"}`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="ml-1 hidden h-px flex-1 bg-line-white/15 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
