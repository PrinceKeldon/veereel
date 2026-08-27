/**
 * Client-safe half of the caption engine — pure data and string logic
 * only, no imports that touch Prisma/pg/DNS. This file is imported
 * directly by client components (ContentDailyRoutine.tsx,
 * FormatPicker.tsx), so it must never import lib/matching.ts or
 * lib/prisma.ts, even transitively — that's exactly what broke the
 * build: contentTemplates.ts originally mixed this pure data with the
 * DB-touching generateCaption() in one file, and importing even just
 * CONTENT_FORMATS from a client component pulled pg's `dns` import
 * into the browser bundle along with it. The DB-touching half lives in
 * lib/contentCaption.ts, a server-only module imported only by
 * lib/content-actions.ts ("use server"), never directly by a client
 * component.
 */

export type ContentFormatId =
  | "what_are_you_watching"
  | "if_you_liked"
  | "unhinged"
  | "one_sentence_review"
  | "find_this_drama";

export interface ContentFormat {
  id: ContentFormatId;
  name: string;
  cadence: string;
  description: string;
  requiresRealData: boolean;
}

export const CONTENT_FORMATS: ContentFormat[] = [
  {
    id: "what_are_you_watching",
    name: "What are you watching?",
    cadence: "3x/week — Mon, Wed, Fri",
    description:
      "Comment-bait opener. Doesn't reference the selected title — comments become research; reply \"Just added this to Kilig\" once a real title comes up.",
    requiresRealData: false,
  },
  {
    id: "if_you_liked",
    name: "If you liked X...",
    cadence: "2x/week — Tue, Thu",
    description: "Points at real similar titles on Kilig (lib/matching.ts), not a vague unbacked \"3 picks\" promise.",
    requiresRealData: true,
  },
  {
    id: "unhinged",
    name: "Unhinged vertical drama of the day",
    cadence: "2x/week — Wed bonus, Sun",
    description: "Fan-caps energy, built from the title's own real trope/mood tags — never an invented scenario.",
    requiresRealData: false,
  },
  {
    id: "one_sentence_review",
    name: "One sentence review",
    cadence: "as needed",
    description: "Pulled directly from the title's own synopsis — real editorial content, not generated.",
    requiresRealData: true,
  },
  {
    id: "find_this_drama",
    name: "Find this drama",
    cadence: "as needed",
    description: "Direct CTA — comment SEND for the link.",
    requiresRealData: false,
  },
];

/**
 * Highlights a default format the same way the previous day-of-week
 * lock did — but as a suggestion, not a forced choice. The admin can
 * pick any of the 5 regardless of what day it is; this only decides
 * which one is pre-selected/emphasized in the UI.
 */
export function suggestedFormatForToday(): ContentFormatId {
  const day = new Date().getDay();
  return CONTENT_FORMATS[day % CONTENT_FORMATS.length].id;
}

export interface PlatformCaptions {
  tiktok: string;
  instagram: string;
  facebook: string;
}

const PLATFORM_LIMITS: Record<keyof PlatformCaptions, number> = {
  tiktok: 150,
  instagram: 2200,
  facebook: 2200,
};

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trim() + "…";
}

export function optimizeForPlatforms(caption: string): PlatformCaptions {
  return {
    tiktok: trimTo(caption, PLATFORM_LIMITS.tiktok),
    instagram: trimTo(caption, PLATFORM_LIMITS.instagram),
    facebook: trimTo(caption, PLATFORM_LIMITS.facebook),
  };
}
