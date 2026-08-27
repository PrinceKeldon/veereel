"use client";

import { X } from "lucide-react";
import type { PickerTitle } from "./SearchAndTrendingPicker";

interface TrendingTitlesDropdownProps {
  titles: PickerTitle[];
  onSelect: (title: PickerTitle) => void;
  onClose: () => void;
}

export function TrendingTitlesDropdown({ titles, onSelect, onClose }: TrendingTitlesDropdownProps) {
  return (
    <div
      className="fixed right-4 top-20 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Trending this week</span>
        <button type="button" onClick={onClose} aria-label="Close trending dropdown">
          <X size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
        </button>
      </div>

      {titles.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Nothing has cleared the trending floor yet — needs more click-through volume this week.
        </p>
      ) : (
        <div className="max-h-[400px] space-y-1 overflow-y-auto">
          {titles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelect(t);
                onClose();
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--accent-marigold)]/10"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
