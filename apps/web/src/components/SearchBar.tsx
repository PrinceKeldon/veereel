import { Search } from "lucide-react";

/**
 * Deliberately a Server Component. A plain <form method="GET"> needs no
 * client JS to work — the browser handles the navigation to /search?q=...
 * itself. Keeps this consistent with the "few Client Components"
 * philosophy in ARCHITECTURE.md (MoodChipBar is the only place that
 * actually needs client-side interactivity).
 */
export function SearchBar({
  defaultValue = "",
  className = "mb-7",
  compact = false,
}: {
  defaultValue?: string;
  className?: string;
  // Inline nav-bar treatment (see SiteNav.tsx) — narrower, no separate
  // submit button, icon doubles as the submit target. Same GET form
  // underneath, just sized to sit next to the Kilig wordmark instead
  // of standing alone in a page header.
  compact?: boolean;
}) {
  if (compact) {
    return (
      <form action="/search" method="GET" className={className}>
        <div className="flex w-full items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] py-1.5 pl-3 pr-1.5 focus-within:border-[var(--accent-marigold)]">
          <input
            type="text"
            name="q"
            defaultValue={defaultValue}
            placeholder="Search..."
            className="w-full bg-transparent font-mono text-[11px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex shrink-0 items-center justify-center rounded-full p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--accent-marigold)]"
          >
            <Search size={13} aria-hidden="true" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action="/search" method="GET" className={`${className} flex max-w-md items-center gap-2`}>
      <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 focus-within:border-[var(--accent-marigold)]">
        <Search size={16} className="text-[var(--text-muted)]" aria-hidden="true" />
        <input
          type="text"
          name="q"
          defaultValue={defaultValue}
          placeholder="Search titles..."
          className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
      >
        Search
      </button>
    </form>
  );
}
