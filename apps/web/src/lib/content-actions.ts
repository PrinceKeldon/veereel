"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { generateCaption } from "@/lib/contentCaption";
import { optimizeForPlatforms, type ContentFormatId, type PlatformCaptions } from "@/lib/contentFormats";

// Same floor and window as page.tsx's TrendingRail — this is a second
// caller of the identical honesty-gating pattern, not a second
// definition of what "trending" means. The original build of this
// dashboard's "Trending This Week" dropdown was, on inspection, just
// the newest-titles list relabeled — this replaces it with the real
// query.
const MIN_CLICKS_FOR_TRENDING = 5;

export interface ContentTitle {
  id: string;
  name: string;
  tropeTags: string[];
  moodTags: string[];
}

export async function getTrendingTitlesForContent(): Promise<ContentTitle[]> {
  await requireAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const grouped = await prisma.userInteraction.groupBy({
    by: ["titleId"],
    where: { action: "clicked_out", createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    having: { id: { _count: { gte: MIN_CLICKS_FOR_TRENDING } } },
    take: 10,
  });

  if (grouped.length === 0) return [];

  const titles = await prisma.title.findMany({
    where: { id: { in: grouped.map((g) => g.titleId) }, isPublished: true, curatorDraft: false },
    select: { id: true, name: true, tropeTags: true, moodTags: true },
  });

  return grouped
    .map((g) => titles.find((t) => t.id === g.titleId))
    .filter((t): t is (typeof titles)[number] => t != null);
}

export interface GenerateCaptionResult {
  caption: string;
  platformCaptions?: PlatformCaptions;
  unavailableReason?: string;
}

export async function generateCaptionAction(titleId: string, formatId: ContentFormatId): Promise<GenerateCaptionResult> {
  await requireAdmin();

  const title = await prisma.title.findUnique({
    where: { id: titleId, isPublished: true, curatorDraft: false },
    select: { id: true, name: true, synopsis: true, tropeTags: true, moodTags: true },
  });
  if (!title) return { caption: "", unavailableReason: "Title not found or not published." };

  const { caption, unavailableReason } = await generateCaption(formatId, title);
  if (!caption) return { caption: "", unavailableReason };

  return { caption, platformCaptions: optimizeForPlatforms(caption) };
}

export interface MarkContentPostedInput {
  titleId: string;
  format: string;
  platform: string;
  caption: string;
  postUrl: string;
}

/**
 * Real persistence — the original build's "Mark as Posted" only ever
 * touched useState (gone on refresh) and console.log'd the URL. This
 * is the actual fix: a ContentPost row, so posting history survives a
 * reload and can be looked back on.
 */
export async function markContentPosted(input: MarkContentPostedInput): Promise<{ error?: string }> {
  await requireAdmin();

  const titleId = input.titleId.trim();
  const format = input.format.trim();
  const platform = input.platform.trim();
  const caption = input.caption.trim();
  const postUrl = input.postUrl.trim();

  if (!titleId || !format || !platform || !caption || !postUrl) {
    return { error: "All fields are required." };
  }

  await prisma.contentPost.create({
    data: { titleId, format, platform, caption, postUrl },
  });

  revalidatePath("/admin/content-daily-routine");
  return {};
}

export interface RecentContentPost {
  id: string;
  titleName: string;
  format: string;
  platform: string;
  postUrl: string;
  postedAt: Date;
}

export async function getRecentContentPosts(take = 20): Promise<RecentContentPost[]> {
  await requireAdmin();

  const posts = await prisma.contentPost.findMany({
    orderBy: { postedAt: "desc" },
    take,
    include: { title: { select: { name: true } } },
  });

  return posts.map((p) => ({
    id: p.id,
    titleName: p.title.name,
    format: p.format,
    platform: p.platform,
    postUrl: p.postUrl,
    postedAt: p.postedAt,
  }));
}
