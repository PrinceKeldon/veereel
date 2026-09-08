-- Fixes the pitch-platform feature added in 20260810_add_pitch_platform,
-- which is left untouched (not renamed/deleted) since its actual
-- applied-vs-not state on the live database can't be verified from
-- here, and modifying an already-applied migration file causes a
-- checksum-mismatch error on the next `prisma migrate deploy` — the
-- same class of problem already hit once this session with a
-- differently-named migration. This migration alters forward from
-- whatever that one left behind, using IF EXISTS everywhere so it
-- works whether or not the original ever actually ran.
--
-- This assumes no real user data exists yet in writers/writer_auth/
-- producer_auth/pitches/pitch_bookmarks/messages: the feature's auth
-- was fundamentally broken (SHA256 + a single static/fallback-default
-- salt shared across every user — not real password hashing) and was
-- never reachable from the live site (no working entry point existed
-- on the landing page). Any credential that WAS created under that
-- scheme should be treated as already compromised, not carried
-- forward — the correct security response is to drop and let anyone
-- who signed up re-register under the real hashing in lib/auth.ts,
-- not to migrate the old hashes forward as if they were ever safe.

-- Drop the separate auth silos entirely — Writer now authenticates
-- via User (see lib/auth.ts's hashPassword/verifyPassword, reused by
-- Curator and Platform already), and the pitch-browsing "Producer"
-- concept is now just Platform, which already has its own User-backed
-- auth.
DROP TABLE IF EXISTS "writer_auth" CASCADE;
DROP TABLE IF EXISTS "producer_auth" CASCADE;

-- These three depend on the old writers/producers shape and are
-- recreated below rather than altered column-by-column, per the "no
-- real data yet" reasoning above.
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "pitch_bookmarks" CASCADE;
DROP TABLE IF EXISTS "pitches" CASCADE;
DROP TABLE IF EXISTS "writers" CASCADE;

-- Producer goes back to its original shape (see schema.prisma's
-- comment on that model) — drop the pitch-platform columns that were
-- added onto it; they move to platforms below instead.
ALTER TABLE "producers" DROP COLUMN IF EXISTS "genres_acquiring";
ALTER TABLE "producers" DROP COLUMN IF EXISTS "how_to_pitch";
ALTER TABLE "producers" DROP COLUMN IF EXISTS "currently_looking";
ALTER TABLE "producers" DROP COLUMN IF EXISTS "logo";
ALTER TABLE "producers" DROP COLUMN IF EXISTS "contact_person";
-- The original merge also renamed producers.name -> company_name and
-- contact_email -> email (unique) — restore the original column
-- names/shape if that rename actually happened; no-ops if it didn't
-- (i.e. the original migration was never applied).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'producers' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE "producers" RENAME COLUMN "company_name" TO "name";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'producers' AND column_name = 'email'
  ) THEN
    ALTER TABLE "producers" RENAME COLUMN "email" TO "contact_email";
    -- The merged shape had this column NOT NULL + unique (it was the
    -- producer's login email); the original shape is nullable, not
    -- unique (it's just an optional contact address on a credit row).
    ALTER TABLE "producers" ALTER COLUMN "contact_email" DROP NOT NULL;
    DROP INDEX IF EXISTS "producers_email_key";
  END IF;
END $$;

-- Platform gains the pitch-platform fields instead.
ALTER TABLE "platforms" ADD COLUMN IF NOT EXISTS "genres_acquiring" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "platforms" ADD COLUMN IF NOT EXISTS "how_to_pitch" TEXT;
ALTER TABLE "platforms" ADD COLUMN IF NOT EXISTS "currently_looking" TEXT;

-- Writer, recreated as a User-backed identity (see schema.prisma).
CREATE TABLE "writers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "portfolio_url" TEXT,
    "social" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "writers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "writers_user_id_key" ON "writers"("user_id");
CREATE UNIQUE INDEX "writers_display_name_key" ON "writers"("display_name");
ALTER TABLE "writers" ADD CONSTRAINT "writers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pitches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "writer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "trope_tags" TEXT[] NOT NULL DEFAULT '{}',
    "mood_tags" TEXT[] NOT NULL DEFAULT '{}',
    "episode_count_est" INTEGER,
    "target_platforms" TEXT[] NOT NULL DEFAULT '{}',
    "pitch_video_url" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "related_kilig_tags" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pitches_writer_id_idx" ON "pitches"("writer_id");
CREATE INDEX "pitches_status_idx" ON "pitches"("status");
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pitch_bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pitch_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "bookmarked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "pitch_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pitch_bookmarks_pitch_id_platform_id_key" ON "pitch_bookmarks"("pitch_id", "platform_id");
CREATE INDEX "pitch_bookmarks_platform_id_idx" ON "pitch_bookmarks"("platform_id");
ALTER TABLE "pitch_bookmarks" ADD CONSTRAINT "pitch_bookmarks_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pitch_bookmarks" ADD CONSTRAINT "pitch_bookmarks_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_writer_id" UUID,
    "from_platform_id" UUID,
    "to_writer_id" UUID,
    "to_platform_id" UUID,
    "pitch_id" UUID,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_to_writer_id_idx" ON "messages"("to_writer_id");
CREATE INDEX "messages_to_platform_id_idx" ON "messages"("to_platform_id");
CREATE INDEX "messages_from_writer_id_idx" ON "messages"("from_writer_id");
CREATE INDEX "messages_from_platform_id_idx" ON "messages"("from_platform_id");
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_writer_id_fkey" FOREIGN KEY ("from_writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_platform_id_fkey" FOREIGN KEY ("from_platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_to_writer_id_fkey" FOREIGN KEY ("to_writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_to_platform_id_fkey" FOREIGN KEY ("to_platform_id") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
