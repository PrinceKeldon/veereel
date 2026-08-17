"use client";

import { useActionState } from "react";
import { recoverAdminAction, type RecoveryState } from "@/lib/admin-actions";

const initialState: RecoveryState = {};

export function RecoveryForm() {
  const [state, formAction, isPending] = useActionState(recoverAdminAction, initialState);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-[var(--accent-marigold)]">Recovered — password updated.</p>
        <a href="/kilig/admin" className="underline underline-offset-4 text-[var(--text)]">
          Go to admin
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label htmlFor="recoveryKey" className="mb-1.5 block text-sm text-[var(--text)]">
          Recovery key
        </label>
        <input
          id="recoveryKey"
          name="recoveryKey"
          type="password"
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm text-[var(--text)]">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-[var(--text)]">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Recovering…" : "Recover"}
      </button>
    </form>
  );
}