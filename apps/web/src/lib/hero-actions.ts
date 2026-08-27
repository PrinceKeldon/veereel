"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { HeroMode } from "@/lib/hero";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Assigns a title to a hero slot (1-5). heroRank is @unique on Title
 * (see schema.prisma), so whichever title currently holds that rank
 * is bumped back to unranked first — the previous holder simply drops
 * out of the hero rather than this write failing on a constraint
 * violation. Both updates run in one transaction so the hero never
 * has two titles claiming the same slot, even momentarily.
 */
export async function setHeroRankFromForm(formData: FormData): Promise<void> {
  await requireAdmin();

  const titleId = str(formData, "titleId");
  const rank = Number(str(formData, "rank"));
  if (!titleId || !Number.isInteger(rank) || rank < 1 || rank > 5) {
    throw new Error("A title and a rank between 1 and 5 are required.");
  }

  await prisma.$transaction([
    prisma.title.updateMany({ where: { heroRank: rank }, data: { heroRank: null } }),
    prisma.title.update({ where: { id: titleId }, data: { heroRank: rank } }),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function clearHeroRankFromForm(formData: FormData): Promise<void> {
  await requireAdmin();

  const titleId = str(formData, "titleId");
  if (!titleId) throw new Error("A title is required.");

  await prisma.title.update({ where: { id: titleId }, data: { heroRank: null } });

  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function setHeroModeFromForm(formData: FormData): Promise<void> {
  await requireAdmin();

  const mode = str(formData, "mode") as HeroMode;
  if (mode !== "admin_picks" && mode !== "most_collected") {
    throw new Error("Invalid hero mode.");
  }

  await prisma.appSetting.upsert({
    where: { key: "hero_mode" },
    create: { key: "hero_mode", value: mode },
    update: { value: mode },
  });

  revalidatePath("/");
  redirect("/admin/hero");
}
