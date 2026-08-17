import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CuratorAvatar } from "@/components/CuratorAvatar";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";

interface CollectionHeaderHeroProps {
  collectionId: string;
  collectionName: string;
  collectionDescription?: string | null;
  curatorId: string;
  curatorDisplayName: string;
  curatorAvatarUrl?: string | null;
  /** Like-button state, computed server-side in the page (see LikeButton's props). */
  collectionLikeCount: number;
  collectionLiked: boolean;
  isOwner: boolean;
  viewerIsFollowing: boolean;
}

// The cinematic top of a Collection page — see CURATOR_REDESIGN_PLAN.md's
// "mini magazine" intent. Leads with the curator's name as a back link,
// then the Collection name as a big headline, then the curator's
// description as an italic pull-quote, then the actions. The hairline
// separator at the bottom books off the header before the first item.
export function CollectionHeaderHero({
  collectionId,
  collectionName,
  collectionDescription,
  curatorId,
  curatorDisplayName,
  curatorAvatarUrl,
  collectionLikeCount,
  collectionLiked,
  isOwner,
  viewerIsFollowing,
}: CollectionHeaderHeroProps) {
  return (
    <header className="mb-10 flex flex-col items-center gap-4 text-center">
      <Link
        href={`/kilig/curator/${curatorDisplayName}`}
        className="mb-2 inline-flex items-center gap-1.5 self-start text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-marigold)]"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {curatorDisplayName}
      </Link>

      <div className="flex items-center gap-2">
        <CuratorAvatar displayName={curatorDisplayName} avatarUrl={curatorAvatarUrl} size={28} />
        <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {curatorDisplayName}&rsquo;s Collection
        </p>
      </div>

      <h1 className="break-words font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)] md:text-4xl">
        {collectionName}
      </h1>

      {collectionDescription && (
        <p className="max-w-xl text-base italic leading-relaxed text-[var(--text-muted)] md:text-lg">
          &ldquo;{collectionDescription}&rdquo;
        </p>
      )}

      <div className="mt-2 flex items-center gap-3">
        {!isOwner && <FollowButton curatorId={curatorId} initialIsFollowing={viewerIsFollowing} />}
        <LikeButton
          kind="collection"
          id={collectionId}
          initialLiked={collectionLiked}
          initialCount={collectionLikeCount}
        />
      </div>

      <div className="mt-6 w-full" aria-hidden="true">
        <div className="h-px w-full bg-[var(--border)]" />
      </div>
    </header>
  );
}