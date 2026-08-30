"use server";

/**
 * Publishing layer for the public /buzz page — deliberately separate
 * from trendScout.ts (which only ever reads signals into the
 * admin-only TrendScoutPanel and never mutates anything). This is the
 * one place a Trend Scout signal is allowed to cross from "admin sees
 * it" to "a visitor sees it," and that crossing is exactly what
 * trendScout.ts's own doc comment said to revisit before doing.
 *
 * What changes at that crossing:
 * - Only title + url + source + the admin's own optional note are
 *   ever stored/rendered here — never TrendSignal.snippet. Title+link
 *   is ordinary link-curation (how any linkblog or "worth reading"
 *   roundup works); republishing Google News' own snippet text to end
 *   users is the specific thing that doc comment flagged, so it's
 *   dropped at the boundary rather than carried through.
 * - Nothing here runs on its own. An admin reads a signal in
 *   TrendScoutPanel and explicitly chooses to push it — same
 *   "a human decides" shape as the rest of the Discovery Engine
 *   (see mission.ts's importMode note).
 */

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import type { TrendSource } from "./trendScout";

// "Keeps it fresh" (the whole point) means this is a fixed-size
// rolling window, not an archive — every push trims back down to this
// cap rather than growing forever. ~2x a monthly cadence of weekly
// pushes; easy to change later, nothing else depends on this number.
const TREND_POST_CAP = 20;

// Mirrors CollectionItem's NOTE_MAX_LENGTH (curator-actions.ts) — same
// reasoning: a short editorial line, not a re-hosted article.
const NOTE_MAX_LENGTH = 140;

export interface TrendPostView {
  id: string;
  title: string;
  url: string;
  source: string;
  note: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface PublishTrendPostInput {
  title: string;
  url: string;
  source: TrendSource;
  publishedAt: string | null;
  note?: string;
}

/**
 * Pushes one Trend Scout signal onto /buzz. Upserts by url: pushing a
 * story that's already published just bumps it back to the top
 * (fresh createdAt) instead of creating a second row competing for
 * the same fixed-size window.
 */
export async function publishTrendPost(input: PublishTrendPostInput): Promise<void> {
  await requireAdmin();

  const title = input.title.trim();
  const url = input.url.trim();
  if (!title || !url) throw new Error("Signal is missing a title or url.");

  const note = input.note?.trim() || null;
  if (note && note.length > NOTE_MAX_LENGTH) {
    throw new Error(`Note must be ${NOTE_MAX_LENGTH} characters or fewer.`);
  }

  await prisma.trendPost.upsert({
    where: { url },
    create: {
      title,
      url,
      source: input.source,
      note,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    },
    update: {
      title,
      note,
      createdAt: new Date(), // re-pushing bumps it fresh to the top
    },
  });

  await trimToCap();
  revalidatePath("/buzz");
}

/** Deletes anything beyond the newest TREND_POST_CAP rows, newest-first. */
async function trimToCap(): Promise<void> {
  const overflow = await prisma.trendPost.findMany({
    orderBy: { createdAt: "desc" },
    skip: TREND_POST_CAP,
    select: { id: true },
  });
  if (overflow.length === 0) return;
  await prisma.trendPost.deleteMany({ where: { id: { in: overflow.map((p) => p.id) } } });
}

/** Manual pull, independent of the automatic cap trim above. */
export async function removeTrendPost(id: string): Promise<void> {
  await requireAdmin();
  await prisma.trendPost.delete({ where: { id } });
  revalidatePath("/buzz");
}

/**
 * Public — no admin gate, this is what /buzz itself renders. Also
 * used by the admin panel to show what's currently live.
 */
export async function listTrendPosts(): Promise<TrendPostView[]> {
  return prisma.trendPost.findMany({
    orderBy: { createdAt: "desc" },
    take: TREND_POST_CAP,
  });
}
