import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const WRITER_COOKIE = "veereel_writer_id";

/**
 * The cookie identifying which Writer row a browser is acting as.
 * Mirrors lib/platform.ts's PLATFORM_COOKIE / lib/curator.ts's
 * CURATOR_COOKIE exactly, as a sibling — a browser can be signed in as
 * a writer, a curator, and a platform simultaneously in different
 * tabs, with no identity overwriting another. Set only via
 * signInWithEmail() (see its writer branch) or immediately after
 * registerWriter() creates the row.
 *
 * Same read-only contract as peekPlatformId()/peekCuratorId(): never
 * creates a Writer as a side effect, only reads or clears the cookie.
 */
export async function peekWriterId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(WRITER_COOKIE)?.value ?? null;
}

/**
 * Sets the writer cookie once the Writer row exists. Only call from
 * within a 'use server' function, same restriction as the curator/
 * platform session cookies.
 */
export async function setWriterCookie(writerId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(WRITER_COOKIE, writerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

/** Clears the writer cookie — account deletion and the sign-out path. */
export async function clearWriterCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(WRITER_COOKIE);
}

/**
 * The guard every Writer-gated Server Action must call — and the
 * ONLY place a writer's identity should ever come from in a mutation.
 * The pitch platform's original build took writerId as a bare
 * parameter from FormData/client calls in every action (submitPitch,
 * sendMessage, etc.) with nothing checking it against the actual
 * session — meaning anyone could submit a pitch or send a message as
 * any writer just by naming their id. Every rewritten action in
 * pitch-actions.ts calls this instead of trusting a passed-in id.
 *
 * Same redirect-not-error-state contract as requirePlatform()/
 * requireReclaimedCurator(): "not signed in as a writer" is a normal,
 * expected mid-flow state, not a failure.
 */
export async function requireWriter(
  nextPath: string
): Promise<{ id: string; displayName: string }> {
  const writerId = await peekWriterId();
  if (!writerId) redirect(`/writer/login?next=${encodeURIComponent(nextPath)}`);

  const writer = await prisma.writer.findUnique({
    where: { id: writerId },
    select: { id: true, displayName: true },
  });
  if (!writer) redirect(`/writer/login?next=${encodeURIComponent(nextPath)}`);

  return writer;
}
