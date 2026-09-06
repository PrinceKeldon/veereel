import { redirect } from "next/navigation";
import { PitchForm } from "@/components/PitchForm";
import { requireWriterSession } from "@/lib/writer-auth";

export const metadata = {
  title: "Submit Pitch - Veereel",
  description: "Submit your story pitch to Veereel's network of producers.",
};

export default async function PitchSubmitPage() {
  const writerId = await requireWriterSession();

  if (!writerId) {
    redirect("/writer/login");
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <PitchForm writerId={writerId} />
    </main>
  );
}
