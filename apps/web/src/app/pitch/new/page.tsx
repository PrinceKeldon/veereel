import { PitchForm } from "@/components/PitchForm";
import { requireWriter } from "@/lib/writer";

export const dynamic = "force-dynamic";

export default async function PitchSubmitPage() {
  // requireWriter() redirects to /writer/login itself when there's no
  // session — nothing else for this page to check.
  await requireWriter("/pitch/new");

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <PitchForm />
    </main>
  );
}
