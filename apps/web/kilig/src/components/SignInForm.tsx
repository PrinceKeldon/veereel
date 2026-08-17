"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmail, type SignInState } from "@/lib/curator-actions";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-[var(--text)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoFocus
          autoComplete="email"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-[var(--text)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-[var(--text-muted)]">
        Forgot your password? Ask the Kilig admin to send a reset link.
      </p>
    </form>
  );
}
