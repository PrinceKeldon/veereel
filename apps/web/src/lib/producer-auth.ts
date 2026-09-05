"use server";

import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const PRODUCER_COOKIE = "producer_session";
const PRODUCER_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

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

export async function registerProducer(
  companyName: string,
  email: string,
  password: string,
  data?: {
    contactPerson?: string;
    website?: string;
    genresAcquiring?: string[];
    howToPitch?: string;
    currentlyLooking?: string;
  }
): Promise<{ success: boolean; error?: string; producerId?: string }> {
  try {
    if (!companyName || companyName.length < 2 || companyName.length > 100) {
      return { success: false, error: "Company name must be 2-100 characters" };
    }

    if (!email || !email.includes("@")) {
      return { success: false, error: "Valid email required" };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const existing = await prisma.producer.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "Email already registered" };
    }

    const producer = await prisma.producer.create({
      data: {
        companyName,
        email,
        contactPerson: data?.contactPerson || null,
        website: data?.website || null,
        genresAcquiring: data?.genresAcquiring || [],
        howToPitch: data?.howToPitch || null,
        currentlyLooking: data?.currentlyLooking || null,
      },
    });

    await prisma.producerAuth.create({
      data: {
        producerId: producer.id,
        email,
        passwordHash: hashPassword(password),
      },
    });

    return { success: true, producerId: producer.id };
  } catch (err) {
    console.error("Register producer error:", err);
    return { success: false, error: "Registration failed" };
  }
}

export async function loginProducer(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const producer = await prisma.producer.findUnique({
      where: { email },
    });

    if (!producer) {
      return { success: false, error: "Email or password incorrect" };
    }

    const auth = await prisma.producerAuth.findUnique({
      where: { producerId: producer.id },
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

    await prisma.producerAuth.update({
      where: { producerId: producer.id },
      data: {
        sessionToken: tokenHash,
        sessionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(PRODUCER_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: PRODUCER_COOKIE_MAX_AGE,
      path: "/",
    });

    return { success: true };
  } catch (err) {
    console.error("Login producer error:", err);
    return { success: false, error: "Login failed" };
  }
}

export async function getProducerSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PRODUCER_COOKIE)?.value;

    if (!token) return null;

    const tokenHash = hashToken(token);

    const auth = await prisma.producerAuth.findFirst({
      where: {
        sessionToken: tokenHash,
        sessionExpiresAt: { gt: new Date() },
      },
      select: { producerId: true },
    });

    return auth?.producerId || null;
  } catch (err) {
    console.error("Get producer session error:", err);
    return null;
  }
}

export async function logoutProducer(): Promise<void> {
  try {
    const producerId = await getProducerSession();
    if (producerId) {
      await prisma.producerAuth.update({
        where: { producerId },
        data: { sessionToken: null },
      });
    }

    const cookieStore = await cookies();
    cookieStore.delete(PRODUCER_COOKIE);
  } catch (err) {
    console.error("Logout producer error:", err);
  }
}

export async function requireProducerSession(): Promise<string> {
  const producerId = await getProducerSession();
  if (!producerId) {
    throw new Error("Unauthorized: Producer session required");
  }
  return producerId;
}

export async function getProducerProfile(producerId: string) {
  return prisma.producer.findUnique({
    where: { id: producerId },
    select: {
      id: true,
      companyName: true,
      email: true,
      contactPerson: true,
      logo: true,
      website: true,
      genresAcquiring: true,
      howToPitch: true,
      currentlyLooking: true,
      createdAt: true,
    },
  });
}

export async function updateProducerProfile(
  producerId: string,
  data: {
    companyName?: string;
    contactPerson?: string;
    website?: string;
    genresAcquiring?: string[];
    howToPitch?: string;
    currentlyLooking?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.producer.update({
      where: { id: producerId },
      data,
    });

    return { success: true };
  } catch (err) {
    console.error("Update producer profile error:", err);
    return { success: false, error: "Failed to update profile" };
  }
}
