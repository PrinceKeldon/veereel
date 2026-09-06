"use client";

import { useState, useEffect } from "react";
import { getPitches } from "@/lib/pitch-actions";
import { PitchCard } from "@/components/PitchCard";
import Link from "next/link";

const TROPE_FILTERS = [
  "Found Family",
  "Second Chance Romance",
  "Enemies to Lovers",
  "Time Travel",
  "Chosen One",
  "Heist",
  "Murder Mystery",
];

const MOOD_FILTERS = ["Dark", "Comedic", "Hopeful", "Suspenseful", "Romantic"];

interface Pitch {
  id: string;
  title: string;
  logline: string;
  tropeTags: string[];
  moodTags: string[];
  views: number;
  bookmarks: number;
  createdAt: Date;
  writer: {
    displayName: string;
    portfolioUrl?: string | null;
  };
}

export default function BrowsePitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTropes, setSelectedTropes] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "trending" | "most-viewed" | "most-bookmarked">("newest");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const limit = 12;

  useEffect(() => {
    const loadPitches = async () => {
      setIsLoading(true);
      const result = await getPitches({
        search: searchQuery,
        tropeTags: selectedTropes.length > 0 ? selectedTropes : undefined,
        moodTags: selectedMoods.length > 0 ? selectedMoods : undefined,
        sortBy,
        limit,
        offset,
      });
      setPitches(result.pitches);
      setTotal(result.total);
      setIsLoading(false);
    };

    loadPitches();
  }, [searchQuery, selectedTropes, selectedMoods, sortBy, offset]);

  const handleTropeToggle = (trope: string) => {
    setSelectedTropes((prev) =>
      prev.includes(trope) ? prev.filter((t) => t !== trope) : [...prev, trope]
    );
    setOffset(0);
  };

  const handleMoodToggle = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
    setOffset(0);
  };

  const hasActiveFilters = selectedTropes.length > 0 || selectedMoods.length > 0 || searchQuery.length > 0;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-[var(--font-display)] text-4xl font-semibold uppercase text-[var(--text)]">
            Discover Pitches
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Browse {total} stories waiting for their producers
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by title, logline, or concept..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Filters */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:h-fit">
            {/* Sort */}
            <div>
              <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setOffset(0);
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)] focus:border-[var(--accent-marigold)] focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="trending">Trending</option>
                <option value="most-viewed">Most Viewed</option>
                <option value="most-bookmarked">Most Bookmarked</option>
              </select>
            </div>

            {/* Tropes */}
            <div>
              <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">Tropes</h3>
              <div className="space-y-2">
                {TROPE_FILTERS.map((trope) => (
                  <label key={trope} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTropes.includes(trope)}
                      onChange={() => handleTropeToggle(trope)}
                      className="rounded border border-[var(--border)]"
                    />
                    <span className="text-sm text-[var(--text)]">{trope}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div>
              <h3 className="mb-3 font-mono text-xs uppercase text-[var(--text-muted)]">Mood</h3>
              <div className="space-y-2">
                {MOOD_FILTERS.map((mood) => (
                  <label key={mood} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMoods.includes(mood)}
                      onChange={() => handleMoodToggle(mood)}
                      className="rounded border border-[var(--border)]"
                    />
                    <span className="text-sm text-[var(--text)]">{mood}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTropes([]);
                  setSelectedMoods([]);
                  setOffset(0);
                }}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)]"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">Loading pitches...</p>
              </div>
            ) : pitches.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                <p className="text-[var(--text-muted)]">No pitches found matching your filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTropes([]);
                    setSelectedMoods([]);
                    setOffset(0);
                  }}
                  className="mt-4 text-[var(--accent-marigold)] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {pitches.map((pitch) => (
                    <PitchCard key={pitch.id} pitch={pitch} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-12 flex items-center justify-between">
                  <p className="text-sm text-[var(--text-muted)]">
                    Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= total}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
