import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const ADMIN_COOKIE = "kilig_admin";

/**
 * DB-backed admin gate — the single operator account for the admin
 * surface (see schema.prisma's Admin model). This replaced the original
 * env-var-only check (compare ADMIN_PASSWORD directly): a DB row means
 * the admin password can be changed in-app, and when it is, every
 * previously-issued session cookie stops working at once (each cookie
 * is a random token whose sha256 is stored on the row — rotate the
 * token on password change and old sessions die with it).
 *
 * The env var isn't gone, it's demoted to bootstrap: on first login
 * with no Admin row present, seedAdminFromEnv() creates one hashed
 * from ADMIN_PASSWORD. Once a row exists the env var is never read
 * again. ADMIN_RECOVERY_KEY is the escape hatch if the admin password
 * is ever lost (see recoverAdminAction in admin-actions.ts) — it's
 * checked against the env var, never stored.
 *
 * The cookie never holds the raw password — it holds a random session
 * token (sha256 stored server-side), so a leaked cookie value doesn't
 * hand over the actual credential. It's httpOnly regardless, but this
 * is cheap defense in depth.
 */

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create the Admin row from ADMIN_PASSWORD the first time it's needed. */
export async function ensureAdminSeeded(): Promise<void> {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return; // no password configured = admin stays fully closed

  const existing = await prisma.admin.findFirst({ select: { id: true } });
  if (existing) return;

  await prisma.admin.create({
    data: { username: "admin", passwordHash: hashPassword(envPassword) },
  });
}

/**
 * Whether the current request has a live admin session. Also performs
 * the one-time seed so a fresh deploy where the DB is empty but
 * ADMIN_PASSWORD is set "just works" on the first check.
 */
export async function isAdminSession(): Promise<boolean> {
  await ensureAdminSeeded();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  const admin = await prisma.admin.findFirst({
    select: { sessionToken: true },
  });
  if (!admin?.sessionToken) return false;

  return timingSafeStringEqual(hashToken(token), admin.sessionToken);
}

/**
 * Guard for the admin Server Actions in actions.ts (createTitle,
 * addAvailability, addReaction). Throws rather than redirecting —
 * these are called from form actions / programmatically, not rendered
 * as a page, so a thrown error is what the caller can actually handle.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error("Not authorized — log in at /admin/login first.");
  }
}

/**
 * Issues a fresh admin session: rotates the row's session token and
 * returns the raw cookie value. Called after a successful password
 * login OR a recovery-key reset — both are "prove you're the admin,
 * start a session" moments, and both should invalidate any old session
 * a stolen cookie might still hold.
 */
export async function issueAdminSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) throw new Error("No admin account exists yet.");
  await prisma.admin.update({
    where: { id: admin.id },
    data: { sessionToken: hashToken(token) },
  });
  return token;
}

/** Revokes the current session — logout, or the tail of a password change. */
export async function clearAdminSession(): Promise<void> {
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (admin) {
    await prisma.admin.update({ where: { id: admin.id }, data: { sessionToken: null } });
  }
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

/** Set the admin cookie to a freshly-issued session token. */
export async function setAdminCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}
