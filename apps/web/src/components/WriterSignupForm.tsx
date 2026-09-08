"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerWriter, type RegisterWriterState } from "@/lib/writer-actions";

const initialState: RegisterWriterState = {};

export function WriterSignupForm() {
  const [state, formAction, isPending] = useActionState(registerWriter, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)]">
          Join Veereel
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">Create your writer profile and start pitching</p>
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">
            Display Name
          </label>
          <input
            type="text"
            name="displayName"
            placeholder="Jane D."
            maxLength={50}
            autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
            required
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Your public writer name</p>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">Password</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
            required
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">At least 8 characters</p>
        </div>

        {state.error && (
          <div className="rounded-lg border border-[var(--accent-rose)] bg-[var(--accent-rose)]/10 p-3">
            <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[var(--accent-marigold)] py-3 font-semibold text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/writer/login" className="text-[var(--accent-marigold)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
