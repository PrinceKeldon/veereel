-- AddColumn: collection description to add "emotional hook"
-- "The ones where the countryside is peaceful but the relationship absolutely isn't."
-- This is the curator's one-line "feeling" for the entire collection, separate from
-- individual title notes. Optional initially, encouraged but not required.
ALTER TABLE "collections" ADD COLUMN "description" TEXT;
