"use client";

import { useActionState, useState } from "react";
import {
  createPlatformAnnouncement,
  deletePlatformAnnouncement,
  type AnnouncementState,
} from "@/lib/platform-actions";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none";
const labelClass = "mb-1 block font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]";

const initialState: AnnouncementState = {};

interface PlatformAnnouncementsFormProps {
  titles: { id: string; name: string }[];
  announcements: { id: string; headline: string; createdAt: Date }[];
}

/**
 * The platform's own voice, contained to their /platform/[slug] page
 * (see createPlatformAnnouncement() in platform-actions.ts). Lists
 * existing announcements with a delete affordance, plus the post form.
 */
export function PlatformAnnouncementsForm({ titles, announcements }: PlatformAnnouncementsFormProps) {
  const [headline, setHeadline] = useState("");
  const [state, formAction, isPending] = useActionState(createPlatformAnnouncement, initialState);

  return (
    <div className="flex flex-col gap-5">
      {announcements.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Your announcements
          </p>
          <ul className="flex flex-col gap-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)]"
              >
                <span className="min-w-0 truncate">{a.headline}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)]">
                    {a.createdAt.toLocaleDateString()}
                  </span>
                  <form action={deletePlatformAnnouncement.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--accent-rose)]"
                    >
                      Delete
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Post an announcement
        </p>
        <form action={formAction} className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="annHeadline">Headline</label>
            <input
              id="annHeadline"
              name="headline"
              maxLength={80}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="New season drops Friday"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="annBody">Body</label>
            <textarea
              id="annBody"
              name="body"
              rows={2}
              maxLength={400}
              placeholder="Tell viewers what's coming and when."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="annTitle">Link to one of your titles (optional)</label>
            <select id="annTitle" name="titleId" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-xl bg-[var(--accent-marigold)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Posting…" : "Post announcement"}
          </button>
        </form>
      </div>
    </div>
  );
}