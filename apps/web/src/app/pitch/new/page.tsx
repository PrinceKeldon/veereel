import { prisma } from "@/lib/prisma";
import { PitchForm } from "@/components/PitchForm";
import { requireWriter } from "@/lib/writer";

export const dynamic = "force-dynamic";

export default async function PitchSubmitPage() {
  // requireWriter() redirects to /writer/login itself when there's no
  // session — nothing else for this page to check.
  await requireWriter("/pitch/new");

  const verticalDramaPlatforms = await prisma.platform.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <PitchForm verticalDramaPlatforms={verticalDramaPlatforms} />
    </main>
  );
}
