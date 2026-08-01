"use client";

import { useActionState, useRef } from "react";

import {
  removeAvatarAction,
  uploadAvatarAction,
  type AvatarState,
} from "@/app/account/profile/actions";
import { AVATAR_ACCEPT, AVATAR_TYPE_LABEL } from "@/lib/image-upload";
import { initialsOf } from "@/lib/format";

/**
 * The profile photo card. Its own form and its own action: an image round-trips
 * megabytes, and folding it into the details form would make every text edit
 * re-upload the picture.
 */
export function AvatarCard({ name, src }: { name: string; src: string | null }) {
  const [state, action, pending] = useActionState<AvatarState, FormData>(uploadAvatarAction, {});
  const form = useRef<HTMLFormElement>(null);

  return (
    <section className="panel h-fit text-center">
      <h2 className="mb-5 font-sans text-sm font-extrabold normal-case tracking-normal">
        Profile photo
      </h2>

      <div className="mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full border border-line-white/15 bg-card">
        {src ? (
          // Plain <img>: next/image optimises by URL, and this one is private,
          // per-user and already sized.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="font-mono text-[26px] font-semibold text-ball-yellow">
            {initialsOf(name)}
          </span>
        )}
      </div>

      <form ref={form} action={action}>
        <label className="btn btn-ghost mx-auto cursor-pointer text-[12.5px]">
          {pending ? "Uploading…" : "Upload"}
          <input
            type="file"
            name="avatar"
            accept={AVATAR_ACCEPT}
            disabled={pending}
            // Submitting on change keeps the card to a single control, the way
            // the design has it — no "choose file, then press upload".
            onChange={() => form.current?.requestSubmit()}
            className="sr-only"
          />
        </label>
      </form>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        JPG, PNG or WEBP. Max {AVATAR_TYPE_LABEL}.
      </p>

      {state.error && (
        <p role="alert" className="mt-3 text-[11.5px] text-[#ff9370]">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="mt-3 text-[11.5px] text-ball-yellow">
          Photo updated.
        </p>
      )}

      {src && (
        <form action={removeAvatarAction} className="mt-3">
          <button
            type="submit"
            className="text-[11.5px] font-semibold text-muted underline-offset-2 transition-colors hover:text-[#ff9370] hover:underline"
          >
            Remove photo
          </button>
        </form>
      )}
    </section>
  );
}
