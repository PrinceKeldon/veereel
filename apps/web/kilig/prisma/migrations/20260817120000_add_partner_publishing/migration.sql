-- Partner Publishing — see PARTNER_PUBLISHING_PLAN.md. Three additive
-- changes: Title.submittedByPlatformId (mirrors submitted_by_curator_id —
-- SetNull so deleting a Platform never deletes its titles, just clears
-- attribution), Title.trailerUrl (simple external string, future-proof),
-- and the PlatformAnnouncement model (a platform's own voice, contained
-- to /platform/[slug]). Pure additive: new tables, new nullable columns,
-- safe to run against the live database with zero downtime.

-- AddColumn: platform attribution for partner-published titles
ALTER TABLE "titles" ADD COLUMN "submitted_by_platform_id" UUID;

-- AddColumn: external trailer URL (nullable — no trailer means no button)
ALTER TABLE "titles" ADD COLUMN "trailer_url" TEXT;

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform_id" UUID NOT NULL,
    "title_id" UUID,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "titles_submitted_by_platform_id_idx" ON "titles" ("submitted_by_platform_id");

-- CreateIndex
CREATE INDEX "platform_announcements_platform_id_idx" ON "platform_announcements" ("platform_id");

-- AddForeignKey
ALTER TABLE "titles" ADD CONSTRAINT "titles_submitted_by_platform_id_fkey"
  FOREIGN KEY ("submitted_by_platform_id") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_announcements" ADD CONSTRAINT "platform_announcements_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_announcements" ADD CONSTRAINT "platform_announcements_title_id_fkey"
  FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;