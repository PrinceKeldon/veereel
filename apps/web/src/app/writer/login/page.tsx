"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmail, type SignInState } from "@/lib/curator-actions";

const initialState: SignInState = {};

/**
 * A distinct /writer/login URL for clear entry-point branding, but the
 * form itself posts to the exact same signInWithEmail() every other
 * identity type uses (curator-actions.ts) — one auth system, not a
 * separate writer-specific login action. The original build had its
 * own loginWriter() calling into WriterAuth's SHA256+static-salt
 * hashing; that's gone along with the file it lived in.
 */
export default function WriterLoginPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-[var(--font-display)] text-3xl font-semibold uppercase text-[var(--text)]">
            Writer Login
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">Sign in to submit and manage your pitches</p>
        </div>

        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}

          <div>
            <label className="mb-2 block font-mono text-xs uppercase text-[var(--text-muted)]">Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              autoFocus
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
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
              required
            />
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
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/writer/signup" className="text-[var(--accent-marigold)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
