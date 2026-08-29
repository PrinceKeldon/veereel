import Link from "next/link";
import { getCurrentCurator } from "@/lib/curator-actions";

/**
 * The Collections identity entry point inside SiteNav — "Claim a name"
 * for a first-time visitor, or a link straight to their own profile
 * once they've claimed one. Marigold text on the dark bar, matching the
 * rest of the nav's outline-highlight treatment.
 */
export async function IdentityNavLink() {
  const curator = await getCurrentCurator();
  const linkClass =
    "block w-full min-w-0 rounded-lg px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-[var(--accent-marigold)] transition-colors hover:bg-white/5 hover:text-[var(--text)] sm:w-auto sm:rounded-none sm:px-0 sm:py-0 sm:text-[11px] sm:hover:bg-transparent";

  if (curator) {
    return (
      <span className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={`/curator/${curator.displayName}`} className={linkClass}>
          {curator.displayName}&rsquo;s Collections
        </Link>
        <Link href="/kilig/settings" className={linkClass}>
          Settings
        </Link>
      </span>
    );
  }

  return (
    <Link href="/kilig/claim" className={linkClass}>
      Claim a name → start curating
    </Link>
  );
}
