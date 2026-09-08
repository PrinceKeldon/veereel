"use client";

import { useState } from "react";
import { bookmarkPitch, unbookmarkPitch } from "@/lib/pitch-actions";

interface PitchBookmarkButtonProps {
  pitchId: string;
  isBookmarked: boolean;
}

// producerId is no longer a prop — bookmarkPitch/unbookmarkPitch
// derive the platform from the session via requirePlatform(). The
// original build took a producerId argument straight from this
// component with nothing checking it server-side, meaning anyone
// could bookmark/unbookmark as any producer just by knowing their id.
export function PitchBookmarkButton({ pitchId, isBookmarked: initialBookmarked }: PitchBookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleBookmark = async () => {
    setIsLoading(true);

    if (isBookmarked) {
      const result = await unbookmarkPitch(pitchId);
      if (result.success) setIsBookmarked(false);
    } else {
      const result = await bookmarkPitch(pitchId);
      if (result.success) setIsBookmarked(true);
    }

    setIsLoading(false);
  };

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={`w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
        isBookmarked
          ? "bg-[var(--accent-rose)] text-[var(--bg)] hover:opacity-90"
          : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-rose)] hover:text-[var(--accent-rose)]"
      } disabled:opacity-50`}
    >
      {isLoading ? "..." : isBookmarked ? "🔖 Bookmarked" : "🔖 Bookmark"}
    </button>
  );
}
