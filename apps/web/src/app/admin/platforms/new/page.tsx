import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CreatePlatformAccountForm } from "@/components/admin/CreatePlatformAccountForm";

export const metadata = { title: "New platform account" };

export default async function NewPlatformPage() {
  if (!(await isAdminSession())) redirect("/admin/login");

  // Show existing platforms so the admin can see at a glance what's
  // already provisioned (and avoid duplicate slugs/names).
  const platforms = await prisma.platform.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isVerified: true,
      _count: { select: { submittedTitles: true } },
    },
  });

  return (
    <main className="mx-auto max-w-xl px-6 py-14 pb-20">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-marigold)]"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to admin
      </Link>

      <h1 className="mb-7 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        New platform account
      </h1>

      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Provisions a login for a verified partner (ReelShort, DramaBox, ShortMax…). Platform accounts are
        admin-created on purpose — the community is open, partners are not.
      </p>

      <CreatePlatformAccountForm />

      {platforms.length > 0 && (
        <section className="mt-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Existing platforms ({platforms.length})
          </p>
          <ul className="flex flex-col gap-1.5">
            {platforms.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)]"
              >
                <Link href={`/platform/${p.slug}`} className="hover:text-[var(--accent-marigold)]">
                  {p.name}
                </Link>
                <span className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                  {p.isVerified ? "verified" : "unverified"} · {p._count.submittedTitles} titles
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}