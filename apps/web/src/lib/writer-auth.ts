"use server";

import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const WRITER_COOKIE = "writer_session";
const WRITER_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || "default-salt-change-this";
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function registerWriter(
  displayName: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; writerId?: string }> {
  try {
    if (!displayName || displayName.length < 2 || displayName.length > 50) {
      return { success: false, error: "Display name must be 2-50 characters" };
    }

    if (!email || !email.includes("@")) {
      return { success: false, error: "Valid email required" };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const existing = await prisma.writer.findFirst({
      where: { OR: [{ displayName }, { email }] },
    });

    if (existing) {
      if (existing.displayName === displayName) {
        return { success: false, error: "Display name already taken" };
      }
      return { success: false, error: "Email already registered" };
    }

    const writer = await prisma.writer.create({
      data: {
        displayName,
        email,
        bio: null,
        portfolioUrl: null,
        social: {},
      },
    });

    await prisma.writerAuth.create({
      data: {
        writerId: writer.id,
        email,
        passwordHash: hashPassword(password),
      },
    });

    return { success: true, writerId: writer.id };
  } catch (err) {
    console.error("Register writer error:", err);
    return { success: false, error: "Registration failed" };
  }
}

export async function loginWriter(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const writer = await prisma.writer.findUnique({
      where: { email },
    });

    if (!writer) {
      return { success: false, error: "Email or password incorrect" };
    }

    const auth = await prisma.writerAuth.findUnique({
      where: { writerId: writer.id },
    });

    if (!auth) {
      return { success: false, error: "Email or password incorrect" };
    }

    const providedHash = hashPassword(password);
    if (!timingSafeStringEqual(providedHash, auth.passwordHash)) {
      return { success: false, error: "Email or password incorrect" };
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);

    await prisma.writerAuth.update({
      where: { writerId: writer.id },
      data: {
        sessionToken: tokenHash,
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(WRITER_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: WRITER_COOKIE_MAX_AGE,
      path: "/",
    });

    return { success: true };
  } catch (err) {
    console.error("Login writer error:", err);
    return { success: false, error: "Login failed" };
  }
}

export async function getWriterSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(WRITER_COOKIE)?.value;

    if (!token) return null;

    const tokenHash = hashToken(token);

    const auth = await prisma.writerAuth.findFirst({
      where: {
        sessionToken: tokenHash,
        sessionExpiresAt: { gt: new Date() },
      },
      select: { writerId: true },
    });

    return auth?.writerId || null;
  } catch (err) {
    console.error("Get writer session error:", err);
    return null;
  }
}

export async function logoutWriter(): Promise<void> {
  try {
    const writerId = await getWriterSession();
    if (writerId) {
      await prisma.writerAuth.update({
        where: { writerId },
        data: { sessionToken: null },
      });
    }

    const cookieStore = await cookies();
    cookieStore.delete(WRITER_COOKIE);
  } catch (err) {
    console.error("Logout writer error:", err);
  }
}

export async function requireWriterSession(): Promise<string> {
  const writerId = await getWriterSession();
  if (!writerId) {
    throw new Error("Unauthorized: Writer session required");
  }
  return writerId;
}

export async function getWriterProfile(writerId: string) {
  return prisma.writer.findUnique({
    where: { id: writerId },
    select: {
      id: true,
      displayName: true,
      email: true,
      bio: true,
      portfolioUrl: true,
      social: true,
      createdAt: true,
    },
  });
}

export async function updateWriterProfile(
  writerId: string,
  data: {
    bio?: string;
    portfolioUrl?: string;
    social?: Record<string, string>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.writer.update({
      where: { id: writerId },
      data,
    });

    return { success: true };
  } catch (err) {
    console.error("Update writer profile error:", err);
    return { success: false, error: "Failed to update profile" };
  }
}
