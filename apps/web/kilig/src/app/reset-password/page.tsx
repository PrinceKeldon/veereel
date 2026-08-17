import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]">Kilig</p>
      <h1 className="mb-2 font-[var(--font-display)] text-2xl font-semibold uppercase text-[var(--text)]">
        Set a new password
      </h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Use the one-time link your curator or platform admin sent you.
      </p>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}