"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireWriter, setWriterCookie } from "@/lib/writer";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function safeNextPath(next: string, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export interface RegisterWriterState {
  error?: string;
}

/**
 * Self-serve writer signup — unlike Platform (admin-provisioned only,
 * see createPlatformAccount in platform-admin-actions.ts), an
 * individual writer registering themselves carries no impersonation
 * risk the way self-serve-claiming a company name would, so open
 * signup is the right call here, not a gap.
 *
 * Creates User + Writer together in one transaction (same nested-create
 * shape as reclaimCurator()), hashing the password with lib/auth.ts's
 * scrypt implementation — the same one Curator/Platform already use,
 * not a separate reimplementation. The original build's WriterAuth had
 * its own SHA256 + a single static/fallback-default salt shared by
 * every user; that whole file is gone.
 */
export async function registerWriter(
  _prevState: RegisterWriterState,
  formData: FormData
): Promise<RegisterWriterState> {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const displayName = str(formData, "displayName");
  const next = safeNextPath(str(formData, "next"), "/pitch/new");

  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!displayName) return { error: "Enter a display name." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "An account already exists for that email — sign in instead." };

  const existingName = await prisma.writer.findUnique({ where: { displayName } });
  if (existingName) return { error: "That display name is already taken." };

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      writer: { create: { displayName } },
    },
    select: { writer: { select: { id: true } } },
  });

  // user.writer is guaranteed non-null immediately after the nested
  // create above.
  await setWriterCookie(user.writer!.id);
  redirect(next);
}

export interface UpdateWriterProfileState {
  error?: string;
}

/**
 * The original build's updateWriterProfile(writerId, data) took the
 * writer's id as a bare parameter with no check that the caller
 * actually owns it — anyone could update any writer's bio/portfolio/
 * social links just by naming their id. requireWriter() is the only
 * source of truth for identity here; there is no writerId parameter
 * to forge.
 */
export async function updateWriterProfile(
  _prevState: UpdateWriterProfileState,
  formData: FormData
): Promise<UpdateWriterProfileState> {
  const writer = await requireWriter("/writer/settings");

  const bio = str(formData, "bio");
  const portfolioUrl = str(formData, "portfolioUrl");

  await prisma.writer.update({
    where: { id: writer.id },
    data: {
      bio: bio || null,
      portfolioUrl: portfolioUrl || null,
    },
  });

  redirect(`/writer/${writer.displayName}`);
}
