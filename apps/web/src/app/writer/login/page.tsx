import { Suspense } from "react";
import { WriterLoginForm } from "@/components/WriterLoginForm";

export const metadata = { title: "Writer Login" };

/**
 * A distinct /writer/login URL for clear entry-point branding — the
 * form itself is WriterLoginForm.tsx, a Client Component wrapped here
 * in Suspense since it calls useSearchParams(). Next.js requires that
 * boundary for prerendering; the original version of this page made
 * the whole page a Client Component with no Suspense wrapper at all,
 * which failed the build ("useSearchParams() should be wrapped in a
 * suspense boundary at page /writer/login"). Same fix, same reasoning
 * as /kilig/signin/page.tsx and /kilig/reclaim/page.tsx already use.
 */
export default function WriterLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <Suspense fallback={null}>
        <WriterLoginForm />
      </Suspense>
    </div>
  );
}
