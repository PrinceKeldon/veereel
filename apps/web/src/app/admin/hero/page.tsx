import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getHeroMode, getMostCollectedHeroTitles, MIN_COLLECTS_FOR_HERO } from "@/lib/hero";
import { setHeroRankFromForm, clearHeroRankFromForm, setHeroModeFromForm } from "@/lib/hero-actions";

const RANKS = [1, 2, 3, 4, 5] as const;

export default async function AdminHeroPage() {
  if (!(await isAdminSession())) redirect("/admin/login");

  const [mode, ranked, mostCollectedPreview, pickable] = await Promise.all([
    getHeroMode(),
    prisma.title.findMany({
      where: { heroRank: { not: null } },
      orderBy: { heroRank: "asc" },
      select: { id: true, name: true, heroRank: true, isPublished: true },
    }),
    getMostCollectedHeroTitles(),
    // Only published, non-draft titles are eligible to pick from — an
    // admin picking a draft would silently break the hero the moment
    // getHeroTitles() filters it back out.
    prisma.title.findMany({
      where: { isPublished: true, curatorDraft: false, heroRank: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rankedByRank = new Map(ranked.map((t) => [t.heroRank, t]));

  return (
    <main className="mx-auto max-w-xl px-6 py-14 pb-20">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent-marigold)]"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Admin
      </Link>

      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-6 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        Homepage hero
      </h1>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Hero source</p>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          {mode === "admin_picks"
            ? "Currently showing your manual picks below. Switch to most-collected once enough titles clear the floor."
            : "Currently showing the most-collected titles. Switch back to manual picks any time."}
        </p>
        <div className="flex gap-2">
          <form action={setHeroModeFromForm}>
            <input type="hidden" name="mode" value="admin_picks" />
            <button
              type="submit"
              disabled={mode === "admin_picks"}
              className="rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs uppercase tracking-wide text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)] disabled:cursor-default disabled:opacity-40"
            >
              Use my picks
            </button>
          </form>
          <form action={setHeroModeFromForm}>
            <input type="hidden" name="mode" value="most_collected" />
            <button
              type="submit"
              disabled={mode === "most_collected"}
              className="rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs uppercase tracking-wide text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)] disabled:cursor-default disabled:opacity-40"
            >
              Use most-collected
            </button>
          </form>
        </div>
      </section>

      <section className="mb-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Manual picks (1–5)
        </p>
        <div className="flex flex-col gap-2">
          {RANKS.map((rank) => {
            const current = rankedByRank.get(rank);
            return (
              <div
                key={rank}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="font-mono text-xs text-[var(--text-muted)]">#{rank}</span>
                {current ? (
                  <>
                    <span className="flex-1 text-sm text-[var(--text)]">
                      {current.name}
                      {!current.isPublished && (
                        <span className="ml-2 font-mono text-[10px] uppercase text-[var(--accent-rose)]">
                          unpublished — won&apos;t show
                        </span>
                      )}
                    </span>
                    <form action={clearHeroRankFromForm}>
                      <input type="hidden" name="titleId" value={current.id} />
                      <button
                        type="submit"
                        className="font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--accent-rose)]"
                      >
                        Remove
                      </button>
                    </form>
                  </>
                ) : (
                  <form action={setHeroRankFromForm} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="rank" value={rank} />
                    <select
                      name="titleId"
                      required
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)]"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Pick a title…
                      </option>
                      {pickable.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-[var(--accent-marigold)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-[var(--bg)] transition-opacity hover:opacity-90"
                    >
                      Set
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Most-collected preview
        </p>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          A title needs at least {MIN_COLLECTS_FOR_HERO} curators to have collected it before it qualifies here.
        </p>
        {mostCollectedPreview.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Nothing clears the floor yet — the most-collected hero would currently fall back to newest titles.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {mostCollectedPreview.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]"
              >
                <span>{t.name}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {t.collectCount} collector{t.collectCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
