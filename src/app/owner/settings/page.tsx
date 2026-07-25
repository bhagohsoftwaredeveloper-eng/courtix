import { DashHeader, Panel } from "@/components/dashboard/parts";

export const metadata = { title: "Settings" };

export default function OwnerSettingsPage() {
  return (
    <>
      <DashHeader title="Settings" sub="Facility profile, booking rules, and notifications" />

      <div className="grid gap-[18px] lg:grid-cols-2">
        <Panel title="Facility profile">
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="field-label">Facility name</span>
              <input className="field" defaultValue="Kitchen Line Club" />
            </label>
            <label className="block">
              <span className="field-label">Contact email</span>
              <input className="field" type="email" defaultValue="hello@kitchenline.ph" />
            </label>
            <label className="block">
              <span className="field-label">Contact number</span>
              <input className="field" type="tel" defaultValue="09171234567" />
            </label>
            <label className="block">
              <span className="field-label">Address</span>
              <input className="field" defaultValue="Tagum City, Davao del Norte" />
            </label>
          </div>
        </Panel>

        <Panel title="Booking rules">
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="field-label">Minimum booking length</span>
              <select className="field" defaultValue="60">
                <option value="60">1 hour</option>
                <option value="90">90 minutes</option>
                <option value="120">2 hours</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">How far ahead can players book?</span>
              <select className="field" defaultValue="14">
                <option value="7">1 week</option>
                <option value="14">2 weeks</option>
                <option value="30">1 month</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Free cancellation window</span>
              <select className="field" defaultValue="12">
                <option value="6">6 hours before</option>
                <option value="12">12 hours before</option>
                <option value="24">24 hours before</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-[13px]">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-[var(--color-ball-yellow)]"
              />
              Auto-accept bookings (no manual approval)
            </label>
          </div>
        </Panel>

        <Panel title="Notifications">
          <div className="flex flex-col gap-3.5">
            {[
              ["New booking", true],
              ["Cancellation", true],
              ["Player message", true],
              ["Payout sent", true],
              ["Weekly performance summary", false],
              ["Courtix product updates", false],
            ].map(([label, on]) => (
              <label key={String(label)} className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  defaultChecked={Boolean(on)}
                  className="h-4 w-4 accent-[var(--color-ball-yellow)]"
                />
                {label}
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Danger zone">
          <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
            Pausing hides all your listings from search immediately. Existing bookings are honoured
            — you’ll still need to fulfil anything already confirmed.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost px-4 py-2 text-[12px]">Pause all listings</button>
            <button className="btn btn-ghost border-board-red/50 px-4 py-2 text-[12px] text-[#ff9370]">
              Close account
            </button>
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
