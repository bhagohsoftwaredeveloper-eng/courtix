import { describe, expect, it } from "vitest";

import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPE_LABEL,
  sniffImageType,
  validateAvatar,
} from "@/lib/image-upload";

/** Minimal byte headers — a sniffer only ever reads the first few bytes. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);

function webp(): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  bytes.set([0x00, 0x00, 0x00, 0x00], 4); // length, unread
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  return bytes;
}

/** Pads a header out to `size` so byte-length rules can be exercised. */
function sized(header: Uint8Array, size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(header.slice(0, Math.min(header.length, size)));
  return bytes;
}

describe("sniffImageType", () => {
  it("recognises the three formats the form accepts", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(webp())).toBe("image/webp");
  });

  it("rejects an image format that is not on the list", () => {
    expect(sniffImageType(GIF)).toBeNull();
  });

  it("rejects bytes that are not an image at all", () => {
    expect(sniffImageType(new TextEncoder().encode("<?php echo 1; ?>"))).toBeNull();
  });

  it("rejects a file too short to carry a signature", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it("does not accept RIFF that is not WEBP", () => {
    const wav = webp();
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
    expect(sniffImageType(wav)).toBeNull();
  });
});

describe("validateAvatar", () => {
  it("accepts a real JPEG within the size cap", () => {
    expect(validateAvatar(sized(JPEG, 2048))).toEqual({ ok: true, mimeType: "image/jpeg" });
  });

  it("rejects an empty file, which is what an untouched file input submits", () => {
    expect(validateAvatar(new Uint8Array())).toEqual({
      ok: false,
      error: "Choose an image to upload.",
    });
  });

  it("rejects a file over the cap before looking at its contents", () => {
    const result = validateAvatar(sized(JPEG, AVATAR_MAX_BYTES + 1));
    expect(result).toEqual({ ok: false, error: `That image is over ${AVATAR_TYPE_LABEL}.` });
  });

  it("accepts a file exactly on the cap", () => {
    expect(validateAvatar(sized(PNG, AVATAR_MAX_BYTES))).toEqual({
      ok: true,
      mimeType: "image/png",
    });
  });

  it("rejects a disallowed format by its bytes, not its name", () => {
    expect(validateAvatar(sized(GIF, 2048))).toEqual({
      ok: false,
      error: "Use a JPG, PNG or WEBP image.",
    });
  });

  it("rejects a script renamed to look like an image", () => {
    const disguised = new TextEncoder().encode("#!/bin/sh\nrm -rf /\n");
    expect(validateAvatar(disguised)).toEqual({
      ok: false,
      error: "Use a JPG, PNG or WEBP image.",
    });
  });
});
