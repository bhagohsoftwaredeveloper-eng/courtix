"use server";

import { IssueInput } from "@/app/(site)/report-issue/schema";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export interface IssueState {
  errors?: Record<string, string>;
  /** The reference handed back so the player can quote it when following up. */
  filedRef?: string;
}

/** Support has three working days to respond; the admin queue sorts on this. */
const SLA_DAYS = 3;

/**
 * File a support report.
 *
 * Reports land in the same `Dispute` table the admin dispute queue reads, so
 * there is one place to work from rather than a second inbox. A report that
 * names a booking inherits that booking's facility; a platform-wide one leaves
 * `facilityId` null, which is why that column is nullable.
 */
export async function reportIssueAction(
  _prev: IssueState,
  formData: FormData,
): Promise<IssueState> {
  const user = await requireUser();

  const parsed = IssueInput.safeParse({
    type: formData.get("type"),
    bookingRef: formData.get("bookingRef") ?? "",
    body: formData.get("body"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { type, bookingRef, body } = parsed.data;

  // Resolve the reference to a booking the player actually owns. Accepting an
  // arbitrary ref would let anyone attach a report to a stranger's booking.
  let booking: { id: string; facilityId: string } | null = null;
  if (bookingRef !== "") {
    booking = await db.booking.findFirst({
      where: { ref: bookingRef, playerId: user.id },
      select: { id: true, facilityId: true },
    });
    if (!booking) {
      return { errors: { bookingRef: "We can't find that booking on your account" } };
    }
  }

  const slaDueAt = new Date();
  slaDueAt.setDate(slaDueAt.getDate() + SLA_DAYS);

  const dispute = await db.dispute.create({
    data: {
      type,
      raisedById: user.id,
      bookingId: booking?.id ?? null,
      facilityId: booking?.facilityId ?? null,
      slaDueAt,
      messages: { create: { senderId: user.id, body } },
    },
    select: { id: true },
  });

  return { filedRef: dispute.id.slice(-8).toUpperCase() };
}
