"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import {
  likeCollection,
  unlikeCollection,
  likeCollectionItem,
  unlikeCollectionItem,
} from "@/lib/curator-actions";

interface LikeButtonProps {
  kind: "collection" | "item";
  id: string;
  /** Only used when kind === "item" — CollectionItemLike is scoped to a title within a specific Collection, so both ids are needed to revalidate the right page. */
  collectionId?: string;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "md";
}

export function LikeButton({ kind, id, collectionId, initialLiked, initialCount, size = "md" }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    if (isPending) return;

    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      if (!next) {
        // Unliking never needs a User — same lower-risk-removal
        // reasoning as unfollowCurator()/removeFromCollection() in
        // curator-actions.ts.
        await (kind === "collection" ? unlikeCollection(id) : unlikeCollectionItem(id, collectionId ?? ""));
        return;
      }

      const result = await (kind === "collection"
        ? likeCollection(id)
        : likeCollectionItem(id, collectionId ?? ""));

      if (result.needsReclaim) {
        // Revert the optimistic tap — a curator with no User yet
        // can't like (see requireReclaimedCurator's docstring in
        // curator.ts) — then send them to attach an email first.
        setLiked(false);
        setCount((c) => c - 1);
        router.push(`/reclaim?next=${encodeURIComponent(pathname)}`);
      }
    });
  }

  const iconSize = size === "sm" ? 14 : 16;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-50 ${
        liked
          ? "border-[var(--accent-rose)] text-[var(--accent-rose)]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-rose)] hover:text-[var(--accent-rose)]"
      }`}
    >
      <Heart size={iconSize} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
      {count > 0 && count}
    </button>
  );
}
