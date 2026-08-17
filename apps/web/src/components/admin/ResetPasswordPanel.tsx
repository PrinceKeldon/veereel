"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCcw } from "lucide-react";
import { generateUserResetToken } from "@/lib/reset-actions";

interface UserRow {
  id: string;
  email: string;
  label: string;
}

export function ResetPasswordPanel({ users }: { users: UserRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [generated, setGenerated] = useState<{ label: string; resetUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate(user: UserRow) {
    startTransition(async () => {
      setError(null);
      setGenerated(null);
      // Direct server-action call — returns the one-time link to relay.
      const result = await generateUserResetToken(user.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setGenerated({ label: result.identityLabel, resetUrl: result.resetUrl });
    });
  }

  return (
    <section className="mt-10">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        Reset a password
      </p>
      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Generate a one-time link for a curator or platform. Copy it and send it to them directly —
        no email is sent by Kilig.
      </p>

      {users.length === 0 ? (
        <p className="text-[var(--text-muted)]">No user accounts yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-[var(--text)]">{u.label}</p>
                <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">{u.email}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => generate(u)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)] disabled:opacity-50"
              >
                {isPending ? <RefreshCcw size={13} className="animate-spin" aria-hidden="true" /> : <KeyRound size={13} aria-hidden="true" />}
                Reset
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-[var(--accent-rose)]">{error}</p>}

      {generated && (
        <div className="mt-4 rounded-lg border border-[var(--accent-marigold)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--text)]">
            Reset link for {generated.label} — expires in 1 hour, one-time use.
          </p>
          <p className="mb-3 break-all rounded-md bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)]">
            {generated.resetUrl}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Send this link to the user. Once they set a new password it can&apos;t be used again.
          </p>
        </div>
      )}
    </section>
  );
}
