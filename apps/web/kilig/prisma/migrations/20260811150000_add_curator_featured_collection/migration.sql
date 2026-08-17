-- AddColumn: curator's pinned "featured collection" for their profile page
-- (Curator.featuredCollectionId). Nullable: unset means the profile page
-- falls back to the most recently updated Collection. SetNull on delete
-- so removing a Collection just unpins it, never orphans a curator.
ALTER TABLE "curators" ADD COLUMN "featured_collection_id" UUID;

ALTER TABLE "curators"
  ADD CONSTRAINT "curators_featured_collection_id_fkey"
  FOREIGN KEY ("featured_collection_id")
  REFERENCES "collections" ("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "curators_featured_collection_id_key" ON "curators" ("featured_collection_id");