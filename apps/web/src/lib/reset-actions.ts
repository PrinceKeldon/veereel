"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

/**
 * Password reset for User accounts (curators AND platforms — they're
 * the same User row, so one flow covers both). Admin-mediated by
 * design: there's no transactional-email provider in this stack
 * (curator.ts), so an admin generates a one-time link from the
 * dashboard and relays it to the user out-of-band. Only the sha256 of
 * the raw token is ever stored, so a DB leak can't be turned into
 * working reset links.
 */

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface ResetTokenResult {
  userId: string;
  email: string;
  identityLabel: string;
  /** The one-time link to relay to the user. */
  resetUrl: string;
}

/**
 * Admin-gated: mint a single-use reset link for the given User. Returns
 * the full URL so the admin can copy/relay it; only the token's hash
 * is persisted. Invalidates any prior outstanding token for that user
 * (single outstanding reset at a time — no token pile-up).
 */
export async function generateUserResetToken(userId: string): Promise<ResetTokenResult | { error: string }> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      curator: { select: { displayName: true } },
      platform: { select: { name: true } },
    },
  });
  if (!user) return { error: "That user no longer exists." };

  // One outstanding reset per user — expire any older one first so the
  // newest link is the only live grant.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000";
  return {
    userId,
    email: user.email,
    identityLabel: user.platform?.name ?? user.curator?.displayName ?? user.email,
    resetUrl: `${origin}/reset-password?token=${rawToken}`,
  };
}

export interface ResetPasswordState {
  error?: string;
  ok?: boolean;
}

/**
 * Consumes a reset token and sets a new password. The token is checked
 * fresh on every call (exists, unexpired, unused) — never trust a
 * client-side "already validated" flag. Marking it used is deliberately
 * part of the same transaction as the password write, so a replay of
 * the same link is a no-op rather than a second override.
 */
export async function resetPasswordWithToken(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!token) return { error: "This reset link is missing its token." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row) return { error: "This reset link is invalid." };
  if (row.usedAt) return { error: "This reset link has already been used — request a new one." };
  if (row.expiresAt < new Date()) return { error: "This reset link has expired — request a new one." };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: hashPassword(next) },
      }),
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);
  } catch {
    return { error: "Something went wrong — try again." };
  }

  redirect("/kilig/signin");
}

/** Whether a raw reset token is currently live — for the reset page to pre-validate before showing the form. */
export async function isResetTokenLive(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { usedAt: true, expiresAt: true },
  });
  return row !== null && !row.usedAt && row.expiresAt >= new Date();
}
