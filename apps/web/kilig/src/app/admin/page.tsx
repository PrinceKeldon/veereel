import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Radar, Sparkles, Building2 } from "lucide-react";
import { isAdminSession } from "@/lib/admin";
import { logoutAdminAction } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";
import { ResetPasswordPanel } from "@/components/admin/ResetPasswordPanel";
import { ChangeAdminPasswordForm } from "@/components/admin/ChangeAdminPasswordForm";

export default async function AdminPage() {
  if (!(await isAdminSession())) redirect("/admin/login");

  const titles = await prisma.title.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      isPublished: true,
      curatorDraft: true,
      language: true,
      submittedByCurator: { select: { displayName: true } },
      submittedByPlatform: { select: { name: true } },
    },
  });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      curator: { select: { displayName: true } },
      platform: { select: { name: true } },
    },
  });
  const userRows = users.map((u) => ({
    id: u.id,
    email: u.email,
    label: u.platform?.name ?? u.curator?.displayName ?? u.email,
  }));

  return (
    <main className="mx-auto max-w-lg px-6 py-14 pb-20">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
            Admin
          </h1>
        </div>
        <form action={logoutAdminAction}>
          <button
            type="submit"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs uppercase tracking-wide text-[var(--text)] transition-colors hover:border-[var(--accent-rose)]"
          >
            Log out
          </button>
        </form>
      </div>

      <div className="mb-7 flex flex-wrap gap-3">
        <Link
          href="/admin/titles/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          <Plus size={16} aria-hidden="true" />
          New title
        </Link>
        <Link
          href="/admin/discovery"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
        >
          <Radar size={16} aria-hidden="true" />
          Discovery
        </Link>
        <Link
          href="/admin/hero"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
        >
          <Sparkles size={16} aria-hidden="true" />
          Hero
        </Link>
        <Link
          href="/admin/platforms/new"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
        >
          <Building2 size={16} aria-hidden="true" />
          New platform
        </Link>
      </div>

      <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        Titles ({titles.length})
      </p>

      {titles.length === 0 ? (
        <p className="text-[var(--text-muted)]">No titles yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {titles.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/titles/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
              >
                <span>{t.name}</span>
                <span className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  {t.language} · {t.isPublished && t.curatorDraft ? "curator draft" : t.isPublished ? "published" : "draft"}
                  {t.submittedByCurator && ` · via ${t.submittedByCurator.displayName}`}
                  {t.submittedByPlatform && ` · via ${t.submittedByPlatform.name}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ResetPasswordPanel users={userRows} />

      <section className="mt-10">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Admin password
        </p>
        <ChangeAdminPasswordForm />
      </section>
    </main>
  );
}
