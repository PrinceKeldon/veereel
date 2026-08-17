import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        Sign in
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Picks up your curator identity on this browser.
      </p>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
