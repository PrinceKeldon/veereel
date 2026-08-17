import type { Metadata } from "next";
import { listTrendPosts } from "@/lib/discovery/trendPosts";

export const metadata: Metadata = { title: "Buzz" };
export const dynamic = "force-dynamic"; // rolling list changes whenever an admin pushes a new signal

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  press: "Press",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export default async function BuzzPage() {
  const posts = await listTrendPosts();

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 pb-20">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-2 font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)]">
        Buzz
      </h1>
      <p className="mb-8 text-sm text-[var(--text-muted)]">
        What&rsquo;s being talked about in vertical drama right now — a short, hand-picked list, refreshed weekly.
      </p>

      {posts.length === 0 ? (
        <p className="text-[var(--text-muted)]">Nothing pushed yet — check back soon.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-[var(--font-display)] text-lg text-[var(--text)] hover:text-[var(--accent-marigold)]"
                >
                  {post.title}
                </a>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {SOURCE_LABELS[post.source] ?? post.source}
                </span>
              </div>
              {post.note && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{post.note}</p>}
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                {formatDate(post.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
