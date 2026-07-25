import { DashHeader, KpiRow, Panel, Table, Td } from "@/components/dashboard/parts";
import { OWNER_PAYOUTS } from "@/lib/data/dashboard";

export const metadata = { title: "Payouts" };

export default function OwnerPayoutsPage() {
  return (
    <>
      <DashHeader
        title="Payouts"
        sub="Courtix remits on the 15th and the 30th"
        action={<button className="btn btn-ghost">Download statements</button>}
      />

      <KpiRow
        items={[
          { label: "Next payout", value: "₱18,814", delta: "Scheduled 31 Jul" },
          { label: "Paid this year", value: "₱212,940" },
          { label: "Commission rate", value: "6%", delta: "Founding host: 3%" },
          { label: "Payout method", value: "BDO ••4417" },
        ]}
      />

      <Panel title="Payout history">
        <Table head={["Period", "Gross", "Courtix fee", "Net to you", "Status"]}>
          {OWNER_PAYOUTS.map((p) => (
            <tr key={p.period}>
              <Td>{p.period}</Td>
              <Td mono>{p.gross}</Td>
              <Td mono>−{p.fee}</Td>
              <Td mono>
                <b>{p.net}</b>
              </Td>
              <Td>
                <span className={`status-chip ${p.state === "Paid" ? "status-open" : "status-pending"}`}>
                  {p.state}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <Panel title="How the fee works">
          <ul className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-muted">
            <li>
              Players pay your hourly rate plus a 6% service fee — the fee is on top, not carved out
              of your rate.
            </li>
            <li>
              Courtix keeps 6% of the court subtotal as commission. Founding hosts pay 3% for their
              first year.
            </li>
            <li>Refunded bookings are reversed in full, including the commission.</li>
            <li>Payouts land 1–2 business days after the cut-off date.</li>
          </ul>
        </Panel>

        <Panel title="Payout account">
          <dl className="flex flex-col gap-3 text-[13px]">
            {[
              ["Bank", "BDO Unibank"],
              ["Account", "•••• •••• 4417"],
              ["Name", "Kitchen Line Club Inc."],
              ["Schedule", "Twice monthly (15th, 30th)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line-white/6 pb-2.5 last:border-0">
                <dt className="text-muted">{k}</dt>
                <dd className="font-mono text-[12.5px]">{v}</dd>
              </div>
            ))}
          </dl>
          <button className="btn btn-ghost mt-4 px-4 py-2 text-[12px]">Change account</button>
        </Panel>
      </div>
    </>
  );
}
