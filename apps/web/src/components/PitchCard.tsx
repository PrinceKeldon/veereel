"use client";

import Link from "next/link";
import { Pitch } from "@prisma/client";

interface PitchCardProps {
  pitch: Pitch & {
    writer: {
      displayName: string;
      portfolioUrl?: string | null;
    };
  };
}

export function PitchCard({ pitch }: PitchCardProps) {
  return (
    <Link href={`/pitch/${pitch.id}`}>
      <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:border-[var(--accent-marigold)] hover:shadow-lg">
        {/* Title & Logline */}
        <div className="mb-4">
          <h3 className="font-[var(--font-display)] text-lg font-semibold text-[var(--text)] group-hover:text-[var(--accent-marigold)]">
            {pitch.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">
            {pitch.logline}
          </p>
        </div>

        {/* Writer */}
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-4">
          <div className="h-8 w-8 rounded-full bg-[var(--accent-marigold)]/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-[var(--accent-marigold)]">
              {pitch.writer.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">
              {pitch.writer.displayName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Writer</p>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4 space-y-2">
          {pitch.tropeTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pitch.tropeTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent-marigold)]/20 px-2 py-1 text-xs text-[var(--accent-marigold)]"
                >
                  {tag}
                </span>
              ))}
              {pitch.tropeTags.length > 3 && (
                <span className="rounded-full bg-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  +{pitch.tropeTags.length - 3}
                </span>
              )}
            </div>
          )}

          {pitch.moodTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pitch.moodTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent-rose)]/20 px-2 py-1 text-xs text-[var(--accent-rose)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex gap-4">
            <span>👁️ {pitch.views} views</span>
            <span>🔖 {pitch.bookmarks} bookmarks</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(pitch.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
