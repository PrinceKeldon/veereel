import { prisma } from "@/lib/prisma";
import type { Title } from "@/generated/prisma/client";

const HERO_SIZE = 5;

// Same honesty floor as page.tsx's MIN_CLICKS_FOR_TRENDING /
// MIN_REACTIONS_FOR_TRENDING — a title needs to have actually been
// collected by more than a couple of curators (not just its own
// submitter) before "most collected" can honestly feature it.
export const MIN_COLLECTS_FOR_HERO = 5;

const HERO_MODE_KEY = "hero_mode";

export type HeroMode = "admin_picks" | "most_collected";

export interface HeroTitle
  extends Pick<
    Title,
    "id" | "name" | "synopsis" | "language" | "moodTags" | "tropeTags" | "coverImageUrl" | "episodeCount" | "pacing"
  > {
  // Only ever set for a title that actually came from the
  // most-collected query — never fabricated for admin picks or the
  // newest-titles fallback, since an unearned "collected by N
  // curators" line would be exactly the kind of manufactured signal
  // this app's trending logic elsewhere goes out of its way to avoid.
  collectCount?: number;
}

const HERO_SELECT = {
  id: true,
  name: true,
  synopsis: true,
  language: true,
  moodTags: true,
  tropeTags: true,
  coverImageUrl: true,
  episodeCount: true,
  pacing: true,
} as const;

/**
 * Reads the admin-set hero mode from AppSetting. Defaults to
 * "admin_picks" — the deliberate pre-launch starting state (see
 * schema.prisma's AppSetting comment) — for both a genuinely unset
 * row and any unrecognized value, rather than silently falling back
 * to a query that might not have enough real data yet.
 */
export async function getHeroMode(): Promise<HeroMode> {
  const setting = await prisma.appSetting.findUnique({ where: { key: HERO_MODE_KEY } });
  return setting?.value === "most_collected" ? "most_collected" : "admin_picks";
}

async function getAdminPickedHeroTitles(): Promise<HeroTitle[]> {
  return prisma.title.findMany({
    where: { heroRank: { not: null }, isPublished: true, curatorDraft: false },
    orderBy: { heroRank: "asc" },
    take: HERO_SIZE,
    select: HERO_SELECT,
  });
}

/**
 * What the hero would show right now if switched to most_collected —
 * exported (not just used internally by getHeroTitles) so the admin
 * hero page can preview real readiness before flipping the switch,
 * rather than the admin guessing from collection counts scattered
 * across individual title pages.
 */
export async function getMostCollectedHeroTitles(): Promise<HeroTitle[]> {
  const grouped = await prisma.collectionItem.groupBy({
    by: ["titleId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    having: { id: { _count: { gte: MIN_COLLECTS_FOR_HERO } } },
    take: HERO_SIZE,
  });
  if (grouped.length === 0) return [];

  const titles = await prisma.title.findMany({
    where: { id: { in: grouped.map((g) => g.titleId) }, isPublished: true, curatorDraft: false },
    select: HERO_SELECT,
  });
  const collectCounts = new Map(grouped.map((g) => [g.titleId, g._count.id]));

  // Preserve the groupBy's ranked order (Prisma's `in` filter doesn't
  // guarantee it) — same pattern as page.tsx's TrendingRail/
  // FandomTrendingRail.
  const ranked: HeroTitle[] = [];
  for (const g of grouped) {
    const title = titles.find((t) => t.id === g.titleId);
    if (title) ranked.push({ ...title, collectCount: collectCounts.get(g.titleId) });
  }
  return ranked;
}

async function getNewestFallbackTitles(excludeIds: string[], take: number): Promise<HeroTitle[]> {
  if (take <= 0) return [];
  return prisma.title.findMany({
    where: { isPublished: true, curatorDraft: false, id: { notIn: excludeIds } },
    orderBy: { createdAt: "desc" },
    take,
    select: HERO_SELECT,
  });
}

/**
 * The homepage hero's titles, in display order, always as close to
 * HERO_SIZE as the catalogue allows. Never empty as long as at least
 * one published title exists — same "first-open never renders a
 * blank page" guarantee page.tsx's NewestRail already provides for
 * the rails below it, applied here to the hero instead.
 */
export async function getHeroTitles(): Promise<HeroTitle[]> {
  const mode = await getHeroMode();
  const primary = mode === "most_collected" ? await getMostCollectedHeroTitles() : await getAdminPickedHeroTitles();

  if (primary.length >= HERO_SIZE) return primary.slice(0, HERO_SIZE);

  const fallback = await getNewestFallbackTitles(
    primary.map((t) => t.id),
    HERO_SIZE - primary.length
  );
  return [...primary, ...fallback];
}
