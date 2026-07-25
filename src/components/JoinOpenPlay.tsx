"use client";

import { useState } from "react";
import { fieldErrors, joinOpenPlaySchema } from "@/lib/validation";

/**
 * The join panel on an open-play detail page. `full` and `alreadyFilled` come
 * from the server render; the button reads "Join waitlist" or "Join session"
 * accordingly, and the API decides the real seat vs. waitlist outcome so a
 * session filling up between load and submit still does the right thing.
 */
export function JoinOpenPlay({
  openPlayId,
  full,
  defaults,
}: {
  openPlayId: string;
  full: boolean;
  defaults?: { name?: string; email?: string; phone?: string };
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [result, setResult] = useState<{ waitlisted: boolean; spotsLeft: number } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      openPlayId,
      playerName: String(fd.get("playerName") ?? ""),
      playerEmail: String(fd.get("playerEmail") ?? ""),
      playerPhone: String(fd.get("playerPhone") ?? ""),
    };

    const parsed = joinOpenPlaySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/open-plays/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.errors ?? { _: body.message ?? "Couldn't join. Try again." });
        setStatus("idle");
        return;
      }
      setResult({ waitlisted: body.waitlisted, spotsLeft: body.spotsLeft });
      setStatus("done");
    } catch {
      setErrors({ _: "Couldn't reach the server. Try again." });
      setStatus("idle");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="panel text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ball-yellow text-xl text-ink">
          ✓
        </div>
        <h3 className="font-sans text-lg font-extrabold normal-case tracking-normal">
          {result.waitlisted ? "You're on the waitlist" : "You're in"}
        </h3>
        <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">
          {result.waitlisted
            ? "The session was full, so we've added you to the waitlist. We'll text you if a seat opens up."
            : "See you on court. We've texted the details and gate instructions to your phone."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel">
      <h3 className="font-sans text-base font-extrabold normal-case tracking-normal">
        {full ? "Join the waitlist" : "Take a seat"}
      </h3>
      <p className="mb-4 mt-1 text-[12.5px] text-muted">
        {full
          ? "This session is full — join the waitlist and we'll text you if a spot frees up."
          : "One seat, one player. Pay per head, not for the whole court."}
      </p>

      <div className="flex flex-col gap-3">
        <Field label="Name" error={errors.playerName}>
          <input name="playerName" className="field" defaultValue={defaults?.name} placeholder="Juan dela Cruz" autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.playerEmail}>
          <input name="playerEmail" type="email" className="field" defaultValue={defaults?.email} placeholder="juan@example.ph" autoComplete="email" />
        </Field>
        <Field label="Mobile" error={errors.playerPhone}>
          <input name="playerPhone" type="tel" className="field" defaultValue={defaults?.phone} placeholder="09171234567" autoComplete="tel" />
        </Field>
      </div>

      {errors._ && (
        <p className="mt-3 rounded-[10px] border border-board-red/40 bg-board-red/10 px-3.5 py-2.5 text-[12.5px] text-[#ff9370]">
          {errors._}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn btn-solid mt-5 w-full py-3.5 text-sm">
        {status === "submitting" ? "Joining…" : full ? "Join waitlist" : "Join session"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-[11.5px] text-[#ff9370]">{error}</span>}
    </label>
  );
}
