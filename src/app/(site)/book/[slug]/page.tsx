import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/CheckoutForm";
import { canBook, unitFreeForSpan } from "@/lib/availability";
import { getCourt } from "@/lib/data/courts";
import { getSport } from "@/lib/data/sports";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; start?: string; hours?: string; unit?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const court = getCourt(slug);
  if (!court) notFound();

  const date = sp.date ?? "";
  const startHour = Number(sp.start);
  const hours = Number(sp.hours);
  // Optional preferred court from the picker. Ignore anything out of range.
  const unitIndex =
    sp.unit !== undefined && Number.isInteger(Number(sp.unit)) && Number(sp.unit) < court.units
      ? Number(sp.unit)
      : undefined;

  const paramsValid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isInteger(startHour) &&
    Number.isInteger(hours) &&
    hours > 0;

  // Validate against the specific court if one was chosen, else the facility.
  const slotOk = paramsValid
    ? unitIndex !== undefined
      ? unitFreeForSpan(court, date, startHour, hours, unitIndex)
      : canBook(court, date, startHour, hours)
    : false;

  // Someone landed here with a hand-edited or stale URL — send them back to
  // the picker rather than rendering a checkout for an impossible slot.
  if (!slotOk) {
    const sport = getSport(court.sport)!;
    return (
      <div className="shell py-24 text-center">
        <h1 className="mb-3 font-sans text-2xl font-extrabold normal-case tracking-normal">
          That slot isn’t available
        </h1>
        <p className="mx-auto mb-8 max-w-[420px] text-[14px] leading-relaxed text-muted">
          The time you picked has either been booked already or falls outside{" "}
          {court.name}’s opening hours. Choose another slot and we’ll pick up where you left off.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/courts/${court.slug}`} className="btn btn-solid">
            Back to {court.name}
          </Link>
          <Link href={`/sports/${sport.slug}`} className="btn btn-ghost">
            Other {sport.name.toLowerCase()} courts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-8">
      <div className="shell">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap gap-2 text-[12.5px] text-muted">
          <Link href="/courts" className="hover:text-line-white">
            Courts
          </Link>
          <span aria-hidden>/</span>
          <Link href={`/courts/${court.slug}`} className="hover:text-line-white">
            {court.name}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-line-white">Checkout</span>
        </nav>

        <p className="eyebrow mb-4">Step 2 of 2</p>
        <h1 className="mb-10 text-[clamp(28px,3.8vw,42px)] leading-[1.03]">Confirm your booking</h1>

        <CheckoutForm
          court={court}
          date={date}
          startHour={startHour}
          hours={hours}
          unitIndex={unitIndex}
        />
      </div>
    </div>
  );
}
