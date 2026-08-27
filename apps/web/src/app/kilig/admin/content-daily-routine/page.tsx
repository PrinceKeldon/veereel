import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin";
import { getTrendingTitlesForContent, getRecentContentPosts } from "@/lib/content-actions";
import { ContentDailyRoutine } from "@/components/admin/ContentDailyRoutine";

export const dynamic = "force-dynamic";

export default async function ContentDailyRoutinePage() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  const [titlesData, trendingTitles, recentPosts] = await Promise.all([
    prisma.title.findMany({
      where: { isPublished: true, curatorDraft: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, tropeTags: true, moodTags: true, coverImageUrl: true },
      take: 50,
    }),
    // Real, floor-gated trending — see content-actions.ts. The
    // original build's "Trending This Week" was just this same
    // newest-titles list relabeled.
    getTrendingTitlesForContent(),
    getRecentContentPosts(10),
  ]);

  const titles = titlesData.map((t) => ({
    id: t.id,
    name: t.name,
    tropeTags: t.tropeTags,
    moodTags: t.moodTags,
    coverImageUrl: t.coverImageUrl,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 bg-[var(--bg)] min-h-screen">
      <div className="mb-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig Admin</p>
        <h1 className="font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)]">
          Content Daily Routine
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          Generate captions, copy to clipboard, and track manual uploads — 15 min/day instead of 45.
        </p>
      </div>

      <ContentDailyRoutine initialTitles={titles} trendingTitles={trendingTitles} recentPosts={recentPosts} />
    </main>
  );
}
