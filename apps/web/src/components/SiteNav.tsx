import Link from "next/link";
import { Suspense } from "react";
import { Menu } from "lucide-react";
import { IdentityNavLink } from "@/components/IdentityNavLink";
import { SearchBar } from "@/components/SearchBar";

/**
 * The site's one nav bar. Deliberately a quiet outline treatment — a
 * thin solid marigold border around the bar with marigold text, so the
 * navigation reads clearly against the dark cinematic bg without
 * shouting over the content (earlier solid-marigold version was too
 * imposing). Lives in the homepage header; the rest of the app had no
 * nav bar before this (see IdentityNavLink.tsx).
 *
 * Browse all + search sit next to the Kilig wordmark on desktop rather
 * than in the Buzz/Curators/identity cluster — they're ways of finding
 * a title (like the wordmark is "home"), not destinations, so grouping
 * them together reads as one "get me to a title" affordance next to
 * home. On mobile there's no room for that in the compact top bar
 * (wordmark + hamburger only), so both live inside the dropdown panel
 * instead, alongside Buzz/Curators/identity.
 */
export function SiteNav() {
  return (
    <nav className="mb-5 flex items-center justify-between rounded-xl border border-[var(--accent-marigold)]/45 bg-[var(--surface)] px-4 py-2.5 sm:mb-8 sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:rounded-2xl sm:border-[var(--accent-marigold)] sm:px-5 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/kilig"
          className="shrink-0 font-mono text-[13px] uppercase tracking-wide text-[var(--accent-marigold)] sm:text-xs"
        >
          Kilig
        </Link>

        <div className="hidden items-center gap-4 sm:ml-auto sm:flex">
          <NavLink href="/kilig/titles">Browse all</NavLink>
          <SearchBar compact className="w-36 lg:w-44" />
        </div>

        <details className="group sm:hidden">
          <summary
            aria-label="Open navigation menu"
            className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--accent-marigold)]/45 text-[var(--accent-marigold)] transition-colors marker:hidden hover:border-[var(--accent-marigold)] [&::-webkit-details-marker]:hidden"
          >
            <Menu size={17} aria-hidden="true" />
          </summary>
          <div className="fixed left-3 top-[5.5rem] z-50 flex w-[min(calc(100vw-1.5rem),18rem)] flex-col gap-0.5 overflow-hidden rounded-2xl border border-white/20 bg-black/30 bg-gradient-to-b from-white/10 to-white/[0.02] p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="px-1.5 pb-1 pt-1">
              <SearchBar compact className="w-full" />
            </div>
            <NavLink href="/buzz">Buzz</NavLink>
            <NavLink href="/kilig/curators">Curators</NavLink>
            <NavLink href="/kilig/titles">Browse all</NavLink>
            <Suspense fallback={null}>
              <IdentityNavLink />
            </Suspense>
          </div>
        </details>
      </div>
      <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 sm:flex">
        <NavLink href="/buzz">Buzz</NavLink>
        <NavLink href="/kilig/curators">Curators</NavLink>
        <Suspense fallback={null}>
          <IdentityNavLink />
        </Suspense>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full min-w-0 rounded-lg px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-[var(--accent-marigold)] transition-colors hover:bg-white/5 hover:text-[var(--text)] sm:w-auto sm:rounded-none sm:px-0 sm:py-0 sm:text-[11px] sm:hover:bg-transparent"
    >
      {children}
    </Link>
  );
}
