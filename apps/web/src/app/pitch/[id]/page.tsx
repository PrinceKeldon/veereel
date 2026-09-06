import { notFound } from "next/navigation";
import Link from "next/link";
import { getPitchDetail } from "@/lib/pitch-actions";
import { getWriterSession } from "@/lib/writer-auth";
import { getProducerSession } from "@/lib/producer-auth";
import { PitchBookmarkButton } from "@/components/PitchBookmarkButton";
import { PitchMessageButton } from "@/components/PitchMessageButton";

interface PitchDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PitchDetailPageProps) {
  const { id } = await params;
  const pitch = await getPitchDetail(id);
  return {
    title: `${pitch?.title || "Pitch"} - Veereel`,
    description: pitch?.logline || "View this story pitch on Veereel",
  };
}

export default async function PitchDetailPage({ params }: PitchDetailPageProps) {
  const { id } = await params;
  const pitch = await getPitchDetail(id);

  if (!pitch) {
    notFound();
  }

  const writerId = await getWriterSession();
  const producerId = await getProducerSession();
  const isOwner = writerId === pitch.writerId;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/pitches" className="text-sm text-[var(--accent-marigold)] hover:underline">
            ← Back to pitches
          </Link>

          <h1 className="mt-6 font-[var(--font-display)] text-5xl font-semibold text-[var(--text)]">
            {pitch.title}
          </h1>

          <p className="mt-4 text-2xl text-[var(--text-muted)]">
            {pitch.logline}
          </p>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">
              👁️ {pitch.views} views
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              🔖 {pitch.bookmarks} bookmarks
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              📅 {new Date(pitch.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Synopsis */}
            <section>
              <h2 className="mb-4 font-mono text-xs uppercase text-[var(--text-muted)]">
                Full Synopsis
              </h2>
              <div className="prose prose-invert max-w-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)]">
                {pitch.synopsis.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-4 last:mb-0 whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Tags */}
            <section className="space-y-4">
              {pitch.tropeTags.length > 0 && (
                <div>
                  <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">
                    Story Tropes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pitch.tropeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--accent-marigold)]/20 px-3 py-1 text-sm text-[var(--accent-marigold)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pitch.moodTags.length > 0 && (
                <div>
                  <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">
                    Mood & Tone
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pitch.moodTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--accent-rose)]/20 px-3 py-1 text-sm text-[var(--accent-rose)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pitch.targetPlatforms && pitch.targetPlatforms.length > 0 && (
                <div>
                  <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">
                    Target Platforms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pitch.targetPlatforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-lg bg-[var(--accent-marigold)]/20 px-3 py-1 text-sm text-[var(--accent-marigold)]"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Specs */}
            {pitch.episodeCountEst && (
              <section>
                <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">
                  Specifications
                </h3>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[var(--text)]">
                    <span className="text-[var(--text-muted)]">Estimated Episodes:</span> {pitch.episodeCountEst}
                  </p>
                </div>
              </section>
            )}

            {/* Video */}
            {pitch.pitchVideoUrl && (
              <section>
                <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">
                  Pitch Video
                </h3>
                <a
                  href={pitch.pitchVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[var(--accent-marigold)] hover:underline"
                >
                  Watch pitch video →
                </a>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Writer Card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="mb-4 font-mono text-xs uppercase text-[var(--text-muted)]">
                About the Writer
              </h3>

              <div className="mb-4">
                <div className="mb-3 h-12 w-12 rounded-full bg-[var(--accent-marigold)]/20 flex items-center justify-center">
                  <span className="text-xl font-semibold text-[var(--accent-marigold)]">
                    {pitch.writer.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h4 className="font-semibold text-[var(--text)]">
                  {pitch.writer.displayName}
                </h4>
              </div>

              {pitch.writer.bio && (
                <p className="mb-4 text-sm text-[var(--text-muted)]">
                  {pitch.writer.bio}
                </p>
              )}

              <div className="space-y-2">
                <Link
                  href={`/writer/${pitch.writer.displayName}`}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2 text-center text-sm font-medium text-[var(--text)] hover:border-[var(--accent-marigold)]"
                >
                  View Writer Profile
                </Link>

                {pitch.writer.portfolioUrl && (
                  <a
                    href={pitch.writer.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2 text-center text-sm font-medium text-[var(--text)] hover:border-[var(--accent-marigold)]"
                  >
                    Visit Portfolio
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isOwner && (
              <div className="space-y-3">
                {producerId && (
                  <>
                    <PitchBookmarkButton pitchId={pitch.id} producerId={producerId} isBookmarked={pitch.bookmarkRecords.some((b) => b.producerId === producerId)} />
                    <PitchMessageButton pitchId={pitch.id} producerId={producerId} writerId={pitch.writerId} />
                  </>
                )}

                {!producerId && !writerId && (
                  <Link
                    href="/producer/login"
                    className="block rounded-lg bg-[var(--accent-marigold)] px-4 py-3 text-center font-semibold text-[var(--bg)] hover:opacity-90"
                  >
                    Sign in as Producer
                  </Link>
                )}
              </div>
            )}

            {isOwner && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm text-[var(--text-muted)]">
                  This is your pitch. Only you can see edit options.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
