import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { peekCuratorId } from "@/lib/curator";
import { getFollowerDisplay, isFollowing } from "@/lib/curator-actions";
import { CuratorHero } from "@/components/CuratorHero";
import { CuratorCollectionCard } from "@/components/CuratorCollectionCard";

interface CuratorPageProps {
  params: Promise<{ displayName: string }>;
}

// The curator profile is now a creator page — see CuratorHero and
// CURATOR_REDESIGN_PLAN.md. Identity fields (bio/tasteStatement/avatarUrl)
// are SELECT-ed here (all optional; the hero degrades gracefully when
// absent), and each Collection comes with a description plus its 3
// most-recent cover images for the visual CuratorCollectionCard.
async function getCuratorByName(displayName: string) {
  return prisma.curator.findFirst({
    where: { displayName: { equals: displayName, mode: "insensitive" } },
    select: {
      id: true,
      displayName: true,
      bio: true,
      tasteStatement: true,
      avatarUrl: true,
      featuredCollectionId: true,
      collections: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { items: true } },
          items: {
            orderBy: { createdAt: "desc" },
            take: 3,
            // Draft/unpublished covers aren't this visitor's to see —
            // same "real or absent" honesty rule as the Collection page.
            where: { title: { isPublished: true } },
            select: { title: { select: { id: true, name: true, coverImageUrl: true } } },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: CuratorPageProps): Promise<Metadata> {
  const { displayName } = await params;
  const curator = await getCuratorByName(displayName);
  if (!curator) return {};
  return { title: curator.displayName, description: `Collections curated by ${curator.displayName} on Kilig.` };
}

export default async function CuratorPage({ params }: CuratorPageProps) {
  const { displayName } = await params;

  // Same gate as /collection/[id] — a curator's name and Collection
  // titles are visible on the homepage rail and title pages without
  // claiming anything, but opening their profile (where follow lives)
  // is the moment that asks for a name. See ARCHITECTURE.md's
  // Collections section.
  const viewerCuratorId = await peekCuratorId();
  if (!viewerCuratorId) redirect(`/claim?next=${encodeURIComponent(`/kilig/curator/${displayName}`)}`);

  const curator = await getCuratorByName(displayName);
  if (!curator) notFound();

  const isOwnProfile = viewerCuratorId === curator.id;

  const [followerDisplay, viewerIsFollowing] = await Promise.all([
    getFollowerDisplay(curator.id, isOwnProfile),
    isOwnProfile ? Promise.resolve(false) : isFollowing(curator.id),
  ]);

  // The featured Collection is whichever the curator pinned in
  // Settings; if they haven't pinned one, fall back to their most
  // recently active Collection (most recent created / had a title
  // added — rendered order is updatedAt desc, so collections[0]).
  // A pinned id pointing at a no-longer-existing row (deleted
  // collection SetNulls the pin, so this shouldn't happen) gracefully
  // falls back to the same most-recent behavior.
  const collections = curator.collections;

  if (collections.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-14 pb-20">
        <CuratorHero
          displayName={curator.displayName}
          bio={curator.bio}
          tasteStatement={curator.tasteStatement}
          avatarUrl={curator.avatarUrl}
          followerCount={followerDisplay.count}
          collectionCount={curator.collections.length}
          isOwnProfile={isOwnProfile}
          curatorId={curator.id}
          viewerIsFollowing={viewerIsFollowing}
        />
        <p className="text-center text-[var(--text-muted)]">
          {isOwnProfile ? "No Collections yet — create your first one." : "No Collections yet."}
        </p>
      </main>
    );
  }

  const featuredCollection =
    collections.find((c) => c.id === curator.featuredCollectionId) ?? collections[0];
  const restCollections = collections.filter((c) => c.id !== featuredCollection.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 pb-20">
      <CuratorHero
        displayName={curator.displayName}
        bio={curator.bio}
        tasteStatement={curator.tasteStatement}
        avatarUrl={curator.avatarUrl}
        followerCount={followerDisplay.count}
        collectionCount={curator.collections.length}
        isOwnProfile={isOwnProfile}
        curatorId={curator.id}
        viewerIsFollowing={viewerIsFollowing}
      />

      <section className="mb-12">
        <p className="mb-4 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Featured Collection
        </p>
        <CuratorCollectionCard
          items={featuredCollection.items}
          name={featuredCollection.name}
          description={featuredCollection.description}
          itemCount={featuredCollection._count.items}
          href={`/kilig/collection/${featuredCollection.id}`}
        />
      </section>

      {restCollections.length > 0 && (
        <section>
          <p className="mb-4 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
            All Collections
          </p>
          <ul className="grid gap-5 sm:grid-cols-2">
            {restCollections.map((collection) => (
              <li key={collection.id}>
                <CuratorCollectionCard
                  items={collection.items}
                  name={collection.name}
                  description={collection.description}
                  itemCount={collection._count.items}
                  href={`/kilig/collection/${collection.id}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}