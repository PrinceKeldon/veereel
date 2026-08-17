import { redirect } from "next/navigation";
import { Suspense } from "react";
import { peekCuratorId, peekCuratorAuthStatus } from "@/lib/curator";
import { prisma } from "@/lib/prisma";
import { ReclaimForm } from "@/components/ReclaimForm";

export const metadata = { title: "Secure your curator identity" };

interface ReclaimPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function ReclaimPage({ searchParams }: ReclaimPageProps) {
  const { next } = await searchParams;

  const curatorId = await peekCuratorId();
  // Nothing claimed in this browser at all — /reclaim only ever makes
  // sense for a browser that already has a Curator, so send it
  // through /claim first (same next round-trip).
  if (!curatorId) redirect(`/claim${next ? `?next=${encodeURIComponent(next)}` : ""}`);

  const status = await peekCuratorAuthStatus();
  const curator = await prisma.curator.findUnique({ where: { id: curatorId }, select: { displayName: true } });
  // Already has a User (e.g. re-visited a stale link) — nothing to do here.
  if (status?.hasUser) {
    redirect(next && next.startsWith("/") ? next : `/kilig/curator/${curator?.displayName ?? ""}`);
  }
  const displayName = curator?.displayName ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        Secure your identity
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Add an email to finish setting up {displayName} so you never lose this curator name, and can sign in from
        another device.
      </p>
      <Suspense fallback={null}>
        <ReclaimForm />
      </Suspense>
    </main>
  );
}
