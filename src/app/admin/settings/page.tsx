import { DashHeader, Panel } from "@/components/dashboard/parts";
import { SPORTS } from "@/lib/data/sports";

export const metadata = { title: "Platform settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <DashHeader title="Platform settings" sub="Rates, policies, and launch controls" />

      <div className="grid gap-[18px] lg:grid-cols-2">
        <Panel title="Commission & fees">
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="field-label">Standard host commission</span>
              <input className="field" defaultValue="6%" />
            </label>
            <label className="block">
              <span className="field-label">Founding host commission</span>
              <input className="field" defaultValue="3%" />
            </label>
            <label className="block">
              <span className="field-label">Player service fee</span>
              <input className="field" defaultValue="6%" />
            </label>
            <p className="text-[12px] leading-relaxed text-muted">
              Changing these applies to bookings made from the next calendar day. Existing bookings
              keep the rate they were made under.
            </p>
          </div>
        </Panel>

        <Panel title="Booking policy">
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="field-label">Default free-cancellation window</span>
              <select className="field" defaultValue="12">
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Max booking horizon</span>
              <select className="field" defaultValue="30">
                <option value="14">2 weeks</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">No-shows before suspension</span>
              <input className="field" defaultValue="3" />
            </label>
          </div>
        </Panel>

        <Panel title="Sports enabled">
          <div className="flex flex-col gap-3.5">
            {SPORTS.map((s) => (
              <label key={s.slug} className="flex cursor-pointer items-center justify-between gap-3 text-[13px]">
                <span>
                  {s.name}
                  <span className="ml-2 font-mono text-[11px] text-muted">
                    {s.courtCount} {s.unitLabelPlural}
                  </span>
                </span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-[var(--color-ball-yellow)]"
                />
              </label>
            ))}
            <button className="btn btn-ghost mt-2 px-4 py-2 text-[12px]">+ Add a sport</button>
          </div>
        </Panel>

        <Panel title="City rollout">
          <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
            Cities go live in waitlist order. Toggling a city on makes its listings searchable and
            emails everyone waiting.
          </p>
          <div className="flex flex-col gap-3.5">
            {[
              ["Tagum City", true],
              ["Davao City", true],
              ["Panabo City", true],
              ["Digos City", true],
              ["Mati City", false],
              ["General Santos", false],
            ].map(([city, live]) => (
              <label key={String(city)} className="flex cursor-pointer items-center justify-between gap-3 text-[13px]">
                <span>
                  {city}
                  {!live && <span className="ml-2 status-chip status-pending">Waitlist</span>}
                </span>
                <input
                  type="checkbox"
                  defaultChecked={Boolean(live)}
                  className="h-4 w-4 accent-[var(--color-ball-yellow)]"
                />
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5 flex gap-3">
        <button className="btn btn-solid">Save changes</button>
        <button className="btn btn-ghost">Discard</button>
      </div>
    </>
  );
}
