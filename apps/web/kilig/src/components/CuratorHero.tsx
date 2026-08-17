import Link from "next/link";
import { CuratorAvatar } from "@/components/CuratorAvatar";
import { FollowButton } from "@/components/FollowButton";

interface CuratorHeroProps {
  displayName: string;
  bio?: string | null;
  tasteStatement?: string | null;
  avatarUrl?: string | null;
  /**
   * null means the real count is below MIN_FOLLOWERS_FOR_PUBLIC_DISPLAY
   * (or the profile is viewed by a stranger) — render "New curator"
   * instead of a number close to zero. FollowButton/onFollowClick are
   * provided by the page, which owns the follow action.
   */
  followerCount: number | null;
  collectionCount: number;
  isOwnProfile: boolean;
  curatorId: string;
  viewerIsFollowing: boolean;
}

// Curator profiles are creator pages, not database records — see
// CURATOR_REDESIGN_PLAN.md's "secret shelf" principle. The hero leads
// with the curator's face and voice (avatar, name, bio, taste
// statement) before any action; metadata (follower/collection counts)
// stays small and secondary. The taste statement is the "signature
// line" — framed by hairline separators on both sides so it reads as
// a deliberate quote rather than body text.
export function CuratorHero({
  displayName,
  bio,
  tasteStatement,
  avatarUrl,
  followerCount,
  collectionCount,
  isOwnProfile,
  curatorId,
  viewerIsFollowing,
}: CuratorHeroProps) {
  return (
    <header className="mb-14 flex flex-col items-center text-center">
      <CuratorAvatar displayName={displayName} avatarUrl={avatarUrl} />

      <h1 className="mt-5 break-words font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)] md:text-4xl">
        {displayName}
      </h1>

      {bio && <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--text-muted)]">{bio}</p>}

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {followerCount === null
          ? "New curator"
          : `${followerCount} follower${followerCount === 1 ? "" : "s"}`}
        {" · "}
        {collectionCount} Collection{collectionCount === 1 ? "" : "s"}
      </p>

      <div className="mt-6">
        {isOwnProfile ? (
          <Link
            href="/collection/new"
            className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            New Collection
          </Link>
        ) : (
          <FollowButton curatorId={curatorId} initialIsFollowing={viewerIsFollowing} />
        )}
      </div>

      {tasteStatement && (
        <>
          <div className="mt-10 w-full max-w-xl" aria-hidden="true">
            <div className="h-px w-full bg-[var(--border)]" />
          </div>
          <blockquote className="mt-10 max-w-xl font-[var(--font-display)] text-lg font-medium italic leading-relaxed text-[var(--text)]">
            &ldquo;{tasteStatement}&rdquo;
          </blockquote>
          <div className="mt-10 w-full max-w-xl" aria-hidden="true">
            <div className="h-px w-full bg-[var(--border)]" />
          </div>
        </>
      )}
    </header>
  );
}