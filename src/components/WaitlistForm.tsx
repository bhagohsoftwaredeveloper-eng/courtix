"use client";

import { useState } from "react";
import { SPORTS } from "@/lib/data/sports";
import { fieldErrors, waitlistSchema } from "@/lib/validation";
import type { SportSlug, WaitlistRole } from "@/lib/types";

const ROLES: { value: WaitlistRole; label: string; hint: string }[] = [
  { value: "player", label: "I want to play", hint: "Book courts near me" },
  { value: "owner", label: "I own a court", hint: "List and fill my slots" },
  { value: "both", label: "Both", hint: "I play and I host" },
];

type Status = "idle" | "submitting" | "done";

interface Result {
  position: number;
  alreadyJoined: boolean;
}

/**
 * The waitlist CTA. Validates client-side with the same zod schema the API
 * route uses, so the messages a visitor sees are exactly the ones the server
 * would produce — and the server still re-validates on arrival.
 *
 * `compact` drops the optional fields for the inline landing-page placement.
 */
export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [sports, setSports] = useState<SportSlug[]>([]);
  const [role, setRole] = useState<WaitlistRole>("player");

  function toggleSport(slug: SportSlug) {
    setSports((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      city: String(fd.get("city") ?? ""),
      notes: String(fd.get("notes") ?? ""),
      website: String(fd.get("website") ?? ""),
      role,
      sports,
    };

    const parsed = waitlistSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json();

      if (!res.ok) {
        setErrors(body.errors ?? { _: body.message ?? "Something went wrong. Try again." });
        setStatus("idle");
        return;
      }

      setResult({ position: body.position, alreadyJoined: Boolean(body.alreadyJoined) });
      setStatus("done");
    } catch {
      setErrors({ _: "Couldn't reach the server. Check your connection and try again." });
      setStatus("idle");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="panel animate-[pop_0.22s_ease] text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ball-yellow text-2xl text-ink">
          ✓
        </div>
        <h3 className="font-sans text-xl font-extrabold normal-case tracking-normal">
          {result.alreadyJoined ? "You're already on the list" : "You're on the list"}
        </h3>
        <p className="mx-auto mt-2.5 max-w-[340px] text-sm leading-relaxed text-muted">
          {result.alreadyJoined
            ? "We found your email already in the queue — no need to sign up twice."
            : "We'll email you the moment Courtix opens in your city. Early members get their first booking free."}
        </p>
        <p className="mt-6 font-mono text-sm text-ball-yellow">
          Queue position #{result.position.toLocaleString("en-PH")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel relative">
      {!compact && (
        <>
          <p className="eyebrow mb-4">Launching across Davao in 2026</p>
          <h3 className="font-sans text-2xl font-extrabold normal-case tracking-normal">
            Get first access to Courtix
          </h3>
          <p className="mt-2.5 mb-6 max-w-[420px] text-sm leading-relaxed text-muted">
            We’re onboarding courts city by city. Tell us where you play and we’ll open your area
            first — plus your first booking is on us.
          </p>
        </>
      )}

      <div className={compact ? "grid gap-3.5 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
        <Field label="Full name" error={errors.name}>
          <input name="name" className="field" placeholder="Juan dela Cruz" autoComplete="name" />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            name="email"
            type="email"
            className="field"
            placeholder="juan@example.ph"
            autoComplete="email"
          />
        </Field>

        <Field label="City" error={errors.city}>
          <input name="city" className="field" placeholder="Tagum City" autoComplete="address-level2" />
        </Field>

        <Field label="Mobile (optional)" error={errors.phone}>
          <input
            name="phone"
            type="tel"
            className="field"
            placeholder="09171234567"
            autoComplete="tel"
          />
        </Field>
      </div>

      {/* ---- role ---- */}
      <fieldset className="mt-5">
        <legend className="field-label">How would you use Courtix?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={`rounded-[11px] border px-3 py-3 text-left transition-colors ${
                role === r.value
                  ? "border-ball-yellow bg-ball-yellow/10"
                  : "border-line-white/14 hover:border-line-white/35"
              }`}
            >
              <span className="block text-[13px] font-bold">{r.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted">{r.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* ---- sports ---- */}
      <fieldset className="mt-5">
        <legend className="field-label">Which sports? (pick all that apply)</legend>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => {
            const on = sports.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggleSport(s.slug)}
                aria-pressed={on}
                className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
                  on
                    ? "border-ball-yellow bg-ball-yellow text-ink"
                    : "border-line-white/18 text-muted hover:border-line-white/40 hover:text-line-white"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        {errors.sports && <ErrorText>{errors.sports}</ErrorText>}
      </fieldset>

      {!compact && (
        <Field label="Anything else? (optional)" error={errors.notes} className="mt-5">
          <textarea
            name="notes"
            rows={3}
            className="field resize-y"
            placeholder="e.g. I run a Saturday league of 16 players and we struggle to find courts."
          />
        </Field>
      )}

      {/* Honeypot: visually hidden, never focusable, bots fill it anyway. */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {errors._ && (
        <p className="mt-4 rounded-[10px] border border-board-red/40 bg-board-red/10 px-3.5 py-3 text-[13px] text-[#ff9370]">
          {errors._}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn btn-solid mt-6 w-full py-3.5 text-sm">
        {status === "submitting" ? "Joining…" : "Join the waitlist"}
      </button>

      <p className="mt-3 text-center text-[11.5px] text-muted">
        No spam. One email when we launch in your city, and nothing else.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 block text-[11.5px] text-[#ff9370]">{children}</span>;
}
