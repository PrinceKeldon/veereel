-- Purely additive: one new table. Nothing existing changes behavior.
-- Safe to run against the live database with zero downtime.

-- CreateTable
CREATE TABLE "content_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "post_url" TEXT NOT NULL,
    "posted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_posts_title_id_idx" ON "content_posts"("title_id");

-- CreateIndex
CREATE INDEX "content_posts_posted_at_idx" ON "content_posts"("posted_at");

-- AddForeignKey
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
