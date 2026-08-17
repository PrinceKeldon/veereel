import { requireReclaimedCurator } from "@/lib/curator";
import { prisma } from "@/lib/prisma";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { AvatarSettings } from "@/components/AvatarSettings";
import { FeaturedCollectionForm } from "@/components/FeaturedCollectionForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  // A curator without a User yet has nothing to delete in the sense
  // this page means (no email/password exists) — send them through
  // /reclaim first, same as any other identity-gated action.
  const curatorId = await requireReclaimedCurator("/settings");
  const curator = await prisma.curator.findUniqueOrThrow({
    where: { id: curatorId },
    select: {
      displayName: true,
      avatarUrl: true,
      featuredCollectionId: true,
    },
  });

  const collections = await prisma.collection.findMany({
    where: { curatorId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-14">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-8 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        Settings
      </h1>

      <section className="mb-8">
        <p className="mb-2 text-sm text-[var(--text)]">Signed in as {curator.displayName}</p>
      </section>

      <section className="mb-8">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Avatar</p>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Your face on your profile. Square images are cropped to fit.
        </p>
        <AvatarSettings displayName={curator.displayName} avatarUrl={curator.avatarUrl} />
      </section>

      <section className="mb-8">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Featured Collection
        </p>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          The shelf shown at the top of your profile. Auto picks whichever Collection you most recently worked on.
        </p>
        <FeaturedCollectionForm
          collections={collections}
          featuredCollectionId={curator.featuredCollectionId}
        />
      </section>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-[var(--accent-rose)] hover:underline">
          Delete my account
        </summary>
        <div className="mt-3 rounded-xl border border-[var(--accent-rose)]/40 bg-[var(--surface)] p-4">
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Permanently deletes your account, your curator identity ({curator.displayName}), every Collection you
            made, and your follows and likes. Titles you brought into Kilig stay in the catalogue, just no longer
            attributed to you. This can&apos;t be undone.
          </p>
          <DeleteAccountForm displayName={curator.displayName} />
        </div>
      </details>
    </main>
  );
}