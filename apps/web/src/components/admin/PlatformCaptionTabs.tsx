"use client";

import { useState, useCallback, useRef } from "react";

interface PlatformCaptionTabsProps {
  captions: {
    tiktok?: string;
    instagram?: string;
    facebook?: string;
  };
}

const PLATFORM_META = {
  tiktok: { label: "TikTok", hint: "Tip: TikTok captions work best under 150 chars for quick reading." },
  instagram: { label: "Instagram", hint: "Tip: Instagram allows up to 2,200 chars — include hashtags and drama details." },
  facebook: { label: "Facebook", hint: "Tip: Facebook posts benefit from paragraph breaks and community tone." },
} as const;

const COPY_RESET_MS = 2000;

export function PlatformCaptionTabs({ captions }: PlatformCaptionTabsProps) {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleCopy = useCallback((platform: keyof typeof captions) => {
    const caption = captions[platform];
    if (!caption) return;

    navigator.clipboard.writeText(caption).then(
      () => {
        setCopied((prev) => ({ ...prev, [platform]: true }));
        // Reset after a moment so re-copying (e.g. after editing) isn't
        // blocked forever — the previous build left this permanently
        // disabled once copied once.
        clearTimeout(timers.current[platform]);
        timers.current[platform] = setTimeout(() => {
          setCopied((prev) => ({ ...prev, [platform]: false }));
        }, COPY_RESET_MS);
      },
      (err) => {
        console.error("Failed to copy caption:", err);
      }
    );
  }, [captions]);

  const platforms = Object.keys(PLATFORM_META) as Array<keyof typeof PLATFORM_META>;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Platform-specific captions (auto-optimized length per platform):
      </p>

      <div className="space-y-4">
        {platforms.map((platform) => {
          const caption = captions[platform];
          const meta = PLATFORM_META[platform];
          return (
            <div key={platform}>
              <p className="mb-1 font-mono text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">{meta.label}</p>
              <textarea
                value={caption ?? ""}
                readOnly
                rows={3}
                placeholder={`Caption for ${meta.label}...`}
                className="w-full resize-none rounded-xl bg-[var(--bg)] p-3 font-mono text-sm leading-relaxed text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-marigold)]"
              />
              <button
                type="button"
                onClick={() => handleCopy(platform)}
                disabled={!caption}
                aria-label={`Copy ${meta.label} caption`}
                className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] py-2 font-mono text-sm text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied[platform] ? "✓ Copied!" : `Copy to Clipboard (${meta.label})`}
              </button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{meta.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
