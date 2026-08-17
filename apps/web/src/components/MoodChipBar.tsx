"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Flame, Sparkles, HeartCrack, Eye, Crown, Lock, Drama, SlidersHorizontal, ChevronDown } from "lucide-react";
import { MOOD_CHIPS, type MoodChip } from "@/lib/moodChips";

const ICONS: Record<MoodChip["icon"], typeof Heart> = {
  Heart,
  Flame,
  Sparkles,
  HeartCrack,
  Eye,
  Crown,
  Lock,
  Drama,
};

/**
 * Mood selection lives in the URL (?mood=longing,revenge) rather than
 * client component state. This keeps the browse experience server-
 * rendered and shareable — toggling a chip is a navigation, not a
 * client-side fetch — while still feeling instant via Next.js's
 * client-side router cache.
 */
export function MoodChipBar({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeMoods = searchParams.get("mood")?.split(",").filter(Boolean) ?? [];
  const [filtersOpen, setFiltersOpen] = useState(activeMoods.length > 0);

  const toggleMood = (value: string) => {
    const next = activeMoods.includes(value)
      ? activeMoods.filter((v) => v !== value)
      : [...activeMoods, value];
    if (next.length > 0) setFiltersOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    if (next.length) {
      params.set("mood", next.join(","));
    } else {
      params.delete("mood");
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <details
      className="group mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      open={filtersOpen}
      onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal size={16} aria-hidden="true" className="shrink-0 text-[var(--accent-marigold)]" />
          <span className="font-mono text-xs uppercase tracking-wide text-[var(--text)]">Mood and trope filters</span>
          {activeMoods.length > 0 && (
            <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {activeMoods.length} active
            </span>
          )}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--border)] px-3 py-3">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {MOOD_CHIPS.map((chip) => {
            const Icon = ICONS[chip.icon];
            const isActive = activeMoods.includes(chip.value);
            // Trope chips read marigold, mood chips read rose — the same
            // dual-accent rule TaxonomySignal already uses for trope vs
            // mood alignment bars. Full literal class strings on both
            // branches (not an interpolated CSS var name) because
            // Tailwind's build-time scanner needs the exact class text
            // present in source to generate it — a runtime-interpolated
            // class name silently produces no CSS at all.
            const isTrope = chip.type === "trope";
            const buttonClass = isActive
              ? isTrope
                ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors bg-[var(--accent-marigold)] border-[var(--accent-marigold)] text-[var(--bg)] sm:rounded-full sm:px-4 sm:text-sm"
                : "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors bg-[var(--accent-rose)] border-[var(--accent-rose)] text-[var(--bg)] sm:rounded-full sm:px-4 sm:text-sm"
              : isTrope
                ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-marigold)] sm:rounded-full sm:bg-[var(--surface)] sm:px-4 sm:text-sm"
                : "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-colors bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-rose)] sm:rounded-full sm:bg-[var(--surface)] sm:px-4 sm:text-sm";
            const iconClass = isActive ? "shrink-0" : isTrope ? "shrink-0 text-[var(--accent-marigold)]" : "shrink-0 text-[var(--accent-rose)]";

            return (
              <button key={chip.value} type="button" onClick={() => toggleMood(chip.value)} className={buttonClass}>
                <Icon size={15} aria-hidden="true" className={iconClass} />
                <span className="min-w-0 truncate">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
