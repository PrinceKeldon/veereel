-- Reverts 20260813120000_add_email_verification_token. Email
-- confirmation was tried and then deliberately dropped in favor of
-- just quietly storing whatever email a curator provides at /reclaim
-- - no token, no send, no external provider. Written as a new
-- forward migration (not an edit to the original) so this is correct
-- regardless of whether 20260813120000 was ever actually applied to
-- the live database - Prisma just runs whatever's pending, in order.

-- DropIndex
DROP INDEX "users_email_verification_token_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verification_token";
ALTER TABLE "users" DROP COLUMN "email_verification_token_expires_at";
