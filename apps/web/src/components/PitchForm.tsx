"use client";

import { useState, useActionState } from "react";
import { submitPitch } from "@/lib/pitch-actions";

const TROPE_SUGGESTIONS = [
  "Found Family",
  "Second Chance Romance",
  "Enemies to Lovers",
  "Time Travel",
  "Chosen One",
  "Heist",
  "Murder Mystery",
  "Coming of Age",
  "Underdog",
  "Star-Crossed Lovers",
  "Morally Gray",
  "Found Footage",
  "Slow Burn",
  "Love Triangle",
  "Redemption Arc",
];

const MOOD_SUGGESTIONS = ["Dark", "Comedic", "Hopeful", "Suspenseful", "Romantic", "Tragic", "Quirky", "Gritty"];

const PLATFORMS = ["Netflix", "HBO Max", "Hulu", "Apple TV", "Amazon Prime", "Disney+", "Indie", "YouTube"];

/**
 * writerId is no longer a prop here — submitPitch (pitch-actions.ts)
 * derives the writer from the session itself via requireWriter(), and
 * redirects server-side on success. The original version appended a
 * writerId prop into the FormData and then read `state.pitchId`
 * synchronously right after calling formAction() to manually
 * navigate — a stale-closure bug (useActionState's returned state
 * doesn't update until the next render), so that redirect likely
 * never actually fired on a real successful submit. Using the plain
 * <form action={formAction}> directly avoids both problems at once.
 */
export function PitchForm() {
  const [state, formAction] = useActionState(submitPitch, {});
  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [tropeTags, setTropeTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [episodeCount, setEpisodeCount] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [pitchVideoUrl, setPitchVideoUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleTropeToggle = (trope: string) => {
    setTropeTags((prev) =>
      prev.includes(trope) ? prev.filter((t) => t !== trope) : [...prev, trope]
    );
  };

  const handleMoodToggle = (mood: string) => {
    setMoodTags((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handlePlatformToggle = (platform: string) => {
    setTargetPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const canSubmit =
    title.length >= 5 &&
    logline.length >= 10 &&
    synopsis.length >= 50 &&
    !state.error;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold uppercase text-[var(--text)]">
          Submit Your Pitch
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Tell producers your story. Be clear, compelling, and concise.
        </p>
      </div>

      <form action={formAction} className="space-y-8">
        {/* Title */}
        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Pitch Title *
          </label>
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Haunting of Heartwood Manor"
            maxLength={100}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{5}-{100} characters</span>
            <span>{title.length}/100</span>
          </div>
        </div>

        {/* Logline */}
        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Logline * (One-liner that sells it)
          </label>
          <textarea
            name="logline"
            value={logline}
            onChange={(e) => setLogline(e.target.value)}
            placeholder="When a family moves into their dream home, they discover the previous owner isn't ready to leave."
            maxLength={150}
            rows={2}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{10}-{150} characters</span>
            <span>{logline.length}/150</span>
          </div>
        </div>

        {/* Synopsis */}
        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Synopsis * (Full story)
          </label>
          <textarea
            name="synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="Enter your full story synopsis here. Introduce your characters, the central conflict, and the emotional journey. What's at stake? How does it resolve?"
            maxLength={2000}
            rows={8}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{50}-{2000} characters</span>
            <span>{synopsis.length}/2000</span>
          </div>
        </div>

        {/* Tropes */}
        <div>
          <label className="mb-3 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Story Tropes (Help producers find you)
          </label>
          <div className="flex flex-wrap gap-2">
            {TROPE_SUGGESTIONS.map((trope) => (
              <button
                key={trope}
                type="button"
                onClick={() => handleTropeToggle(trope)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  tropeTags.includes(trope)
                    ? "bg-[var(--accent-marigold)] text-[var(--bg)]"
                    : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-marigold)]"
                }`}
              >
                {trope}
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="tropeTags"
            value={tropeTags.join(", ")}
          />
        </div>

        {/* Mood */}
        <div>
          <label className="mb-3 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Mood / Tone
          </label>
          <div className="flex flex-wrap gap-2">
            {MOOD_SUGGESTIONS.map((mood) => (
              <button
                key={mood}
                type="button"
                onClick={() => handleMoodToggle(mood)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  moodTags.includes(mood)
                    ? "bg-[var(--accent-rose)] text-[var(--bg)]"
                    : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-rose)]"
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="moodTags"
            value={moodTags.join(", ")}
          />
        </div>

        {/* Episode Count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
              Estimated Episodes
            </label>
            <input
              type="number"
              name="episodeCount"
              value={episodeCount}
              onChange={(e) => setEpisodeCount(e.target.value)}
              placeholder="6"
              min={1}
              max={500}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
              Target Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handlePlatformToggle(platform)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    targetPlatforms.includes(platform)
                      ? "bg-[var(--accent-marigold)] text-[var(--bg)]"
                      : "border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-marigold)]"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
            <input
              type="hidden"
              name="targetPlatforms"
              value={targetPlatforms.join(", ")}
            />
          </div>
        </div>

        {/* Pitch Video URL */}
        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Pitch Video URL (Optional)
          </label>
          <input
            type="url"
            name="pitchVideoUrl"
            value={pitchVideoUrl}
            onChange={(e) => setPitchVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            YouTube, Vimeo, or other video platform link
          </p>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="rounded-lg border border-[var(--accent-rose)] bg-[var(--accent-rose)]/10 p-4">
            <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>
          </div>
        )}

        {/* Preview & Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="rounded-xl border border-[var(--border)] px-6 py-3 font-semibold text-[var(--text)] hover:bg-[var(--surface)]"
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-[var(--accent-marigold)] py-3 font-semibold text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
          >
            Submit Pitch
          </button>
        </div>
      </form>

      {/* Preview */}
      {showPreview && (
        <div className="mt-12 space-y-6 border-t border-[var(--border)] pt-8">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--text)]">
              {title || "Your Pitch Title"}
            </h2>
            <p className="mt-2 text-lg text-[var(--text-muted)]">
              {logline || "Your one-liner will appear here..."}
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase text-[var(--text-muted)]">Synopsis</h3>
            <p className="mt-2 text-[var(--text)]">{synopsis || "Your full synopsis will appear here..."}</p>
          </div>

          {(tropeTags.length > 0 || moodTags.length > 0 || targetPlatforms.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {tropeTags.length > 0 && (
                <div>
                  <h3 className="font-mono text-xs uppercase text-[var(--text-muted)]">Tropes</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tropeTags.map((trope) => (
                      <span
                        key={trope}
                        className="rounded-full bg-[var(--accent-marigold)]/20 px-3 py-1 text-xs text-[var(--accent-marigold)]"
                      >
                        {trope}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {moodTags.length > 0 && (
                <div>
                  <h3 className="font-mono text-xs uppercase text-[var(--text-muted)]">Mood</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {moodTags.map((mood) => (
                      <span
                        key={mood}
                        className="rounded-full bg-[var(--accent-rose)]/20 px-3 py-1 text-xs text-[var(--accent-rose)]"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {targetPlatforms.length > 0 && (
                <div>
                  <h3 className="font-mono text-xs uppercase text-[var(--text-muted)]">Platforms</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {targetPlatforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-lg bg-[var(--accent-marigold)]/20 px-2 py-1 text-xs text-[var(--accent-marigold)]"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
