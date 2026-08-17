import type { Title } from "@/generated/prisma/client";
import { TitleCard } from "@/components/TitleCard";

interface TitleRailProps {
  eyebrow: string;
  // A logo to render before the eyebrow text — used specifically for
  // platform-attributed rails (a partner's own page masthead, and a
  // future "Fresh from our partners" homepage rail) so the platform
  // gets actual brand presence rather than a plain text credit line.
  // See PARTNER_PUBLISHING_PLAN.md.
  eyebrowLogoUrl?: string;
  titles: Array<
    Pick<Title, "id" | "name" | "language" | "moodTags" | "coverImageUrl" | "episodeCount" | "pacing"> & {
      matchScore?: number;
    }
  >;
  // Applies to every card in this rail — for a rail whose whole premise
  // IS a real, floor-gated signal (TrendingRail, FandomTrendingRail in
  // page.tsx), not a per-title flag. A rail built on an unfiltered list
  // (NewestRail, MoodRail) simply omits this rather than badging
  // everything in it, same honesty-gating contract as TitleCard's own
  // badge prop.
  badge?: string;
}

export function TitleRail({ eyebrow, eyebrowLogoUrl, titles, badge }: TitleRailProps) {
  if (titles.length === 0) return null;

  return (
    <section className="mb-9">
      <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {eyebrowLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- platform-provided logo (data URI or URL)
          <img src={eyebrowLogoUrl} alt="" className="h-4 w-auto max-w-[5rem] object-contain" />
        )}
        <span>{eyebrow}</span>
      </p>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
        {titles.map((title) => (
          <TitleCard key={title.id} title={title} matchScore={title.matchScore} badge={badge} />
        ))}
      </div>
    </section>
  );
}
