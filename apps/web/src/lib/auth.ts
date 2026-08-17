import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Password hashing for real User accounts (see schema.prisma's User
 * model). Deliberately node:crypto's scrypt rather than adding
 * bcrypt/argon2 as a new dependency — this codebase already leans on
 * node:crypto for admin.ts's password comparison, and scrypt is a
 * built-in, memory-hard KDF that doesn't need a native addon. Unlike
 * admin.ts's sessionToken() (a single shared secret, compared as-is),
 * these are many different user-supplied passwords, so each one needs
 * its own random salt — a shared/no salt here would make every
 * account's hash comparable across a leaked table (classic rainbow-
 * table exposure), which admin.ts's single-secret case doesn't have
 * to worry about.
 *
 * Stored format: "<saltHex>:<hashHex>", both fixed-length hex, split
 * on the first ":" (scrypt output is always the same length for a
 * given keylen, so no ambiguity from a ":" inside either half).
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hashHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
