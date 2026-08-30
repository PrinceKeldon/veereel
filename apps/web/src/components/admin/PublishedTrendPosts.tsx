"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { removeTrendPost } from "@/lib/discovery/trendPosts";
import type { TrendPostView } from "@/lib/discovery/trendPosts";

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  press: "Press",
};

/**
 * Renders the initial list passed down from the server component at
 * /admin/discovery. Doesn't re-fetch on its own — TrendScoutPanel
 * calls router.refresh() after a successful push, which re-runs the
 * parent server component and hands this a fresh `initialPosts` prop.
 */
export function PublishedTrendPosts({ initialPosts }: { initialPosts: TrendPostView[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await removeTrendPost(id);
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[var(--font-display)] text-lg font-semibold uppercase text-[var(--text)]">
          Currently on /buzz
        </h2>
        <Link
          href="/buzz"
          target="_blank"
          className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--accent-marigold)]"
        >
          View page →
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nothing pushed yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-[var(--text)] hover:text-[var(--accent-marigold)]"
                >
                  {post.title}
                </a>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {SOURCE_LABELS[post.source] ?? post.source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(post.id)}
                disabled={isPending && pendingId === post.id}
                className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--accent-rose)] disabled:opacity-50"
              >
                {isPending && pendingId === post.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
