"use client";

import { CONTENT_FORMATS, type ContentFormatId } from "@/lib/contentFormats";

interface FormatPickerProps {
  selected: ContentFormatId;
  suggested: ContentFormatId;
  onSelect: (formatId: ContentFormatId) => void;
}

/**
 * Replaces the previous build's FormatTemplate.tsx, which hardcoded
 * its own separate 3-format list (mislabeled as platforms) with
 * non-functional copy buttons, disconnected from the format actually
 * used to generate the caption below it. This component only ever
 * picks a format id — CONTENT_FORMATS (lib/contentFormats.ts) is the
 * only place caption text or format metadata is defined.
 */
export function FormatPicker({ selected, suggested, onSelect }: FormatPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {CONTENT_FORMATS.map((format) => {
        const isSelected = format.id === selected;
        const isSuggested = format.id === suggested && format.id !== selected;
        return (
          <button
            key={format.id}
            type="button"
            onClick={() => onSelect(format.id)}
            aria-pressed={isSelected}
            className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              isSelected
                ? "border-[var(--accent-marigold)] bg-[var(--accent-marigold)]/10"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent-marigold)]/60"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-mono text-sm text-[var(--text)]">{format.name}</span>
              {isSuggested && (
                <span className="shrink-0 rounded-full bg-[var(--accent-rose)]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--accent-rose)]">
                  Suggested today
                </span>
              )}
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{format.cadence}</span>
            <span className="text-xs text-[var(--text-muted)]">{format.description}</span>
          </button>
        );
      })}
    </div>
  );
}
