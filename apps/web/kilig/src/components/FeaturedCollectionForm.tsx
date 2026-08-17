"use client";

import { useActionState } from "react";
import { setFeaturedCollection, type CuratorSettingsState } from "@/lib/curator-actions";

interface FeaturedCollectionFormProps {
  collections: { id: string; name: string }[];
  /** Currently pinned featured collection id, or null/undefined when on the automatic fallback. */
  featuredCollectionId: string | null;
}

const initialState: CuratorSettingsState = {};

// Curators pick which Collection is their "Featured Collection" shelf.
// "Auto (most recent)" clears the pin and returns to the profile page's
// fallback — whichever Collection they most recently created or added a
// title to. See setFeaturedCollection in curator-actions.ts.
export function FeaturedCollectionForm({ collections, featuredCollectionId }: FeaturedCollectionFormProps) {
  const [state, formAction, isPending] = useActionState(setFeaturedCollection, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <select
        name="collectionId"
        defaultValue={featuredCollectionId ?? ""}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] focus:border-[var(--accent-marigold)] focus:outline-none"
      >
        <option value="">Auto — most recently active</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-xl bg-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save featured"}
      </button>
    </form>
  );
}