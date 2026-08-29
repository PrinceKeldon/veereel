"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPlatformAccount, type CreatePlatformAccountState } from "@/lib/platform-admin-actions";

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-marigold)] focus:outline-none";
const labelClass = "mb-1.5 block font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]";

const initialState: CreatePlatformAccountState = {};

/**
 * Admin-only form for provisioning a partner Platform account (see
 * createPlatformAccount() in platform-admin-actions.ts for the
 * reasoning). On success shows the one-time temp password for the
 * admin to relay to the partner out-of-band — never emailed.
 */
export function CreatePlatformAccountForm() {
  const [state, formAction, isPending] = useActionState(createPlatformAccount, initialState);

  return (
    <div>
      {state.tempPassword ? (
        <div className="rounded-2xl border border-[var(--accent-marigold)]/60 bg-[var(--surface)] p-5">
          <p className="mb-1.5 font-mono text-xs uppercase tracking-wide text-[var(--accent-marigold)]">
            Account created
          </p>
          <p className="mb-4 text-sm text-[var(--text)]">
            <span className="font-semibold">{state.platformName}</span> can now sign in at
            <a className="mx-1 text-[var(--accent-marigold)] underline" href="/kilig/signin">
              /signin
            </a>
            with the email on this account. Share a one-time temp password below with them directly — it will
            never be shown again.
          </p>
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 font-mono text-sm text-[var(--text)]">
            {state.tempPassword}
          </div>
          {state.slug && (
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              Their public page will be at <span className="font-mono">/platform/{state.slug}</span>. The slug can
              be upserted later via the same flow rename if ever needed.
            </p>
          )}
          <Link
            href="/admin"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent-marigold)]"
          >
            Back to admin
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className={labelClass} htmlFor="name">Platform name *</label>
            <input id="name" name="name" required autoFocus className={inputClass} placeholder="ReelShort" />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Shown next to their catalogue and set as Availability.platform on their submissions.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="slug">Slug *</label>
            <input
              id="slug"
              name="slug"
              required
              className={inputClass}
              placeholder="reelshort"
              pattern="[a-z0-9-]+"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Lowercase letters, numbers, and dashes — the /platform/&lt;slug&gt; URL.
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="contactEmail">Login email *</label>
            <input id="contactEmail" name="contactEmail" type="email" required className={inputClass} />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Their sign-in email and the contact on file. Not displayed publicly.
            </p>
          </div>

          {state.error && <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-xl bg-[var(--accent-marigold)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create platform account"}
          </button>
        </form>
      )}
    </div>
  );
}