-- Step 3 of the real-accounts flow: email verification. Purely
-- additive, nullable columns - safe against the live database with
-- zero downtime and no existing row touched. Existing verified/
-- unverified state (email_verified_at) is untouched by this
-- migration; it only adds somewhere to put an in-flight token.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verification_token" TEXT;
ALTER TABLE "users" ADD COLUMN "email_verification_token_expires_at" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");
