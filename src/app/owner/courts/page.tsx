import Image from "next/image";
import Link from "next/link";

import { DashHeader, StatusChip } from "@/components/dashboard/parts";
import { hourShort } from "@/lib/format";
import { requireOwner } from "@/lib/server/auth";
import { listOwnerFacilities } from "@/lib/server/host-store";

export const metadata = { title: "My courts" };

export const dynamic = "force-dynamic";

/** What each status means to the host, in their words rather than the enum's.
 *  Tones are StatusChip's three: "open" reads positive, "pending" neutral,
 *  "booked" negative. */
const STATUS_COPY: Record<
  string,
  { label: string; note: string; tone: "open" | "booked" | "pending" }
> = {
  DRAFT: { label: "Draft", note: "Not submitted yet.", tone: "pending" },
  PENDING_REVIEW: {
    label: "In review",
    note: "A platform admin is checking your details.",
    tone: "pending",
  },
  APPROVED: {
    label: "Live",
    note: "Players can find and book this venue.",
    tone: "open",
  },
  DECLINED: {
    label: "Declined",
    note: "Fix the note below and submit again.",
    tone: "booked",
  },
  SUSPENDED: {
    label: "Suspended",
    note: "Taken off the directory. Contact support.",
    tone: "booked",
  },
};

export default async function OwnerCourtsPage() {
  const { org } = await requireOwner();
  const facilities = await listOwnerFacilities(org.id);

  return (
    <>
      <DashHeader
        title="My courts"
        sub={
          facilities.length === 0
            ? "No venues yet"
            : `${facilities.length} venue${facilities.length === 1 ? "" : "s"} at ${org.name}`
        }
        action={
          <Link href="/list-your-court/start" className="btn btn-solid">
            + Add court
          </Link>
        }
      />

      {facilities.length === 0 ? (
        <div className="rounded-[16px] border border-line-white/10 bg-card px-6 py-16 text-center">
          <p className="mb-1.5 font-sans text-[16px] font-extrabold normal-case tracking-normal">
            No venues yet
          </p>
          <p className="mx-auto mb-6 max-w-[380px] text-[13px] leading-relaxed text-muted">
            Add your first venue and we&apos;ll review it. Once approved it appears in the
            Courtix directory and players can book it.
          </p>
          <Link href="/list-your-court/start" className="btn btn-solid">
            Add your first court
          </Link>
        </div>
      ) : (
        <div className="grid gap-[18px] lg:grid-cols-2">
          {facilities.map((f) => {
            const copy = STATUS_COPY[f.status] ?? { label: f.status, note: "", tone: "pending" as const };
            return (
              <section key={f.id} className="panel">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-sans text-[15px] font-extrabold normal-case tracking-normal">
                      {f.name}
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {f.cityName} · {f.courtCount} court{f.courtCount === 1 ? "" : "s"} ·{" "}
                      {hourShort(f.opens)}–{hourShort(f.closes)}
                    </p>
                  </div>
                  <StatusChip tone={copy.tone}>{copy.label}</StatusChip>
                </div>

                {f.imageId && (
                  <Image
                    src={`/api/facility-image/${f.imageId}`}
                    alt={`${f.name} — venue photo`}
                    width={640}
                    height={360}
                    unoptimized
                    className="mb-3 h-[150px] w-full rounded-[10px] object-cover"
                  />
                )}

                <p className="text-[12.5px] text-muted">{copy.note}</p>

                {f.status === "DECLINED" && f.declineReason && (
                  <p className="mt-2.5 rounded-[10px] border border-[#ff9370]/40 bg-[#ff9370]/10 px-3.5 py-3 text-[12.5px] text-[#ff9370]">
                    {f.declineReason}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
