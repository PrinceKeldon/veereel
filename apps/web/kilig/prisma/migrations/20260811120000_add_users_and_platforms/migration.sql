-- Step 1 of the real-accounts migration (see ARCHITECTURE.md "Collections"
-- section for why Curator has been claimed-name-only until now). This
-- migration is purely additive — new tables, nullable new columns — so it
-- is safe to run against the live database with zero downtime and no
-- existing row is touched. Existing Curator rows keep working exactly as
-- they do today; user_id stays NULL for all of them until each curator
-- completes forced re-claim (a follow-up app-level flow, not part of this
-- migration). A later migration (not included here — see the note at the
-- bottom) makes curators.user_id NOT NULL once re-claim coverage is
-- confirmed; do not run that one until then.

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "official_site_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- Nullable through the re-claim migration window — see note above.
ALTER TABLE "curators" ADD COLUMN "user_id" UUID;

-- AlterTable
-- Nullable always: a Collection belongs to a curator OR a platform, never
-- both, never neither — enforced in application code (see the comment on
-- the Collection model in schema.prisma), not a DB constraint.
ALTER TABLE "collections" ADD COLUMN "platform_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_user_id_key" ON "platforms"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_key" ON "platforms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "curators_user_id_key" ON "curators"("user_id");

-- CreateIndex
CREATE INDEX "collections_platform_id_idx" ON "collections"("platform_id");

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curators" ADD CONSTRAINT "curators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOT included in this migration, deliberately: ALTER TABLE "curators"
-- ALTER COLUMN "user_id" SET NOT NULL. That's a real gate — it will hard-fail
-- any Curator row that hasn't completed forced re-claim yet. Ship it as its
-- own migration once the re-claim flow has been live long enough to confirm
-- coverage, not bundled with this additive step.
