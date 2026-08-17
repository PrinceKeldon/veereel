import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { peekCuratorId } from "@/lib/curator";
import { removeFromCollection, getCollectionLikeState, getCollectionItemLikeStates, isFollowing } from "@/lib/curator-actions";
import { TitleCoverArt } from "@/components/TitleCoverArt";
import { LikeButton } from "@/components/LikeButton";
import { WatchButton } from "@/components/WatchButton";
import { CollectionHeaderHero } from "@/components/CollectionHeaderHero";
import { SubmitTitleForm } from "@/components/SubmitTitleForm";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

async function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      curator: { select: { id: true, displayName: true, avatarUrl: true } },
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          title: {
            select: {
              id: true,
              name: true,
              coverImageUrl: true,
              language: true,
              episodeCount: true,
              isPublished: true,
              availability: { where: { isActive: true } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) return {};
  return {
    title: collection.name,
    description: collection.curator
      ? (collection.description ?? `A Collection curated by ${collection.curator.displayName} on Kilig.`)
      : "A Collection on Kilig.",
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;

  // Gated behind a claimed identity — a visitor can see this
  // Collection exists and who curated it (the homepage rail and title
  // pages show that much without claiming anything), but opening it
  // is the moment that asks for a name. See ARCHITECTURE.md's
  // Collections section for the reasoning.
  const viewerCuratorId = await peekCuratorId();
  if (!viewerCuratorId) redirect(`/claim?next=${encodeURIComponent(`/kilig/collection/${id}`)}`);

  const collection = await getCollection(id);
  if (!collection) notFound();
  // Ownership is curator XOR platform (see schema.prisma's Collection
  // model) — platform-owned Collections don't have a displayName to
  // link back to, an owner to compare against, or a curator page, so
  // this curator-scoped page can't render them. None exist in the
  // database today; when platform Collections ship they'll need their
  // own rendering, not a null-handling band-aid here.
  if (!collection.curator) notFound();

  const isOwner = viewerCuratorId === collection.curator.id;
  // Top-level alias so the closures below (renderCover/renderNote) can
  // reference the id without tripping TS's "possibly null" check —
  // narrowing on `collection` doesn't survive into nested functions.
  const collectionId = collection.id;

  // A visitor can also follow the curator from this page (the same
  // follow that lives on the curator profile), so their relationship
  // is computed here for CollectionHeaderHero.
  const viewerIsFollowing = isOwner ? false : await isFollowing(collection.curator.id);

  // Draft/unpublished titles (e.g. a curator's own pending "Add a
  // title not on Kilig" submission) are visible only to the
  // Collection's owner, with a "pending review" badge instead of a
  // link into /title/[id] (which would 404/redirect for anyone but
  // an admin anyway) and no like button — nobody but the owner can
  // even see it yet, so a like count would be meaningless. Everyone
  // else simply doesn't see the item at all — same "real or absent"
  // rule as everywhere else honesty-gated in this app, not a broken
  // card with a dead link.
  const visibleItems = collection.items.filter((item) => item.title.isPublished || isOwner);
  const itemIds = visibleItems.map((item) => item.id);

  const [collectionLikeState, itemLikeStates] = await Promise.all([
    getCollectionLikeState(collection.id),
    getCollectionItemLikeStates(itemIds),
  ]);

  // "Mini magazine" layout — the newest pick is the cinematic feature
  // (large poster + curator's note + watch links), the rest fall into
  // a grid. See CURATOR_REDESIGN_PLAN.md.
  const [firstItem, ...restItems] = visibleItems;

  function renderCover(item: (typeof visibleItems)[number], featured: boolean) {
    const cover = (
      <div className={`aspect-[9/16] overflow-hidden rounded-2xl bg-black ${featured ? "w-40" : "w-[72px] rounded-xl"}`}>
        <TitleCoverArt title={item.title} showTitleOverlay={false} />
      </div>
    );

    if (!item.title.isPublished) {
      return <div className={featured ? "opacity-60" : "shrink-0 opacity-60"}>{cover}</div>;
    }
    return <Link href={`/kilig/title/${item.title.id}`}>{cover}</Link>;
  }

  function renderNote(item: (typeof visibleItems)[number], featured: boolean) {
    const pending = !item.title.isPublished;
    if (featured) {
      return (
        <div className="mt-3 flex flex-col items-center text-center">
          {pending && (
            <span className="mb-2 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Pending review
            </span>
          )}
          <h2 className="font-[var(--font-display)] text-xl text-[var(--text)] md:text-2xl">{item.title.name}</h2>
          <p className="mt-3 inline-block rounded-lg bg-[#E8DCC4] px-3 py-2 text-sm leading-relaxed text-[#1A1A1A] font-medium">&ldquo;{item.note}&rdquo;</p>
          {!pending && item.title.availability.length > 0 && (
            <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
              {item.title.availability.map((a) => (
                <WatchButton key={a.id} availability={a} titleId={item.title.id} />
              ))}
            </div>
          )}
          {!pending && (
            <div className="mt-5">
              <LikeButton
                kind="item"
                id={item.id}
                collectionId={collectionId}
                initialLiked={itemLikeStates[item.id]?.liked ?? false}
                initialCount={itemLikeStates[item.id]?.count ?? 0}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="min-w-0 flex-1">
        {pending ? (
          <p className="font-[var(--font-display)] text-base text-[var(--text)]">{item.title.name}</p>
        ) : (
          <Link
            href={`/kilig/title/${item.title.id}`}
            className="font-[var(--font-display)] text-base text-[var(--text)] hover:text-[var(--accent-marigold)]"
          >
            {item.title.name}
          </Link>
        )}
        {pending && (
          <span className="mb-1 mt-0.5 w-fit rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Pending review
          </span>
        )}
        <p className="mt-2 inline-block rounded-lg bg-[#E8DCC4] px-3 py-2 text-sm leading-snug text-[#1A1A1A] font-medium">&ldquo;{item.note}&rdquo;</p>
        <div className="mt-2 flex items-center gap-3">
          {!pending && (
            <LikeButton
              kind="item"
              id={item.id}
              collectionId={collectionId}
              initialLiked={itemLikeStates[item.id]?.liked ?? false}
              initialCount={itemLikeStates[item.id]?.count ?? 0}
              size="sm"
            />
          )}
          {isOwner && (
            <form action={removeFromCollection.bind(null, collectionId, item.title.id)}>
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--accent-rose)]"
              >
                Remove
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 pb-20">
      <CollectionHeaderHero
        collectionId={collection.id}
        collectionName={collection.name}
        collectionDescription={collection.description}
        curatorId={collection.curator.id}
        curatorDisplayName={collection.curator.displayName}
        curatorAvatarUrl={collection.curator.avatarUrl}
        collectionLikeCount={collectionLikeState.count}
        collectionLiked={collectionLikeState.liked}
        isOwner={isOwner}
        viewerIsFollowing={viewerIsFollowing}
      />

      {visibleItems.length === 0 ? (
        <p className="text-center text-[var(--text-muted)]">
          Nothing saved here yet{isOwner && " — save a title from any title page to get started"}.
        </p>
      ) : (
        <>
          {firstItem && (
            <article className="mb-12 flex flex-col items-center">
              {renderCover(firstItem, true)}
              {renderNote(firstItem, true)}
            </article>
          )}

          {restItems.length > 0 && (
            <section className="mb-12">
              <div className="mb-4 h-px w-full bg-[var(--border)]" aria-hidden="true" />
              <ul className="grid gap-4 sm:grid-cols-2">
                {restItems.map((item) => (
                  <li key={item.id} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    {renderCover(item, false)}
                    {renderNote(item, false)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {isOwner && (
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Add</p>
          <SubmitTitleForm collectionId={collection.id} />
        </div>
      )}
    </main>
  );
}