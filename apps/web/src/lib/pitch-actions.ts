"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================
// PITCH OPERATIONS
// ============================================

export interface SubmitPitchState {
  error?: string;
  pitchId?: string;
}

export async function submitPitch(
  _prevState: SubmitPitchState,
  formData: FormData
): Promise<SubmitPitchState> {
  try {
    const writerId = str(formData, "writerId");
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

    const pitch = await prisma.pitch.create({
      data: {
        writerId,
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

    revalidatePath("/pitches");
    revalidatePath(`/writer/${writerId}`);

    return { pitchId: pitch.id };
  } catch (err) {
    console.error("Failed to submit pitch:", err);
    return { error: "Failed to submit pitch. Please try again." };
  }
}

export async function getPitchDetail(pitchId: string) {
  try {
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: {
        writer: {
          select: { id: true, displayName: true, bio: true, portfolioUrl: true, social: true },
        },
        bookmarkRecords: {
          select: { producerId: true },
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

    let whereClause: any = { status: "active" };

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

    if (tropeTags?.length) {
      whereClause.tropeTags = {
        hasSome: tropeTags,
      };
    }

    if (moodTags?.length) {
      whereClause.moodTags = {
        hasSome: moodTags,
      };
    }

    if (targetPlatforms?.length) {
      whereClause.targetPlatforms = {
        hasSome: targetPlatforms,
      };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "most-bookmarked") {
      orderBy = { bookmarks: "desc" };
    } else if (sortBy === "most-viewed") {
      orderBy = { views: "desc" };
    } else if (sortBy === "trending") {
      orderBy = [{ bookmarks: "desc" }, { createdAt: "desc" }];
    }

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
// BOOKMARKS
// ============================================

export async function bookmarkPitch(pitchId: string, producerId: string) {
  try {
    await prisma.pitchBookmark.upsert({
      where: { pitchId_producerId: { pitchId, producerId } },
      update: {},
      create: { pitchId, producerId },
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

export async function unbookmarkPitch(pitchId: string, producerId: string) {
  try {
    const bookmark = await prisma.pitchBookmark.delete({
      where: { pitchId_producerId: { pitchId, producerId } },
    });

    if (bookmark) {
      await prisma.pitch.update({
        where: { id: pitchId },
        data: { bookmarks: { decrement: 1 } },
      });
    }

    revalidatePath(`/pitch/${pitchId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to unbookmark" };
  }
}

export async function getProducerBookmarks(producerId: string) {
  try {
    return await prisma.pitchBookmark.findMany({
      where: { producerId },
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
// MESSAGING
// ============================================

export async function sendMessage(
  fromWriterId: string | null,
  fromProducerId: string | null,
  toWriterId: string | null,
  toProducerId: string | null,
  pitchId: string | null,
  body: string
) {
  try {
    if (!body || body.length < 1 || body.length > 2000) {
      return { error: "Message must be 1-2000 characters" };
    }

    const message = await prisma.message.create({
      data: {
        fromWriterId: fromWriterId || undefined,
        fromProducerId: fromProducerId || undefined,
        toWriterId: toWriterId || undefined,
        toProducerId: toProducerId || undefined,
        pitchId: pitchId || undefined,
        body,
      },
    });

    revalidatePath("/messages");
    return { success: true, messageId: message.id };
  } catch (err) {
    console.error("Failed to send message:", err);
    return { error: "Failed to send message" };
  }
}

export async function getMessages(writerId?: string, producerId?: string) {
  try {
    if (!writerId && !producerId) {
      return [];
    }

    return await prisma.message.findMany({
      where: {
        OR: [
          { toWriterId: writerId },
          { toProducerId: producerId },
          { fromWriterId: writerId },
          { fromProducerId: producerId },
        ],
      },
      include: {
        fromWriter: { select: { displayName: true } },
        fromProducer: { select: { companyName: true } },
        toWriter: { select: { displayName: true } },
        toProducer: { select: { companyName: true } },
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

function splitComma(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
