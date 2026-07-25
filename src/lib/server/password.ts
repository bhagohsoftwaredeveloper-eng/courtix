/**
 * Password hashing. Deliberately free of Next.js imports so the unit tests can
 * load it directly — `src/lib/server/auth.ts` is the module that touches
 * cookies and the database.
 */
import bcrypt from "bcryptjs";

const ROUNDS = 10;

/**
 * Compared against when the email doesn't exist, so a failed login takes the
 * same time whether or not the account is real. Without it, response timing
 * tells an attacker which addresses are registered.
 */
const DUMMY_HASH = bcrypt.hashSync("courtix-nonexistent-account", ROUNDS);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  } catch {
    // A malformed hash in the database must fail the login, not crash the page.
    return false;
  }
}
