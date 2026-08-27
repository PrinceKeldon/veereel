"use client";

import { useState, useCallback } from "react";
import { Search, TrendingUp } from "lucide-react";
import { TrendingTitlesDropdown } from "./TrendingTitlesDropdown";

export interface PickerTitle {
  id: string;
  name: string;
  tropeTags: string[];
  moodTags: string[];
  coverImageUrl?: string | null;
}

export interface SearchAndTrendingPickerProps {
  titles: PickerTitle[];
  // Real, floor-gated trending titles (see content-actions.ts) —
  // separate from `titles`, not a filtered view of the same list. The
  // previous build's "Trending" dropdown received the exact same array
  // as the search box, just relabeled — this makes the two genuinely
  // different data sources, matching every other trending surface in
  // the app.
  trendingTitles: PickerTitle[];
  onSelect: (title: PickerTitle) => void;
}

export function SearchAndTrendingPicker({ titles, trendingTitles, onSelect }: SearchAndTrendingPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTitles, setFilteredTitles] = useState<PickerTitle[]>(titles);
  const [showTrendingDropdown, setShowTrendingDropdown] = useState(false);

  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setFilteredTitles(titles);
        return;
      }
      const lowercaseQ = q.toLowerCase();
      const matches = titles.filter(
        (t) =>
          t.name.toLowerCase().includes(lowercaseQ) ||
          t.tropeTags.some((tag) => tag.toLowerCase().includes(lowercaseQ)) ||
          t.moodTags.some((tag) => tag.toLowerCase().includes(lowercaseQ))
      );
      setFilteredTitles(matches);
    },
    [titles]
  );

  const handleSelect = useCallback(
    (title: PickerTitle) => {
      setSearchQuery("");
      setFilteredTitles(titles);
      onSelect(title);
    },
    [onSelect, titles]
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
        <Search size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search titles..."
          className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
      </div>

      {searchQuery && filteredTitles.length > 0 && (
        <div className="absolute right-0 top-12 z-40 max-h-72 w-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {filteredTitles.slice(0, 20).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--accent-marigold)]/10"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowTrendingDropdown((v) => !v)}
        aria-label="Show trending titles"
        aria-pressed={showTrendingDropdown}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-marigold)]"
      >
        <TrendingUp size={14} aria-hidden="true" />
        Trending
      </button>

      {showTrendingDropdown && (
        <TrendingTitlesDropdown
          titles={trendingTitles}
          onSelect={handleSelect}
          onClose={() => setShowTrendingDropdown(false)}
        />
      )}
    </div>
  );
}
