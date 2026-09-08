import { Suspense } from "react";
import { WriterSignupForm } from "@/components/WriterSignupForm";

export const metadata = { title: "Join Veereel — Writer Signup" };

/**
 * Server Component wrapping the Client Component form in Suspense —
 * same fix and reasoning as /writer/login/page.tsx. The form itself
 * calls useSearchParams(), which requires this boundary for
 * prerendering.
 */
export default function WriterSignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <Suspense fallback={null}>
        <WriterSignupForm />
      </Suspense>
    </div>
  );
}
