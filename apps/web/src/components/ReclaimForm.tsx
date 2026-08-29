"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { reclaimCurator, type ReclaimState } from "@/lib/curator-actions";

const initialState: ReclaimState = {};

export function ReclaimForm() {
  const [state, formAction, isPending] = useActionState(reclaimCurator, initialState);
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
          autoComplete="new-password"
          minLength={8}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          8 characters minimum
        </p>
      </div>
      {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
      {state.suggestSignIn ? (
        <a
          href={`/kilig/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
        >
          Sign in instead
        </a>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Securing…" : "Secure this identity"}
        </button>
      )}
      <p className="text-center text-[11px] text-[var(--text-muted)]">
        Your display name and Collections stay exactly as they are — this just adds recovery.
      </p>
    </form>
  );
}
