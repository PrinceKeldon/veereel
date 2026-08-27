"use client";

import { useState, useTransition } from "react";
import { markContentPosted } from "@/lib/content-actions";

interface MarkAsPostedFormProps {
  titleId: string;
  format: string;
  captions: { tiktok?: string; instagram?: string; facebook?: string };
  onPosted: (platform: string) => void;
}

/**
 * Wired to a real server action (markContentPosted, content-actions.ts)
 * that writes a ContentPost row — the previous build only ever called
 * a parent callback that did console.log(url) and kept an in-memory
 * Set, both gone the moment the page refreshed.
 */
export function MarkAsPostedForm({ titleId, format, captions, onPosted }: MarkAsPostedFormProps) {
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "facebook">("tiktok");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) return;
    const caption = captions[platform];
    if (!caption) {
      setError("Generate a caption for this platform first.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await markContentPosted({ titleId, format, platform, caption, postUrl: trimmed });
      if (result.error) {
        setError(result.error);
        return;
      }
      onPosted(platform);
      setUrl("");
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Mark manual upload as posted (after you've posted on each platform):
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-sm text-[var(--text)]">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-marigold)]"
          >
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block font-mono text-sm text-[var(--text)]">Post URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste the post URL here..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-marigold)]"
          />
        </div>

        {error && <p className="text-sm text-[var(--accent-rose)]">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setError(null);
            }}
            className="flex-1 rounded-md border border-[var(--border)] bg-transparent py-2 font-mono text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !url.trim()}
            className="flex-1 rounded-md bg-[var(--accent-marigold)] py-2 text-sm font-medium uppercase tracking-wide text-[var(--bg)] transition-opacity disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Mark as Posted"}
          </button>
        </div>
      </div>
    </div>
  );
}
