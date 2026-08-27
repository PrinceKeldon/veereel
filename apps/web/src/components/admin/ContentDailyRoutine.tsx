"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchAndTrendingPicker, type PickerTitle } from "@/components/admin/SearchAndTrendingPicker";
import { FormatPicker } from "@/components/admin/FormatPicker";
import { PlatformCaptionTabs } from "@/components/admin/PlatformCaptionTabs";
import { MarkAsPostedForm } from "@/components/admin/MarkAsPostedForm";
import { PostedHistory } from "@/components/admin/PostedHistory";
import { generateCaptionAction, type RecentContentPost } from "@/lib/content-actions";
import { suggestedFormatForToday, type ContentFormatId, type PlatformCaptions } from "@/lib/contentFormats";

interface ContentDailyRoutineProps {
  initialTitles: PickerTitle[];
  trendingTitles: PickerTitle[];
  recentPosts: RecentContentPost[];
}

const suggested = suggestedFormatForToday();

/**
 * Orchestrator only — every real decision (what a caption says, what's
 * trending, whether a post was actually recorded) lives in
 * lib/contentFormats.ts / lib/contentCaption.ts / lib/content-actions.ts,
 * not duplicated here. The previous build's version of this file had its own
 * hardcoded, day-of-week-locked caption generator running in parallel
 * with FormatTemplate.tsx's separate one — this version calls the
 * single server-side generateCaptionAction and renders whatever it
 * returns.
 */
export function ContentDailyRoutine({ initialTitles, trendingTitles, recentPosts }: ContentDailyRoutineProps) {
  const router = useRouter();
  const [selectedTitle, setSelectedTitle] = useState<PickerTitle | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ContentFormatId>(suggested);
  const [platformCaptions, setPlatformCaptions] = useState<PlatformCaptions | null>(null);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [postedThisSession, setPostedThisSession] = useState<Set<string>>(new Set());
  const [isGenerating, startGenerating] = useTransition();

  function handleSelectTitle(title: PickerTitle) {
    setSelectedTitle(title);
    setPlatformCaptions(null);
    setUnavailableReason(null);
  }

  function handleSelectFormat(formatId: ContentFormatId) {
    setSelectedFormat(formatId);
    setPlatformCaptions(null);
    setUnavailableReason(null);
  }

  function handleGenerate() {
    if (!selectedTitle) return;
    startGenerating(async () => {
      const result = await generateCaptionAction(selectedTitle.id, selectedFormat);
      if (result.unavailableReason) {
        setUnavailableReason(result.unavailableReason);
        setPlatformCaptions(null);
        return;
      }
      setUnavailableReason(null);
      setPlatformCaptions(result.platformCaptions ?? null);
    });
  }

  function handlePosted(platform: string) {
    setPostedThisSession((prev) => new Set(prev).add(platform));
    // Pulls the real, persisted history back down from the server —
    // the whole point of moving this to a real table.
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="relative p-6 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-[var(--font-display)] text-xl font-semibold uppercase text-[var(--text)]">Pick a title</h2>
          <SearchAndTrendingPicker titles={initialTitles} trendingTitles={trendingTitles} onSelect={handleSelectTitle} />
        </div>
      </section>

      {selectedTitle && (
        <section className="p-6 bg-[var(--surface)] rounded-xl border border-[var(--border)] space-y-4">
          <h2 className="font-[var(--font-display)] text-xl font-semibold uppercase text-[var(--text)]">Pick a format</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Title: <strong className="text-[var(--text)]">{selectedTitle.name}</strong>
          </p>
          <FormatPicker selected={selectedFormat} suggested={suggested} onSelect={handleSelectFormat} />

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full rounded-md px-4 py-2 font-mono text-sm text-[var(--bg)] bg-[var(--accent-marigold)] hover:bg-[var(--accent-rose)] transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate caption"}
          </button>

          {unavailableReason && (
            <p className="text-sm text-[var(--accent-rose)]">{unavailableReason}</p>
          )}
        </section>
      )}

      {selectedTitle && platformCaptions && (
        <section className="space-y-4">
          <PlatformCaptionTabs captions={platformCaptions} />
          <MarkAsPostedForm
            titleId={selectedTitle.id}
            format={selectedFormat}
            captions={platformCaptions}
            onPosted={handlePosted}
          />
          {postedThisSession.size > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Marked posted this session: {Array.from(postedThisSession).join(", ")}
            </p>
          )}
        </section>
      )}

      <PostedHistory posts={recentPosts} />
    </div>
  );
}
