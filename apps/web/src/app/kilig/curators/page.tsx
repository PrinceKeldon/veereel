import Link from "next/link";
import type { Metadata } from "next";
import { getCuratorDirectory } from "@/lib/curator-actions";
import { CuratorAvatar } from "@/components/CuratorAvatar";

export const metadata: Metadata = { title: "Curators" };

// The directory is a shelf of people, not a database list — each entry
// leads with the curator's face (avatar or initials fallback), then
// their name and one-line bio, then their scale in the small mono
// metadata line, then their collections shown as visual cards with
// thumbnail images. See CURATOR_REDESIGN_PLAN.md's visual-hierarchy rules.
export default async function CuratorsPage() {
  const curators = await getCuratorDirectory();

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 pb-20">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-2 font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)]">
        Curators
      </h1>
      <p className="mb-10 text-sm text-[var(--text-muted)]">
        People building taste-based Collections of vertical dramas. Click a collection to explore — follow curators whose taste matches yours.
      </p>

      {curators.length === 0 ? (
        <p className="text-[var(--text-muted)]">No curators yet — be the first.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {curators.map((curator) => (
            <div key={curator.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              {/* Curator header */}
              <Link
                href={`/kilig/curator/${curator.displayName}`}
                className="group flex items-center gap-4 transition-colors hover:text-[var(--accent-marigold)]"
              >
                <CuratorAvatar displayName={curator.displayName} avatarUrl={curator.avatarUrl} size={56} />
                <div className="min-w-0">
                  <p className="truncate font-[var(--font-display)] text-lg text-[var(--text)] transition-colors group-hover:text-[var(--accent-marigold)]">
                    {curator.displayName}
                  </p>
                  {curator.bio && <p className="truncate text-sm text-[var(--text-muted)]">{curator.bio}</p>}
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    {curator.followers.count === null
                      ? "New curator"
                      : `${curator.followers.count} follower${curator.followers.count === 1 ? "" : "s"}`}
                    {" · "}
                    {curator._count.collections} Collection{curator._count.collections === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>

              {/* Collections with thumbnails */}
              {curator.collections && curator.collections.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {curator.collections.slice(0, 3).map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/kilig/collection/${collection.id}`}
                      className="group flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 transition-colors hover:border-[var(--accent-marigold)]"
                    >
                      {/* Thumbnail image */}
                      <div className="flex-shrink-0">
                        {collection.items[0]?.title?.coverImageUrl ? (
                          <img
                            src={collection.items[0].title.coverImageUrl}
                            alt={collection.name}
                            className="h-16 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-12 rounded bg-[var(--border)]" />
                        )}
                      </div>

                      {/* Collection info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--text)] transition-colors group-hover:text-[var(--accent-marigold)]">
                          {collection.name}
                        </p>
                        {collection.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                            {collection.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                  {curator.collections.length > 3 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      +{curator.collections.length - 3} more collection{curator.collections.length - 3 === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--text-muted)]">No collections yet</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}