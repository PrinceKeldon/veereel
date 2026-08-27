import type { Title } from "@/generated/prisma/client";
import { getSimilarTitles } from "@/lib/matching";
import type { ContentFormatId } from "@/lib/contentFormats";

/**
 * Server-only half of the caption engine — the actual DB-touching
 * generateCaption(). Must only ever be imported by lib/content-actions.ts
 * ("use server"), never by a client component directly: getSimilarTitles()
 * pulls in lib/matching.ts -> lib/prisma.ts -> pg, and pg needs Node's
 * `dns` module, which doesn't exist in the browser. See
 * lib/contentFormats.ts's file comment for the full story of why this
 * split exists.
 *
 * Every format is either genuinely title-agnostic (safe no matter what's
 * selected) or built directly from the title's own real fields —
 * synopsis, tropeTags, moodTags, or a real similar-titles query. No
 * format may assert something about a title that isn't actually true of
 * it — this replaced a hardcoded "Unhinged" caption that described a
 * werewolf marriage regardless of which real title was selected.
 */

type TitleForCaption = Pick<Title, "id" | "name" | "synopsis" | "tropeTags" | "moodTags">;

export interface CaptionResult {
  caption: string;
  // Set instead of caption when this format genuinely can't be
  // generated honestly for this title (no synopsis, no similar titles
  // found yet) — the caller should disable posting rather than show an
  // empty or fabricated caption.
  unavailableReason?: string;
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

function humanizeTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

export async function generateCaption(formatId: ContentFormatId, title: TitleForCaption): Promise<CaptionResult> {
  switch (formatId) {
    case "what_are_you_watching":
      return { caption: "What are you watching?" };

    case "if_you_liked": {
      const similar = await getSimilarTitles(title.id, 3);
      if (similar.length === 0) {
        return {
          caption: "",
          unavailableReason:
            "No genuinely similar titles yet for this one — needs more catalogue/behavioral signal to back this up honestly.",
        };
      }
      const names = similar.map((s) => `"${s.title.name}"`);
      if (names.length === 1) {
        return { caption: `If you liked "${title.name}", you'll want ${names[0]} next. Watch on Kilig — link in bio.` };
      }
      const last = names[names.length - 1];
      const rest = names.slice(0, -1).join(", ");
      return { caption: `If you liked "${title.name}", watch ${rest} and ${last} next. All on Kilig — link in bio.` };
    }

    case "unhinged": {
      const tag = title.moodTags[0] ?? title.tropeTags[0];
      if (!tag) {
        return { caption: `"${title.name.toUpperCase()}" — I am NOT emotionally prepared. 😭 On Kilig now.` };
      }
      return { caption: `"${title.name.toUpperCase()}" — ${humanizeTag(tag).toUpperCase()} and I'm NOT okay. 😭 On Kilig now.` };
    }

    case "one_sentence_review": {
      if (!title.synopsis) {
        return { caption: "", unavailableReason: "This title has no synopsis yet — nothing honest to pull a review from." };
      }
      return { caption: `"${title.name}" — ${firstSentence(title.synopsis)}` };
    }

    case "find_this_drama":
      return { caption: `Find "${title.name}" on Kilig. Comment SEND and I'll drop the link.` };
  }
}
