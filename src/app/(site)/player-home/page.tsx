import { permanentRedirect } from "next/navigation";

/**
 * The player home moved into the account portal. Kept as a redirect because
 * the old path was linked from the footer, the nav and any bookmark a demo
 * viewer made.
 */
export default function PlayerHomeRedirect(): never {
  permanentRedirect("/account");
}
