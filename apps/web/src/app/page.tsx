import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getWriterSession } from "@/lib/writer-auth";
import { getProducerSession } from "@/lib/producer-auth";
import { DEFAULT_MOODS, findChip } from "@/lib/moodChips";
import { MoodChipBar } from "@/components/MoodChipBar";
import { TitleRail } from "@/components/TitleRail";
import { CollectionsRail } from "@/components/CollectionsRail";
import { SiteNav } from "@/components/SiteNav";
import { HomeHero } from "@/components/HomeHero";
import { getHeroTitles } from "@/lib/hero";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ mood?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeValues = params.mood?.split(",").filter(Boolean) ?? [];
  const activeChips = activeValues.map(findChip).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const chipsToShow = activeChips.length ? activeChips : DEFAULT_MOODS;

  const writerId = await getWriterSession();
  const producerId = await getProducerSession();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 pb-16">
      <SiteNav />

      {/* Pitch Platform Banner */}
      <div className="mb-10 rounded-xl border border-[var(--accent-marigold)] bg-[var(--accent-marigold)]/10 p-6">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--accent-marigold)]">
          ✨ Veereel Pitch Platform
        </h2>
        <p className="mt-2 text-[var(--text)]">
          A marketplace for writers to pitch micro-drama stories and producers to discover new content.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {writerId ? (
            <>
              <Link
                href="/pitch/new"
                className="rounded-lg bg-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--bg)] hover:opacity-90"
              >
                📝 Submit a Pitch
              </Link>
              <Link
                href="/pitches"
                className="rounded-lg border border-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--accent-marigold)] hover:bg-[var(--accent-marigold)]/10"
              >
                Browse Pitches
              </Link>
              <Link
                href="/messages"
                className="rounded-lg border border-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--accent-marigold)] hover:bg-[var(--accent-marigold)]/10"
              >
                💬 Messages
              </Link>
            </>
          ) : producerId ? (
            <>
              <Link
                href="/pitches"
                className="rounded-lg bg-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--bg)] hover:opacity-90"
              >
                🎬 Discover Pitches
              </Link>
              <Link
                href="/messages"
                className="rounded-lg border border-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--accent-marigold)] hover:bg-[var(--accent-marigold)]/10"
              >
                💬 Messages
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/writer/signup"
                className="rounded-lg bg-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--bg)] hover:opacity-90"
              >
                Join as Writer
              </Link>
              <Link
                href="/producer/login"
                className="rounded-lg border border-[var(--accent-marigold)] px-4 py-2 font-semibold text-[var(--accent-marigold)] hover:bg-[var(--accent-marigold)]/10"
              >
                Sign in as Producer
              </Link>
              <Link
                href="/pitches"
                className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text)] hover:border-[var(--accent-marigold)]"
              >
                Browse Pitches
              </Link>
            </>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <HeroSection />
      </Suspense>

      <header className="mb-10">
        <h1 className="mb-7 max-w-xl break-words font-[var(--font-display)] text-[2.5rem] font-semibold uppercase leading-none text-[var(--text)] sm:text-4xl sm:leading-normal">
          Drama for the in-between moments.
        </h1>
        <MoodChipBar />
      </header>

      <Suspense fallback={null}>
        <CollectionsRail />
      </Suspense>

      <Suspense fallback={<p className="text-[var(--text-muted)]">Loading trending...</p>}>
        <TrendingRail />
      </Suspense>

      <Suspense fallback={<p className="text-[var(--text-muted)]">Loading...</p>}>
        <FandomTrendingRail />
      </Suspense>

      <Suspense fallback={<p className="text-[var(--text-muted)]">Loading...</p>}>
        <NewestRail />
      </Suspense>

      <Suspense fallback={<p className="text-[var(--text-muted)]">Loading...</p>}>
        {chipsToShow.map((chip) => (
          <MoodRail key={chip.value} chip={chip} />
        ))}
      </Suspense>
    </main>
  );
}

async function HeroSection() {
  const titles = await getHeroTitles();
  return <HomeHero titles={titles} />;
}

async function NewestRail() {
  const titles = await prisma.title.findMany({
    where: { isPublished: true, curatorDraft: false },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return <TitleRail eyebrow="New on Kilig" titles={titles} />;
}

async function TrendingRail() {
  const MIN_CLICKS_FOR_TRENDING = 5;
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

  if (grouped.length === 0) return null;

  const titles = await prisma.title.findMany({
    where: { id: { in: grouped.map((g: { titleId: string }) => g.titleId) }, isPublished: true, curatorDraft: false },
  });
  const ordered = grouped
    .map((g: { titleId: string }) => titles.find((t: { id: string }) => t.id === g.titleId))
    .filter((t): t is (typeof titles)[number] => t != null);

  return <TitleRail eyebrow="Trending right now" titles={ordered} badge="Trending" />;
}

async function FandomTrendingRail() {
  const MIN_REACTIONS_FOR_TRENDING = 5;
  const since = new Date();
  since.setHours(since.getHours() - 48);

  const grouped = await prisma.userInteraction.groupBy({
    by: ["titleId"],
    where: { action: "reacted", createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    having: { id: { _count: { gte: MIN_REACTIONS_FOR_TRENDING } } },
    take: 10,
  });

  if (grouped.length === 0) return null;

  const titles = await prisma.title.findMany({
    where: { id: { in: grouped.map((g: { titleId: string }) => g.titleId) }, isPublished: true, curatorDraft: false },
  });
  const ordered = grouped
    .map((g: { titleId: string }) => titles.find((t: { id: string }) => t.id === g.titleId))
    .filter((t): t is (typeof titles)[number] => t != null);

  return <TitleRail eyebrow="Trending in the Fandom · reactions, last 48h" titles={ordered} badge="In the Fandom" />;
}

async function MoodRail({ chip }: { chip: (typeof import("@/lib/moodChips").MOOD_CHIPS)[number] }) {
  const where =
    chip.type === "mood"
      ? { moodTags: { has: chip.value }, isPublished: true, curatorDraft: false }
      : { tropeTags: { has: chip.value }, isPublished: true, curatorDraft: false };

  const titles = await prisma.title.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return <TitleRail eyebrow={`Because you want ${chip.label.toLowerCase()}`} titles={titles} />;
}
