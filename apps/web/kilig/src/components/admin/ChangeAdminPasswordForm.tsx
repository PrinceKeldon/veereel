"use client";

import { useActionState } from "react";
import { changeAdminPasswordAction, type ChangeAdminPasswordState } from "@/lib/admin-actions";

const initialState: ChangeAdminPasswordState = {};

export function ChangeAdminPasswordForm() {
  const [state, formAction, isPending] = useActionState(changeAdminPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.ok && <p className="text-sm text-[var(--accent-marigold)]">Password updated.</p>}
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm text-[var(--text)]">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
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
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
