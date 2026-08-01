import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description: "Answers to the questions players and court owners ask most about Courtix.",
};

interface Faq {
  q: string;
  a: React.ReactNode;
}

/** Answers describe what the app actually does today. Anything not built yet
 *  says so rather than promising it. */
const PLAYER_FAQS: Faq[] = [
  {
    q: "How do I book a court?",
    a: (
      <>
        Open <Link href="/courts" className="text-ball-yellow">Find a court</Link>, pick a venue,
        choose a date and a start time, and confirm. You get a reference like{" "}
        <span className="font-mono">CTX-8F31A2</span> — quote it at the venue and when contacting
        support.
      </>
    ),
  },
  {
    q: "What is an open play?",
    a: (
      <>
        An organised drop-in session you buy a single seat in, rather than renting a whole court.
        Good if you don&apos;t have four people.{" "}
        <Link href="/open-plays" className="text-ball-yellow">Browse open plays</Link> to see
        what&apos;s on.
      </>
    ),
  },
  {
    q: "Can I book a court in a city that isn't listed?",
    a: (
      <>
        Not yet — Courtix opens city by city.{" "}
        <Link href="/waitlist" className="text-ball-yellow">Join the waitlist</Link> and tell us
        where you play; cities open in waitlist order.
      </>
    ),
  },
  {
    q: "How do I cancel or change a booking?",
    a: (
      <>
        Cancellation windows are set per venue. Open the booking from{" "}
        <Link href="/account/bookings" className="text-ball-yellow">My bookings</Link>, or{" "}
        <Link href="/report-issue" className="text-ball-yellow">report an issue</Link> if you need
        support to step in.
      </>
    ),
  },
  {
    q: "Why does my total differ from the hourly rate?",
    a: "The court rate is set by the host. Courtix adds a service fee at checkout, shown as a separate line before you pay.",
  },
  {
    q: "What is the DUPR rating on my profile?",
    a: (
      <>
        A self-reported skill number between 1.00 and 8.00 that helps hosts and other players place
        you in a fair game. Nothing verifies it against DUPR yet — there is no DUPR integration.
        Edit it in{" "}
        <Link href="/account/profile" className="text-ball-yellow">Edit profile</Link>.
      </>
    ),
  },
];

const OWNER_FAQS: Faq[] = [
  {
    q: "How do I list my court?",
    a: (
      <>
        Start at{" "}
        <Link href="/list-your-court" className="text-ball-yellow">List your court</Link>. A
        listing is reviewed by the Courtix team before it goes live and becomes bookable.
      </>
    ),
  },
  {
    q: "What does Courtix charge?",
    a: "A commission on each booking, deducted before payout. Founding hosts get a lower rate for an introductory period. Your exact rate is on your owner dashboard.",
  },
  {
    q: "When do I get paid?",
    a: "Payouts run twice monthly — the 1st to the 15th, then the 16th to month end — covering bookings that were played in that period.",
  },
];

export default function HelpPage() {
  return (
    <div className="shell flex max-w-[760px] flex-col py-20">
      <p className="eyebrow mb-4">Support</p>
      <h1 className="mb-3 text-[clamp(30px,4.5vw,42px)] leading-[1.05]">Help</h1>
      <p className="mb-10 text-sm leading-relaxed text-muted">
        The questions we get asked most. If your answer isn&apos;t here,{" "}
        <Link href="/report-issue" className="font-bold text-ball-yellow">
          report an issue
        </Link>{" "}
        and a human will pick it up.
      </p>

      <FaqGroup title="Playing" faqs={PLAYER_FAQS} />
      <FaqGroup title="Hosting" faqs={OWNER_FAQS} />

      <div className="mt-6 rounded-[12px] border border-line-white/12 bg-card px-5 py-5">
        <p className="mb-1.5 font-sans text-[15px] font-extrabold normal-case tracking-normal">
          Still stuck?
        </p>
        <p className="mb-4 text-[13px] leading-relaxed text-muted">
          File a report and support has three working days to respond. Include your booking
          reference if it&apos;s about a specific session.
        </p>
        <Link href="/report-issue" className="btn btn-solid">
          Report an issue
        </Link>
      </div>
    </div>
  );
}

function FaqGroup({ title, faqs }: { title: string; faqs: Faq[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-sans text-[19px] font-extrabold normal-case tracking-normal">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-[12px] border border-line-white/12 bg-card px-5 py-4"
          >
            <summary className="cursor-pointer list-none text-[14px] font-bold marker:content-none">
              <span className="mr-2 text-ball-yellow group-open:hidden" aria-hidden>
                +
              </span>
              <span className="mr-2 hidden text-ball-yellow group-open:inline" aria-hidden>
                −
              </span>
              {faq.q}
            </summary>
            <div className="mt-2.5 pl-5 text-[13.5px] leading-relaxed text-muted">{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
