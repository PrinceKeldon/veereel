-- Purely additive: one nullable column on titles, one new table.
-- Nothing existing changes behavior. Safe to run against the live
-- database with zero downtime.

-- AlterTable
ALTER TABLE "titles" ADD COLUMN "hero_rank" INTEGER;

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "titles_hero_rank_key" ON "titles"("hero_rank");

-- CreateIndex
CREATE INDEX "titles_hero_rank_idx" ON "titles"("hero_rank");
