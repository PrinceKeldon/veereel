-- CreateTable
CREATE TABLE "trend_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "trend_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trend_posts_url_key" ON "trend_posts"("url");

-- CreateIndex
CREATE INDEX "trend_posts_created_at_idx" ON "trend_posts"("created_at");
