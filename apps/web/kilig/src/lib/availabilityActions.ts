"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/**
 * Returns all unique platform names that have been used in Availability
 * records, sorted alphabetically. Used for autocomplete/suggestions in
 * the availability form so admins don't have to retype platform names
 * they've already entered.
 */
export async function getKnownPlatforms(): Promise<string[]> {
  await requireAdmin();

  const availabilities = await prisma.availability.findMany({
    distinct: ["platform"],
    select: { platform: true },
    orderBy: { platform: "asc" },
  });

  return availabilities.map((a) => a.platform).filter(Boolean);
}
