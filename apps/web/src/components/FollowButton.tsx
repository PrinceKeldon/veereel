"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { followCurator, unfollowCurator } from "@/lib/curator-actions";

interface FollowButtonProps {
  curatorId: string;
  /** Computed server-side via isFollowing() — see title/[id]/page.tsx's priorReaction for the same "database is the only source of truth" reasoning. */
  initialIsFollowing: boolean;
}

export function FollowButton({ curatorId, initialIsFollowing }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    if (isPending) return;

    const next = !following;
    setFollowing(next); // optimistic — reverted below if the request didn't actually land

    startTransition(async () => {
      if (next) {
        const result = await followCurator(curatorId);
        if (!result.ok && !result.alreadyFollowing) {
          setFollowing(false);
          // A curator with no User yet (see requireReclaimedCurator's
          // docstring in curator.ts) can't follow — send them to
          // attach an email first, then back to where they were.
          if (result.needsReclaim) router.push(`/reclaim?next=${encodeURIComponent(pathname)}`);
        }
      } else {
        await unfollowCurator(curatorId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        following
          ? "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-rose)] hover:text-[var(--accent-rose)]"
          : "border-[var(--accent-marigold)] bg-[var(--accent-marigold)] text-[var(--bg)] hover:opacity-90"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
