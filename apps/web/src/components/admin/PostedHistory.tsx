import type { RecentContentPost } from "@/lib/content-actions";

interface PostedHistoryProps {
  posts: RecentContentPost[];
}

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

/**
 * Server-rendered from real ContentPost rows (content-actions.ts) —
 * unlike the previous build's "Posted Tracking" section, this survives
 * a page refresh because it's reading the database, not a client
 * useState that reset every time the tab reloaded.
 */
export function PostedHistory({ posts }: PostedHistoryProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--text-muted)]">Nothing marked as posted yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="mb-4 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Recently posted</p>
      <div className="flex flex-col gap-2">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent-marigold)]"
          >
            <span className="min-w-0 flex-1 truncate text-[var(--text)]">{post.titleName}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {PLATFORM_LABEL[post.platform] ?? post.platform}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
              {new Date(post.postedAt).toLocaleDateString()}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
