"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TitleCoverArt } from "@/components/TitleCoverArt";
import type { HeroTitle } from "@/lib/hero";

interface HomeHeroProps {
  titles: HeroTitle[];
}

const ROTATE_MS = 6000;

function hasFineHoverPointer(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function HeroTags({ title }: { title: HeroTitle }) {
  const tags = [
    ...title.tropeTags.map((tag) => ({ tag, tone: "neutral" as const })),
    ...title.moodTags.map((tag) => ({ tag, tone: "mood" as const })),
  ];
  const visibleTags = tags.slice(0, 5);
  const hiddenCount = Math.max(0, tags.length - visibleTags.length);

  if (tags.length === 0) return null;

  return (
    <div className="mx-auto flex max-w-[calc(100vw-2.5rem)] flex-wrap justify-center gap-1.5 overflow-hidden px-1 sm:mx-0 sm:max-w-full sm:justify-start sm:px-0">
      {visibleTags.map(({ tag, tone }) => (
        <span
          key={`${tone}-${tag}`}
          className={`max-w-full shrink truncate rounded-full border bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-white ${
            tone === "mood" ? "border-[var(--accent-marigold)]/50" : "border-white/30"
          }`}
        >
          {tag.replace(/_/g, " ")}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="shrink-0 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-white/80">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

/**
 * The homepage's banner-style spotlight — inspired by ReelShort's hero
 * strip (full-bleed art, huge scale, auto-rotating) but fed by
 * lib/hero.ts's honesty-gated source rather than an algorithmic/
 * editorial label: whatever's shown here is either the admin's own
 * pick or a title that real curators have actually collected, never
 * fabricated urgency. See lib/hero.ts's docstring for the data side
 * of that decision.
 *
 * The covers are vertical (9:16-style) by design, so the hero no
 * longer tries to letterbox them into a landscape banner and crop what
 * doesn't fit. Instead the same art does double duty: a large, uncropped
 * poster at its natural aspect is the star, while a blurred, scaled-up
 * copy of itself fills the whole banner behind it as the backdrop.
 * Details (title, synopsis, trope + mood pills) sit beside the poster
 * on desktop, stacked beneath it on mobile.
 */
function HeroPoster({ title }: { title: HeroTitle }) {
  if (title.coverImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized producer art (same rationale as TitleCoverArt)
      <img
        src={title.coverImageUrl}
        alt={title.name}
        className="h-full w-full rounded-xl object-cover shadow-2xl sm:w-auto sm:object-contain"
      />
    );
  }
  return (
    <div className="flex h-full w-full shrink-0 overflow-hidden rounded-xl sm:w-[200px]">
      <TitleCoverArt title={title} showTitleOverlay={false} />
    </div>
  );
}

export function HomeHero({ titles }: HomeHeroProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || titles.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % titles.length);
    }, ROTATE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [paused, titles.length]);

  if (titles.length === 0) return null;

  const active = titles[index];
  const showNext = () => setIndex((i) => (i + 1) % titles.length);

  return (
    <section
      className="relative mb-10 -mx-4 overflow-hidden bg-black px-5 py-6 pb-10 sm:mx-0 sm:h-[480px] sm:rounded-3xl sm:p-0"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setPaused(false);
      }}
      onFocus={() => {
        if (hasFineHoverPointer()) setPaused(true);
      }}
      onBlur={() => {
        if (hasFineHoverPointer()) setPaused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Featured on Kilig"
    >
      {/* Blurred copy of the same art, filling the whole banner so the
          wide strip never shows dead space around the upright poster. */}
      <div className="absolute inset-0 hidden scale-110 opacity-60 blur-3xl sm:block" aria-hidden="true">
        <TitleCoverArt title={active} showTitleOverlay={false} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,95,122,0.22),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.72),rgba(0,0,0,0.94))] sm:bg-black/55" />

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-start gap-4 sm:flex-row sm:items-center sm:justify-start sm:gap-10 sm:p-10">
        <div className="relative aspect-[4/5] w-[82vw] max-w-[330px] shrink-0 self-center sm:aspect-auto sm:h-full sm:w-auto sm:max-w-none sm:max-h-[400px]">
          <Link href={`/kilig/title/${active.id}`} className="block h-full w-full" aria-label={`Open ${active.name}`}>
            <HeroPoster title={active} />
          </Link>
        </div>

        <div className="flex w-full flex-col gap-2 text-center sm:max-w-xl sm:flex-1 sm:min-w-0 sm:text-left">
          <Link href={`/kilig/title/${active.id}`} className="block">
            <h2 className="mx-auto max-w-[14ch] font-[var(--font-display)] text-[clamp(1.5rem,8vw,2rem)] font-semibold uppercase leading-[0.98] text-white transition-opacity hover:opacity-85 sm:mx-0 sm:max-w-2xl sm:text-3xl sm:leading-tight">
              {active.name}
            </h2>
          </Link>
          <HeroTags title={active} />
          {active.synopsis && (
            <p className="hidden max-w-xl text-sm leading-relaxed text-white/80 sm:line-clamp-2 sm:block sm:text-base">
              {active.synopsis}
            </p>
          )}
          {/* Only ever rendered for a title that genuinely came from the
              most-collected query — collectCount is undefined for admin
              picks and the newest-titles fallback, see HeroTitle's own
              comment in lib/hero.ts. */}
          {typeof active.collectCount === "number" && (
            <p className="font-mono text-[11px] uppercase tracking-wide text-white/60">
              Collected by {active.collectCount} curator{active.collectCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {titles.length > 1 && (
        <>
          <button
            type="button"
            onClick={showNext}
            aria-label="Next featured title"
            className="absolute right-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/65 text-white shadow-2xl backdrop-blur transition-colors hover:bg-black/80 sm:right-2"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:bottom-4">
            {titles.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${t.name}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
