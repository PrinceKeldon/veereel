-- Admin + password reset. Two changes:
--
-- 1. Admin becomes DB-backed. Previously the admin gate was purely
--    env-var driven (ADMIN_PASSWORD compared directly); now the password
--    lives as an scrypt hash in a new `admins` table, seeded from
--    ADMIN_PASSWORD on first login (lib/admin.ts). A separate
--    ADMIN_RECOVERY_KEY env var can re-secure the account if the admin
--    password is ever lost (see lib/admin-actions.ts).
--
-- 2. PasswordResetToken: a single-use, expiring grant for a User to set
--    a new password. Created by an admin from the dashboard (no email
--    provider exists, so the link is relayed out-of-band) and consumed
--    at /reset-password. Only the sha256 of the raw token is stored.
--
-- Purely additive: new tables only, no existing row touched — safe
-- against the live database with zero downtime.

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins" ("username");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens" ("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
