import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const CURATOR_COOKIE = "kilig_curator_id";

/**
 * The cookie identifying which Curator row a browser has claimed.
 * Claiming a name (claimDisplayName()) is still instant and
 * password-free — this cookie is set the moment that happens, before
 * any email exists — but it's no longer the *whole* identity story:
 * see peekCuratorAuthStatus() below for the User layer on top of it
 * (schema.prisma's Curator/User comments, and ARCHITECTURE.md's
 * Collections + real-accounts sections, for why that layer exists).
 * This cookie's own shape mirrors session.ts's anonymous session
 * cookie for a different purpose: session.ts identifies a browsing
 * session for interaction logging, this identifies a claimed public
 * identity for publishing Collections and following other curators. A
 * browser can have both, or the curator cookie alone can be absent —
 * most visitors never claim a name at all.
 *
 * Unlike getSessionId(), this never creates a Curator as a side
 * effect of being called — a Curator only comes into existence via
 * claimDisplayName() (lib/curator-actions.ts) when someone explicitly
 * picks a name. This function only ever reads or clears the cookie.
 *
 * Next.js only allows cookie mutation inside a Server Action or Route
 * Handler — see setCuratorCookie() below, called from
 * claimDisplayName() after the Curator row is created.
 */
export async function peekCuratorId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURATOR_COOKIE)?.value ?? null;
}

/**
 * Sets the curator cookie once a Curator row exists. Only call from
 * within a 'use server' function (claimDisplayName), same restriction
 * as getSessionId() in session.ts.
 */
export async function setCuratorCookie(curatorId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CURATOR_COOKIE, curatorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Clears the curator cookie — used on account deletion (see deleteAccount() in curator-actions.ts). */
export async function clearCuratorCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CURATOR_COOKIE);
}

/**
 * Like peekCuratorId(), but also reports whether the claimed Curator
 * has a real User attached yet (see schema.prisma's User model and
 * the userId column added to Curator). Every Curator claimed from
 * this point forward is routed straight into /reclaim (see
 * claimDisplayName()'s redirect in curator-actions.ts); this only
 * ever returns hasUser: false for a curator claimed before real
 * accounts existed, or a brand-new one who hasn't submitted the
 * /reclaim form yet. Read-only, same contract as peekCuratorId() —
 * safe to call from a Server Component render body.
 *
 * Deliberately does not report anything about email confirmation —
 * an email is stored as-typed the moment reclaimCurator() runs, with
 * nothing to confirm. An earlier pass added a confirmation-link step
 * here and then deliberately dropped it: the extra friction (and the
 * dependency on a working transactional-email provider) wasn't worth
 * it for what this app needs an email for right now.
 */
export async function peekCuratorAuthStatus(): Promise<
  { curatorId: string; hasUser: boolean } | null
> {
  const curatorId = await peekCuratorId();
  if (!curatorId) return null;

  const curator = await prisma.curator.findUnique({
    where: { id: curatorId },
    select: { userId: true },
  });
  // Stale cookie pointing at a row that no longer exists (e.g. the
  // curator deleted their account elsewhere) — treat as logged out
  // rather than throwing.
  if (!curator) return null;

  return { curatorId, hasUser: curator.userId !== null };
}

/**
 * The guard every identity-gated Server Action should call instead of
 * a bare peekCuratorId() check, now that Curator identity comes in
 * two states: no curator claimed at all, or a curator claimed who
 * hasn't submitted the /reclaim (email) form yet. Redirects rather
 * than returning an error state — both are normal, expected mid-flow
 * states, not failures — and `nextPath` round-trips through /claim or
 * /reclaim the same way it already does (see safeNextPath() in
 * curator-actions.ts) so the visitor lands back where they were
 * headed once they're done.
 *
 * Deliberately NOT called from page-load gates like
 * /collection/[id]'s or /curator/[displayName]'s existing
 * `if (!peekCuratorId()) redirect('/claim...')` — those are about
 * whether a page is *viewable*, unrelated to whether the viewer's own
 * curator has a User yet. This only guards actions: adding to a
 * Collection, following, liking, submitting a title, editing a
 * Collection name.
 */
export async function requireReclaimedCurator(nextPath: string): Promise<string> {
  const status = await peekCuratorAuthStatus();
  if (!status) redirect(`/claim?next=${encodeURIComponent(nextPath)}`);
  if (!status.hasUser) redirect(`/reclaim?next=${encodeURIComponent(nextPath)}`);
  return status.curatorId;
}
