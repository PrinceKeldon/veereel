"use client";

import { useActionState, useState } from "react";
import { loginAdminAction, type LoginFormState } from "@/lib/admin-actions";
import { RecoveryForm } from "@/components/admin/RecoveryForm";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdminAction, initialState);
  const [showRecovery, setShowRecovery] = useState(false);

  if (showRecovery) {
    return (
      <div className="flex flex-col gap-4">
        <RecoveryForm />
        <button
          type="button"
          onClick={() => setShowRecovery(false)}
          className="self-start font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
        >
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Admin password"
          autoFocus
          autoComplete="current-password"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none"
        />
        {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Log in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowRecovery(true)}
        className="self-start font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text)]"
      >
        Forgot the password? Use recovery key
      </button>
    </div>
  );
}