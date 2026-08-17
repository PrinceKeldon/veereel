"use server";

import { requireAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Admin-side provisioning for partner (Platform) accounts — the exact
 * opposite of curator onboarding. Curator identity is deliberately open
 * (claimDisplayName(), no gate) because the community IS the product.
 * Platforms are a small, known set of vetted B2B relationships: a
 * self-serve signup would let anyone claim to be "ReelShort." Admin
 * hand-creation is the correct trust boundary, not just a simpler one.
 *
 * Mirrors reclaimCurator()'s nested-create shape (prisma.user.create
 * with a nested curator/platform create) — no Platform row can exist
 * without its owning User, same as a curator's User. The returned
 * `tempPassword` is the password generated server-side for this account
 * right now; the admin relays it to the partner out-of-band. It is NOT
 * emailed — this codebase has no email-sending dependency and shouldn't
 * gain one just for this (the partner signs in with it once and can be
 * asked to keep it / it lives in their own password manager; there is
 * no password-recovery flow built here, so the admin re-creating an
 * account is the recovery path).
 */

// 24 chars of base62 gives ~142 bits of entropy — well past what scrypt
// needs, comfortably past what any human password would be. Never shown
// in the UI at rest; returned once from the action.
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export interface CreatePlatformAccountState {
  error?: string;
  // Set on success — the admin displays this once, then relays it to
  // the partner. Deliberately present in one response only (the state
  // object is per-submission, never persisted).
  tempPassword?: string;
  platformName?: string;
  slug?: string;
}

export async function createPlatformAccount(
  _prevState: CreatePlatformAccountState,
  formData: FormData
): Promise<CreatePlatformAccountState> {
  try {
    await requireAdmin();
  } catch {
    // requireAdmin() throws; a Server Action can't redirect() cleanly
    // from a typical form flow here the way loginAdminAction does, so
    // surface it as an error state instead of crashing the form frame.
    return { error: "Not authorized — go back to /admin and sign in." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const email = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
  // Contact email is the account's login email too — visible to the
  // platform, used by signInWithEmail. Not displayed to the public.

  const SLUG_PATTERN = /^[a-z0-9-]+$/;
  if (!name) return { error: "Give the platform a name." };
  if (!email || !email.includes("@")) return { error: "Enter a valid login email." };
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers, and dashes only." };
  }

  const tempPassword = generateTempPassword();

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(tempPassword),
        // Verified at creation — the admin hand-creating the row IS the
        // verification check; there is no separate step after it.
        platform: {
          create: { name, slug, isVerified: true },
        },
      },
      select: { platform: { select: { id: true, name: true, slug: true } } },
    });

    const platform = user.platform;
    if (!platform) {
      // Can't happen — the nested create just made it. Defensive check
      // so a schema/select drift surfaces as an error, not a crash.
      return { error: "Something went wrong — try again." };
    }

    return {
      tempPassword,
      platformName: platform.name,
      slug: platform.slug,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // email unique, platform name unique, platform slug unique all hit
      // this — collapse into one honest error rather than claiming to
      // know which specific collision it was.
      return { error: "That email, name, or slug is already taken." };
    }
    console.error("Failed to create platform account", err);
    return { error: "Something went wrong — try again." };
  }
}