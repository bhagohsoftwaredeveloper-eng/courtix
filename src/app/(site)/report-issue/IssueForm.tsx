"use client";

import Link from "next/link";
import { useActionState } from "react";

import { reportIssueAction, type IssueState } from "@/app/(site)/report-issue/actions";
import { ISSUE_TYPES } from "@/app/(site)/report-issue/schema";

export function IssueForm() {
  const [state, action, pending] = useActionState<IssueState, FormData>(reportIssueAction, {});
  const err = (field: string) => state.errors?.[field];

  if (state.filedRef) {
    return (
      <div className="panel text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ball-yellow text-2xl text-ink">
          ✓
        </div>
        <h2 className="font-sans text-xl font-extrabold normal-case tracking-normal">
          Report filed
        </h2>
        <p className="mx-auto mt-2.5 max-w-[380px] text-sm leading-relaxed text-muted">
          Support has three working days to respond. Quote this reference if you follow up.
        </p>
        <p className="mt-5 font-mono text-sm text-ball-yellow">#{state.filedRef}</p>
        <Link href="/account" className="btn btn-ghost mt-6">
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="panel">
      <label className="mb-4 block">
        <span className="field-label">What is this about?</span>
        <select name="type" className="field" defaultValue="OTHER">
          {ISSUE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {err("type") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("type")}</span>}
      </label>

      <label className="mb-4 block">
        <span className="field-label">Booking reference (optional)</span>
        <input name="bookingRef" className="field" placeholder="CTX-8F31A2" autoComplete="off" />
        <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
          Leave blank if this isn&apos;t about a specific booking.
        </span>
        {err("bookingRef") && (
          <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("bookingRef")}</span>
        )}
      </label>

      <label className="mb-5 block">
        <span className="field-label">What happened?</span>
        <textarea
          name="body"
          rows={6}
          className="field resize-y"
          placeholder="Tell us what went wrong, and what you'd like us to do about it."
        />
        {err("body") && <span className="mt-1 block text-[11.5px] text-[#ff9370]">{err("body")}</span>}
      </label>

      {err("form") && (
        <p className="mb-4 rounded-[10px] border border-board-red/40 bg-board-red/10 px-3.5 py-3 text-[13px] text-[#ff9370]">
          {err("form")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid w-full py-3.5 text-sm disabled:opacity-60"
      >
        {pending ? "Filing…" : "File report"}
      </button>
    </form>
  );
}
