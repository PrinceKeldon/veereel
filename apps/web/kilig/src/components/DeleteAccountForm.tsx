"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/lib/curator-actions";

const initialState: DeleteAccountState = {};

interface DeleteAccountFormProps {
  displayName: string;
}

export function DeleteAccountForm({ displayName }: DeleteAccountFormProps) {
  const [state, formAction, isPending] = useActionState(deleteAccount, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label htmlFor="confirmDisplayName" className="mb-1.5 block text-sm text-[var(--text)]">
          Type &ldquo;{displayName}&rdquo; to confirm
        </label>
        <input
          id="confirmDisplayName"
          name="confirmDisplayName"
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] focus:border-[var(--accent-rose)] focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--accent-rose)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : `Yes, delete my account permanently`}
      </button>
    </form>
  );
}
