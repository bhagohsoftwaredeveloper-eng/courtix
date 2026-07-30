import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact us",
  description: "How to reach the Courtix team.",
};

export default function ContactPage() {
  return (
    <div className="shell flex max-w-[760px] flex-col py-20">
      <p className="eyebrow mb-4">Support</p>
      <h1 className="mb-3 text-[clamp(30px,4.5vw,42px)] leading-[1.05]">Contact us</h1>
      <p className="mb-10 text-sm leading-relaxed text-muted">
        For anything about a booking, the report form is faster than email — it files straight into
        the support queue with your booking attached.
      </p>

      <section className="panel mb-[18px]">
        <h2 className="mb-2 font-sans text-[17px] font-extrabold normal-case tracking-normal">
          A booking, a charge, or something broken
        </h2>
        <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
          File a report and support has three working days to respond. You get a reference to quote
          if you follow up.
        </p>
        <Link href="/report-issue" className="btn btn-solid">
          Report an issue
        </Link>
      </section>

      <section className="panel mb-[18px]">
        <h2 className="mb-2 font-sans text-[17px] font-extrabold normal-case tracking-normal">
          Listing your court
        </h2>
        <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
          Own a court and want it on Courtix? Start with the host form — we come back to you about
          onboarding and commission.
        </p>
        <Link href="/list-your-court" className="btn btn-ghost">
          List your court
        </Link>
      </section>

      {/* Real contact details are a business decision, not something to invent:
          a wrong address or number on a live site sends players nowhere. */}
      <section className="panel">
        <h2 className="mb-2 font-sans text-[17px] font-extrabold normal-case tracking-normal">
          Direct contact
        </h2>
        <div className="rounded-[10px] border border-board-red/40 bg-board-red/10 px-4 py-3.5">
          <p className="mb-1 font-sans text-[12.5px] font-extrabold normal-case tracking-normal text-[#ff9370]">
            Not filled in yet
          </p>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Add the support email, mobile number, and registered business address here before
            launch. Until then this page points people at the report form, which works.
          </p>
        </div>
      </section>
    </div>
  );
}
