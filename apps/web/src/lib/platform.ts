import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const PLATFORM_COOKIE = "kilig_platform_id";

/**
 * The cookie identifying which Platform row a browser is acting as.
 * Mirrors the curator cookie (kilig_curator_id, see lib/curator.ts)
 * exactly, deliberately as a sibling rather than the same cookie:
 * a browser can act as a Platform in one tab and a curator in another
 * without one identity overwriting the other, and no account type
 * ever shares a session with another. Set only via signInWithEmail()
 * (see its platform branch) — a Platform is never self-claimed the way
 * a curator name is; rows are created by an admin (createPlatformAccount()
 * in platform-admin-actions.ts), which is the trust boundary.
 *
 * Same read-only contract as peekCuratorId(): never creates a
 * Platform as a side effect, only reads or clears the cookie.
 */
export async function peekPlatformId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PLATFORM_COOKIE)?.value ?? null;
}

/**
 * Sets the platform cookie once the Platform row exists. Only call
 * from within a 'use server' function (signInWithEmail's platform
 * branch), same restriction as the curator/anon session cookies.
 */
export async function setPlatformCookie(platformId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_COOKIE, platformId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Clears the platform cookie — future platform account deletion, and the sign-out path. */
export async function clearPlatformCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PLATFORM_COOKIE);
}

/**
 * The guard every Platform-gated Server Action should call. Peeks the
 * platform cookie, confirms the Platform row still exists (a stale
 * cookie pointing at a deleted account is treated as logged out, not
 * an error), and redirects to /signin with a `next` round-trip when
 * absent — same redirect-not-error-state contract as
 * requireReclaimedCurator() in lib/curator.ts: "not signed in as a
 * platform" is a normal, expected mid-flow state, not a failure. Also
 * returns the Platform row itself (id, name, slug, isVerified) so
 * callers don't re-query it.
 *
 * The plan's partner-publishing flow does NOT require isVerified for
 * every call — verification is baked in at creation time
 * (createPlatformAccount always sets isVerified: true), so by the
 * time a Platform row exists it's already a verified partner. This
 * guard just confirms identity.
 */
export async function requirePlatform(
  nextPath?: string
): Promise<{ id: string; name: string; slug: string }> {
  const platformId = await peekPlatformId();
  if (!platformId) {
    // No nextPath: sign in without one so signInWithEmail()'s fallback
    // (the platform's own /kilig/platform/[slug] page) routes them
    // back home after signing in.
    redirect(nextPath ? `/kilig/signin?next=${encodeURIComponent(nextPath)}` : "/kilig/signin");
  }

  const platform = await prisma.platform.findUnique({
    where: { id: platformId },
    select: { id: true, name: true, slug: true },
  });
  if (!platform) redirect(`/kilig/signin`);

  return platform;
}