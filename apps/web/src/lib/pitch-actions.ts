"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWriter, peekWriterId } from "@/lib/writer";
import { requirePlatform, peekPlatformId } from "@/lib/platform";

// ============================================
// PITCH OPERATIONS
// ============================================
//
// Every mutation and every private read below derives identity from
// the session (requireWriter()/requirePlatform(), or a soft peek where
// either identity type is acceptable) — never from a client-supplied
// id parameter. The original build took writerId/producerId as bare
// parameters from FormData or direct arguments with no check that the
// caller actually owned that id: anyone could submit a pitch as any
// writer, bookmark/unbookmark as any producer, or send a message
// impersonating any writer or producer to anyone. That was the
// feature's core trust mechanism and it didn't exist. Fixed here by
// construction — there is no writerId/producerId parameter left to
// forge in any mutation.

export interface SubmitPitchState {
  error?: string;
}

export async function submitPitch(
  _prevState: SubmitPitchState,
  formData: FormData
): Promise<SubmitPitchState> {
  const writer = await requireWriter("/pitch/new");

  const title = str(formData, "title");
  const logline = str(formData, "logline");
  const synopsis = str(formData, "synopsis");
  const tropeTags = splitComma(str(formData, "tropeTags"));
  const moodTags = splitComma(str(formData, "moodTags"));
  const episodeCountStr = str(formData, "episodeCount");
  const targetPlatforms = splitComma(str(formData, "targetPlatforms"));
  const pitchVideoUrl = optionalStr(formData, "pitchVideoUrl");

  if (!title || !logline || !synopsis) {
    return { error: "Title, logline, and synopsis are required" };
  }
  if (title.length < 5 || title.length > 100) {
    return { error: "Title must be 5-100 characters" };
  }
  if (logline.length < 10 || logline.length > 150) {
    return { error: "Logline must be 10-150 characters" };
  }
  if (synopsis.length < 50 || synopsis.length > 2000) {
    return { error: "Synopsis must be 50-2000 characters" };
  }

  const episodeCount = episodeCountStr ? parseInt(episodeCountStr, 10) : undefined;
  if (episodeCount && (episodeCount < 1 || episodeCount > 500)) {
    return { error: "Episode count must be 1-500" };
  }

  let pitchId: string;
  try {
    const pitch = await prisma.pitch.create({
      data: {
        writerId: writer.id,
        title,
        logline,
        synopsis,
        tropeTags: tropeTags.filter(Boolean),
        moodTags: moodTags.filter(Boolean),
        episodeCountEst: episodeCount,
        targetPlatforms: targetPlatforms.filter(Boolean),
        pitchVideoUrl: pitchVideoUrl || undefined,
        status: "active",
      },
    });
    pitchId = pitch.id;
  } catch (err) {
    console.error("Failed to submit pitch:", err);
    return { error: "Failed to submit pitch. Please try again." };
  }

  revalidatePath("/pitches");
  revalidatePath(`/writer/${writer.displayName}`);
  redirect(`/pitch/${pitchId}`);
}

// Public read — pitch detail pages are meant to be visible to anyone,
// per the platform's own design (writers want discoverability).
export async function getPitchDetail(pitchId: string) {
  try {
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: {
        writer: {
          select: { id: true, displayName: true, bio: true, portfolioUrl: true, social: true },
        },
        bookmarkRecords: {
          select: { platformId: true },
        },
      },
    });

    if (pitch) {
      await prisma.pitch.update({
        where: { id: pitchId },
        data: { views: { increment: 1 } },
      });
    }

    return pitch;
  } catch (err) {
    console.error("Failed to get pitch:", err);
    return null;
  }
}

export interface PitchFilters {
  tropeTags?: string[];
  moodTags?: string[];
  targetPlatforms?: string[];
  sortBy?: "trending" | "newest" | "most-bookmarked" | "most-viewed";
  search?: string;
  limit?: number;
  offset?: number;
}

// Public read — browsing pitches is the platform's core discovery
// surface, meant for anyone (producers browsing, or the merely
// curious), per the original spec.
export async function getPitches(filters: PitchFilters = {}) {
  try {
    const {
      tropeTags,
      moodTags,
      targetPlatforms,
      sortBy = "newest",
      search,
      limit = 20,
      offset = 0,
    } = filters;

    let whereClause: Record<string, unknown> = { status: "active" };

    if (search && search.length > 2) {
      whereClause = {
        ...whereClause,
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { logline: { contains: search, mode: "insensitive" } },
          { synopsis: { contains: search, mode: "insensitive" } },
        ],
      };
    }
    if (tropeTags?.length) whereClause.tropeTags = { hasSome: tropeTags };
    if (moodTags?.length) whereClause.moodTags = { hasSome: moodTags };
    if (targetPlatforms?.length) whereClause.targetPlatforms = { hasSome: targetPlatforms };

    let orderBy: Record<string, unknown> | Record<string, unknown>[] = { createdAt: "desc" };
    if (sortBy === "most-bookmarked") orderBy = { bookmarks: "desc" };
    else if (sortBy === "most-viewed") orderBy = { views: "desc" };
    else if (sortBy === "trending") orderBy = [{ bookmarks: "desc" }, { createdAt: "desc" }];

    const [pitches, total] = await Promise.all([
      prisma.pitch.findMany({
        where: whereClause,
        include: {
          writer: { select: { displayName: true, portfolioUrl: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.pitch.count({ where: whereClause }),
    ]);

    return { pitches, total, limit, offset };
  } catch (err) {
    console.error("Failed to get pitches:", err);
    return { pitches: [], total: 0, limit: 20, offset: 0 };
  }
}

// Public read — a writer's own pitch list is part of their public
// profile (see /writer/[displayName], "Anyone" per the spec).
export async function getWriterPitches(writerId: string) {
  try {
    return await prisma.pitch.findMany({
      where: { writerId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("Failed to get writer pitches:", err);
    return [];
  }
}

// ============================================
// BOOKMARKS — identity always derived from the Platform session,
// never a passed-in id.
// ============================================

export async function bookmarkPitch(pitchId: string) {
  const platform = await requirePlatform(`/pitch/${pitchId}`);

  try {
    await prisma.pitchBookmark.upsert({
      where: { pitchId_platformId: { pitchId, platformId: platform.id } },
      update: {},
      create: { pitchId, platformId: platform.id },
    });

    await prisma.pitch.update({
      where: { id: pitchId },
      data: { bookmarks: { increment: 1 } },
    });

    revalidatePath(`/pitch/${pitchId}`);
    return { success: true };
  } catch (err) {
    console.error("Failed to bookmark pitch:", err);
    return { success: false, error: "Failed to bookmark" };
  }
}

export async function unbookmarkPitch(pitchId: string) {
  const platform = await requirePlatform(`/pitch/${pitchId}`);

  try {
    await prisma.pitchBookmark.delete({
      where: { pitchId_platformId: { pitchId, platformId: platform.id } },
    });

    await prisma.pitch.update({
      where: { id: pitchId },
      data: { bookmarks: { decrement: 1 } },
    });

    revalidatePath(`/pitch/${pitchId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to unbookmark" };
  }
}

// Always "my own bookmarks" — no platformId parameter to forge.
export async function getPlatformBookmarks() {
  const platform = await requirePlatform("/pitches");

  try {
    return await prisma.pitchBookmark.findMany({
      where: { platformId: platform.id },
      include: {
        pitch: {
          include: {
            writer: { select: { displayName: true } },
          },
        },
      },
      orderBy: { bookmarkedAt: "desc" },
    });
  } catch (err) {
    console.error("Failed to get bookmarks:", err);
    return [];
  }
}

// ============================================
// MESSAGING — the "from" identity is never a parameter. The sender is
// whichever of Writer/Platform the current session is actually signed
// in as (peekWriterId()/peekPlatformId(), a soft read rather than a
// redirecting guard, since this function may be called by either
// identity type and shouldn't force a specific login page). Trying to
// message without being signed in as either returns an error, not a
// forged send.
// ============================================

export interface SendMessageState {
  error?: string;
}

export async function sendMessage(
  toWriterId: string | null,
  toPlatformId: string | null,
  pitchId: string | null,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!body || body.length < 1 || body.length > 2000) {
    return { success: false, error: "Message must be 1-2000 characters" };
  }
  if (!toWriterId && !toPlatformId) {
    return { success: false, error: "A recipient is required" };
  }

  const [writerId, platformId] = await Promise.all([peekWriterId(), peekPlatformId()]);
  if (!writerId && !platformId) {
    return { success: false, error: "Sign in to send a message" };
  }

  try {
    const message = await prisma.message.create({
      data: {
        // Only one of these is ever set, matching whichever identity
        // the session actually has — never both, and never anything
        // the caller supplied.
        fromWriterId: writerId ?? undefined,
        fromPlatformId: writerId ? undefined : (platformId ?? undefined),
        toWriterId: toWriterId || undefined,
        toPlatformId: toPlatformId || undefined,
        pitchId: pitchId || undefined,
        body,
      },
    });

    revalidatePath("/messages");
    return { success: true, messageId: message.id };
  } catch (err) {
    console.error("Failed to send message:", err);
    return { success: false, error: "Failed to send message" };
  }
}

// Always "my own inbox" for whichever identity the session holds — no
// id parameter to forge into reading someone else's messages.
export async function getMessages() {
  const [writerId, platformId] = await Promise.all([peekWriterId(), peekPlatformId()]);
  if (!writerId && !platformId) return [];

  try {
    return await prisma.message.findMany({
      where: {
        OR: [
          writerId ? { toWriterId: writerId } : undefined,
          platformId ? { toPlatformId: platformId } : undefined,
          writerId ? { fromWriterId: writerId } : undefined,
          platformId ? { fromPlatformId: platformId } : undefined,
        ].filter((clause): clause is NonNullable<typeof clause> => clause != null),
      },
      include: {
        fromWriter: { select: { displayName: true } },
        fromPlatform: { select: { name: true } },
        toWriter: { select: { displayName: true } },
        toPlatform: { select: { name: true } },
        pitch: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (err) {
    console.error("Failed to get messages:", err);
    return [];
  }
}

export async function getTrendingTropes(limit = 10) {
  try {
    return await prisma.trendingTrope.findMany({
      where: { weeklyRank: { lte: limit } },
      orderBy: { weeklyRank: "asc" },
      take: limit,
    });
  } catch (err) {
    console.error("Failed to get trending tropes:", err);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string) || "";
}

function optionalStr(formData: FormData, key: string): string | null {
  const val = formData.get(key) as string;
  return val && val.length > 0 ? val : null;
}

function splitComma(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
