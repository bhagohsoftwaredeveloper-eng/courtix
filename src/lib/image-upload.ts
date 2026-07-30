/**
 * Avatar upload rules. Pure and dependency-free so the checks that decide what
 * lands in the database can be unit-tested — see `tests/image-upload.test.ts`.
 */

/** Matches the limit the upload card advertises. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPE_LABEL = "5MB";

/** What the file input offers, and the only types `sniffImageType` returns. */
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export type AvatarMimeType = "image/jpeg" | "image/png" | "image/webp";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, i) => bytes[offset + i] === byte);

/**
 * Identify an image by its magic bytes.
 *
 * The browser's declared Content-Type is attacker-controlled — anyone can POST
 * a shell script labelled `image/png`. Since these bytes are stored and later
 * served back with a Content-Type header, the format has to be established
 * from the file itself.
 */
export function sniffImageType(bytes: Uint8Array): AvatarMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WEBP is a RIFF container; the fourth word names the payload, and RIFF alone
  // would also match WAV and AVI.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export type AvatarCheck =
  | { ok: true; mimeType: AvatarMimeType }
  | { ok: false; error: string };

/** Size first, then contents — no point sniffing bytes we would reject anyway. */
export function validateAvatar(bytes: Uint8Array): AvatarCheck {
  if (bytes.length === 0) return { ok: false, error: "Choose an image to upload." };
  if (bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, error: `That image is over ${AVATAR_TYPE_LABEL}.` };
  }

  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { ok: false, error: "Use a JPG, PNG or WEBP image." };

  return { ok: true, mimeType };
}
