import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWriterPitches } from "@/lib/pitch-actions";
import { PitchCard } from "@/components/PitchCard";

interface WriterProfilePageProps {
  params: Promise<{ displayName: string }>;
}

export async function generateMetadata({ params }: WriterProfilePageProps) {
  const { displayName } = await params;
  const writer = await prisma.writer.findUnique({
    where: { displayName },
  });
  return {
    title: `${writer?.displayName || "Writer"} - Veereel`,
    description: writer?.bio || `Discover ${writer?.displayName}'s pitches on Veereel`,
  };
}

export default async function WriterProfilePage({ params }: WriterProfilePageProps) {
  const { displayName } = await params;

  const writer = await prisma.writer.findUnique({
    where: { displayName },
  });

  if (!writer) {
    notFound();
  }

  const pitches = await getWriterPitches(writer.id);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/pitches" className="text-sm text-[var(--accent-marigold)] hover:underline">
            ← Back to pitches
          </Link>

          <div className="mt-6 flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-[var(--accent-marigold)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-semibold text-[var(--accent-marigold)]">
                {writer.displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[var(--text)]">
                {writer.displayName}
              </h1>

              {writer.bio && (
                <p className="mt-2 text-lg text-[var(--text-muted)]">
                  {writer.bio}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                {writer.portfolioUrl && (
                  <a
                    href={writer.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--accent-marigold)]"
                  >
                    Portfolio
                  </a>
                )}

                {writer.social && typeof writer.social === "object" && (
                  <>
                    {(writer.social as any).twitter && (
                      <a
                        href={(writer.social as any).twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--accent-marigold)]"
                      >
                        Twitter
                      </a>
                    )}
                    {(writer.social as any).linkedin && (
                      <a
                        href={(writer.social as any).linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--accent-marigold)]"
                      >
                        LinkedIn
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pitches */}
        <section>
          <h2 className="mb-6 font-[var(--font-display)] text-2xl font-semibold text-[var(--text)]">
            Pitches ({pitches.length})
          </h2>

          {pitches.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <p className="text-[var(--text-muted)]">
                This writer hasn't submitted any pitches yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {pitches.map((pitch) => (
                <PitchCard
                  key={pitch.id}
                  pitch={{
                    ...pitch,
                    writer: {
                      displayName: writer.displayName,
                      portfolioUrl: writer.portfolioUrl,
                    },
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
