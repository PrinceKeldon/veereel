import Link from "next/link";
import type { Title } from "@/generated/prisma/client";
import { TitleCoverArt } from "@/components/TitleCoverArt";

interface TitleCardProps {
  title: Pick<Title, "id" | "name" | "language" | "moodTags" | "coverImageUrl" | "episodeCount" | "pacing">;
  // Match score only ever appears with a stated reference — never a bare
  // unexplained percentage, since that would imply personalization the
  // product doesn't have data for yet. See lib/matching.ts.
  matchScore?: number;
  // Caller-computed, honesty-gated label ("Trending", "In the Fandom") —
  // never invented inside this component, same contract as matchScore.
  // page.tsx only ever passes this for titles that actually cleared
  // TrendingRail's/FandomTrendingRail's real, floor-gated queries.
  badge?: string;
}

/**
 * Borderless, art-forward card — inspired by ReelShort's poster-first
 * shelf treatment (see the homepage polish conversation). The cover
 * art fills the card's own bounds edge to edge with no frame, padding,
 * or surface background sitting on top of it; CoverGlow.tsx (which
 * existed specifically to wash that now-removed frame with the art's
 * own dominant hue) has been retired along with it — a glow behind
 * art that already fills the whole card is invisible, not subtle.
 *
 * The name sits *below* the art in normal flow, never overlaid on it —
 * a poster gets to be a poster, and the small caps title reads as a
 * gallery caption rather than fighting the artwork for the same
 * pixels. Mood tags and the language/episode/pacing line remain
 * hover/focus-revealed over the art's bottom edge, carrying their own
 * scrim so the pure art stays pristine until a reader asks for it;
 * that reveal is clipped to nothing at rest (max-height, not
 * display:none) so it never shifts the card's layout and screen
 * readers/find-in-page still see the text.
 */
export function TitleCard({ title, matchScore, badge }: TitleCardProps) {
  return (
    <Link href={`/kilig/title/${title.id}`} className="group block w-[164px] shrink-0 snap-start sm:w-[180px] lg:w-[200px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black transition-transform duration-200 group-hover:-translate-y-1">
        <TitleCoverArt title={title} showTitleOverlay={false} />

        {badge && (
          <div className="absolute left-1.5 top-1.5 rounded-full bg-[var(--accent-rose)]/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white">
            {badge}
          </div>
        )}
        {typeof matchScore === "number" && (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-[var(--accent-marigold)]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--bg)]">
            {matchScore}% match
          </div>
        )}

        {/* Hover/focus-revealed detail — collapsed to nothing at rest via
            max-height + opacity, not display:none, so the transition can
            animate and screen readers/find-in-page still see the text. */}
        <div className="absolute inset-x-0 bottom-0 max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-h-24 group-hover:opacity-100 group-focus-visible:max-h-24 group-focus-visible:opacity-100">
          <div className="flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
            <div className="flex flex-wrap gap-1">
              {title.moodTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/30 bg-black/40 px-2 py-0.5 font-mono text-[9px] uppercase text-white"
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <p className="font-mono text-[10px] text-white/70">
              {title.language.toUpperCase()} · {title.episodeCount ?? "?"} eps · {title.pacing ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-2 line-clamp-2 font-[var(--font-display)] text-xs leading-tight text-[var(--text)]">
        {title.name}
      </p>
    </Link>
  );
}
