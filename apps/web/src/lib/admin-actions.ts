"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  ensureAdminSeeded,
  isAdminSession,
  issueAdminSession,
  clearAdminSession,
  setAdminCookie,
} from "@/lib/admin";

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface LoginFormState {
  error?: string;
}

/**
 * Signs in to the admin surface. The password is checked against the
 * DB-backed Admin row (seeded from ADMIN_PASSWORD on first login — see
 * ensureAdminSeeded()); on success the row's session token is rotated
 * and the fresh token goes in the httpOnly cookie. Everything about
 * the old env-var-only flow that was worth keeping — single shared
 * password gate, no accounts sprawl, deliberate 750ms delay on failure
 * to blunt brute-force — is unchanged.
 */
export async function loginAdminAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  await ensureAdminSeeded();
  const supplied = String(formData.get("password") ?? "");

  const admin = await prisma.admin.findFirst({ select: { passwordHash: true } });
  if (!admin || !supplied || !verifyPassword(supplied, admin.passwordHash)) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "Wrong password." };
  }

  const token = await issueAdminSession();
  await setAdminCookie(token);
  redirect("/kilig/admin");
}

export interface ChangeAdminPasswordState {
  error?: string;
  ok?: boolean;
}

/**
 * In-app "change my password" for the admin. Requires the current
 * password (so a stray tab or a hijacked-but-unused session can't
 * silently repoint the account), then re-hashes, rotates the session
 * token, and sets the fresh cookie. Same pattern as the platform/curator
 * password-update flows — nothing here ever stores a plaintext password.
 */
export async function changeAdminPasswordAction(
  _prevState: ChangeAdminPasswordState,
  formData: FormData
): Promise<ChangeAdminPasswordState> {
  if (!(await isAdminSession())) {
    return { error: "Your admin session expired — log in again." };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!current) return { error: "Enter your current password." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const admin = await prisma.admin.findFirst({ select: { id: true, passwordHash: true } });
  if (!admin || !verifyPassword(current, admin.passwordHash)) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "Current password is incorrect." };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: hashPassword(next) },
  });

  // Rotate the session so any other cookie for the old password dies now.
  const token = await issueAdminSession();
  await setAdminCookie(token);
  return { ok: true };
}

export interface RecoveryState {
  error?: string;
  ok?: boolean;
}

/**
 * The escape hatch for a lost admin password. ADMIN_RECOVERY_KEY (an
 * env var, never stored in the DB) proves you're the operator; matching
 * it lets you set a fresh password even when the old one is gone.
 * Also clears the old cookie so any lingering session dies immediately.
 */
export async function recoverAdminAction(
  _prevState: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const recoveryKey = process.env.ADMIN_RECOVERY_KEY;
  if (!recoveryKey) {
    return { error: "No recovery key is configured on the server." };
  }

  const supplied = String(formData.get("recoveryKey") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!timingSafeStringEqual(supplied, recoveryKey)) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { error: "Recovery key is incorrect." };
  }
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  await ensureAdminSeeded();
  const admin = await prisma.admin.findFirst({ select: { id: true } });
  if (!admin) return { error: "No admin account exists yet." };

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: hashPassword(next) },
  });

  const token = await issueAdminSession();
  await setAdminCookie(token);
  return { ok: true };
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect("/kilig/admin/login");
}
