import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { peekPlatformId } from "@/lib/platform";
import { getMyPlatformTitles, getMyPlatformAnnouncements } from "@/lib/platform-actions";
import { TitleCard } from "@/components/TitleCard";
import { PlatformSubmitTitleForm } from "@/components/PlatformSubmitTitleForm";
import { PlatformLogoSettings } from "@/components/PlatformLogoSettings";
import { PlatformAnnouncementsForm } from "@/components/PlatformAnnouncementsForm";

interface PlatformPageProps {
  params: Promise<{ slug: string }>;
}

async function getPlatformBySlug(slug: string) {
  return prisma.platform.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      officialSiteUrl: true,
      isVerified: true,
    },
  });
}

async function getPlatformTitles(platformId: string) {
  // A partner's published titles — only ever the live, published ones
  // (their submissions are isPublished: true, curatorDraft: false from
  // the moment they go through submitTitleFromPlatform(), so this is
  // normally all of them; the filter keeps it honest if an admin ever
  // unpublishes one as moderation).
  return prisma.title.findMany({
    where: { submittedByPlatformId: platformId, isPublished: true, curatorDraft: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      language: true,
      moodTags: true,
      coverImageUrl: true,
      episodeCount: true,
      pacing: true,
    },
  });
}

async function getPlatformAnnouncements(platformId: string) {
  return prisma.platformAnnouncement.findMany({
    where: { platformId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      headline: true,
      body: true,
      createdAt: true,
      title: { select: { id: true, name: true } },
    },
  });
}

export async function generateMetadata({ params }: PlatformPageProps): Promise<Metadata> {
  const { slug } = await params;
  const platform = await getPlatformBySlug(slug);
  if (!platform) return {};
  return {
    title: platform.name,
    description: `Titles from ${platform.name} on Kilig.`,
  };
}

export default async function PlatformPage({ params }: PlatformPageProps) {
  const { slug } = await params;
  const platform = await getPlatformBySlug(slug);
  if (!platform) notFound();

  const viewerPlatformId = await peekPlatformId();
  const isOwnPage = viewerPlatformId === platform.id;

  // The public page shows titles + announcements to everyone — no
  // identity gate, unlike a curator profile (a platform page is a
  // partner's proof point, "our catalogue is live", not a fan's
  // claimed identity). The owner-only controls (publish, logo,
  // announcements) render only when the platform cookie matches.
  const [titles, announcements] = await Promise.all([
    getPlatformTitles(platform.id),
    getPlatformAnnouncements(platform.id),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 pb-20">
      {/* Masthead — logo, name, verified badge, official site */}
      <header className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
          {platform.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- platform-provided logo (data URI or URL), masthead only
            <img src={platform.logoUrl} alt={`${platform.name} logo`} className="max-h-full max-w-full object-contain p-2" />
          ) : (
            <span className="px-3 text-center font-[var(--font-display)] text-lg uppercase text-[var(--text-muted)]">
              {platform.name}
            </span>
          )}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)] sm:text-3xl">
              {platform.name}
            </h1>
            {platform.isVerified && (
              <span title="Verified partner" aria-label="Verified partner">
                <BadgeCheck size={20} className="text-[var(--accent-marigold)]" />
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {titles.length} {titles.length === 1 ? "title" : "titles"} on Kilig
            {platform.officialSiteUrl && (
              <>
                {" · "}
                <a
                  href={platform.officialSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent-marigold)] hover:underline"
                >
                  Official site <ExternalLink size={12} aria-hidden="true" />
                </a>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Announcements — the platform's own voice, only here */}
      {announcements.length > 0 && (
        <section className="mb-12">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            From {platform.name}
          </p>
          <ul className="flex flex-col gap-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="font-[var(--font-display)] text-lg text-[var(--text)]">{a.headline}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{a.body}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {a.createdAt.toLocaleDateString()}
                  {a.title && (
                    <>
                      {" · "}
                      <Link href={`/kilig/title/${a.title.id}`} className="text-[var(--accent-marigold)] hover:underline">
                        {a.title.name}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Titles grid */}
      <section>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          On Kilig
        </p>
        {titles.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            {isOwnPage ? "No titles published yet — add your first one below." : "No titles yet."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {titles.map((title) => (
              <TitleCard key={title.id} title={title} />
            ))}
          </div>
        )}
      </section>

      {/* Owner-only controls */}
      {isOwnPage && (
        <section className="mt-14 flex flex-col gap-10">
          <div className="h-px w-full bg-[var(--border)]" aria-hidden="true" />
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Publish</p>
            <PlatformSubmitTitleForm />
          </div>
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Announcements</p>
            <PlatformAnnouncementsForm
              titles={await getMyPlatformTitles()}
              announcements={await getMyPlatformAnnouncements()}
            />
          </div>
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Logo</p>
            <PlatformLogoSettings name={platform.name} logoUrl={platform.logoUrl} />
          </div>
        </section>
      )}
    </main>
  );
}