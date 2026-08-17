import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Title } from "@/generated/prisma/client";
import { TitleCoverArt } from "@/components/TitleCoverArt";

interface CuratorCollectionCardProps {
  /** First 3 items of the Collection, most-recent-first — the cover-art grid is the visual language of the card. */
  items: { title: Pick<Title, "id" | "name" | "coverImageUrl"> }[];
  name: string;
  description?: string | null;
  itemCount: number;
  href: string;
}

// Replaces the text-only collection link on curator profiles (see
// CURATOR_REDESIGN_PLAN.md). Posts become the card's subject, with the
// curator's one-line description as the emotional hook underneath —
// the design intent is "a shelf you want to browse", not a link list.
export function CuratorCollectionCard({ items, name, description, itemCount, href }: CuratorCollectionCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent-marigold)]"
    >
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => {
          const title = items[i]?.title;
          if (!title) {
            // Fill a missing slot with a "to be filled" tile so a
            // sparse Collection doesn't collapse the grid.
            return (
              <div
                key={i}
                className="flex aspect-[9/16] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
              >
                {i === 0 ? "Empty" : "…"}
              </div>
            );
          }
          return (
            <div key={title.id} className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
              <TitleCoverArt title={title} showTitleOverlay={false} />
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-[var(--font-display)] text-lg leading-snug text-[var(--text)] transition-colors group-hover:text-[var(--accent-marigold)]">
        {name}
      </p>

      {description && (
        <p className="mt-1 text-sm leading-snug text-[var(--text-muted)] line-clamp-2">{description}</p>
      )}

      <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {itemCount} {itemCount === 1 ? "title" : "titles"}
        <ArrowRight
          size={13}
          aria-hidden="true"
          className="ml-auto text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-marigold)]"
        />
      </p>
    </Link>
  );
}