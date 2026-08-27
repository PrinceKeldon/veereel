-- AddColumn: curator identity fields to make profiles feel personal
ALTER TABLE "curators" ADD COLUMN "bio" TEXT;
ALTER TABLE "curators" ADD COLUMN "taste_statement" TEXT;
ALTER TABLE "curators" ADD COLUMN "avatar_url" TEXT;

-- The taste statement eventually becomes non-nullable (required for
-- identity), but we're adding it optional initially so existing curators
-- aren't forced to fill it out. A follow-up migration can enforce it
-- after an onboarding prompt.
