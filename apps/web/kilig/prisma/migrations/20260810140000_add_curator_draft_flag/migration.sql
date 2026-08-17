-- AddColumn
ALTER TABLE "titles" ADD COLUMN "curator_draft" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex (for fast filtering on homepage/search queries)
CREATE INDEX "titles_curator_draft_idx" ON "titles"("curator_draft");
