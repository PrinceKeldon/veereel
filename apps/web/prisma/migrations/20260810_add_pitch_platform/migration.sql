-- CreateTable "writers"
CREATE TABLE "writers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "portfolio_url" TEXT,
    "social" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "writers_pkey" PRIMARY KEY ("id")
);

-- CreateTable "producers"
CREATE TABLE "producers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_person" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "genres_acquiring" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "how_to_pitch" TEXT,
    "currently_looking" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable "pitches"
CREATE TABLE "pitches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "writer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "trope_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mood_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "episode_count_est" INTEGER,
    "target_platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pitch_video_url" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "related_kilig_tags" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pitches_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable "pitch_bookmarks"
CREATE TABLE "pitch_bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pitch_id" UUID NOT NULL,
    "producer_id" UUID NOT NULL,
    "bookmarked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "pitch_bookmarks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pitch_bookmarks_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pitch_bookmarks_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable "messages"
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_writer_id" UUID,
    "from_producer_id" UUID,
    "to_writer_id" UUID,
    "to_producer_id" UUID,
    "pitch_id" UUID,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_from_writer_id_fkey" FOREIGN KEY ("from_writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_from_producer_id_fkey" FOREIGN KEY ("from_producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_to_writer_id_fkey" FOREIGN KEY ("to_writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_to_producer_id_fkey" FOREIGN KEY ("to_producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable "trending_tropes"
CREATE TABLE "trending_tropes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trope" TEXT NOT NULL,
    "weekly_rank" INTEGER NOT NULL,
    "weekly_searches" INTEGER NOT NULL DEFAULT 0,
    "weekly_clicks" INTEGER NOT NULL DEFAULT 0,
    "weekly_saves" INTEGER NOT NULL DEFAULT 0,
    "week_over_week_growth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "trending_tropes_pkey" PRIMARY KEY ("id")
);

-- CreateTable "writer_auth"
CREATE TABLE "writer_auth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "writer_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "session_token" TEXT,
    "session_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "writer_auth_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "writer_auth_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "writers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable "producer_auth"
CREATE TABLE "producer_auth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "producer_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "session_token" TEXT,
    "session_expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "producer_auth_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "producer_auth_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "writers_display_name_key" ON "writers"("display_name");
CREATE UNIQUE INDEX "writers_email_key" ON "writers"("email");
CREATE UNIQUE INDEX "producers_email_key" ON "producers"("email");
CREATE INDEX "pitches_writer_id_idx" ON "pitches"("writer_id");
CREATE INDEX "pitches_status_idx" ON "pitches"("status");
CREATE UNIQUE INDEX "pitch_bookmarks_pitch_id_producer_id_key" ON "pitch_bookmarks"("pitch_id", "producer_id");
CREATE INDEX "pitch_bookmarks_producer_id_idx" ON "pitch_bookmarks"("producer_id");
CREATE INDEX "messages_to_writer_id_idx" ON "messages"("to_writer_id");
CREATE INDEX "messages_to_producer_id_idx" ON "messages"("to_producer_id");
CREATE INDEX "messages_from_writer_id_idx" ON "messages"("from_writer_id");
CREATE INDEX "messages_from_producer_id_idx" ON "messages"("from_producer_id");
CREATE UNIQUE INDEX "trending_tropes_trope_key" ON "trending_tropes"("trope");
CREATE UNIQUE INDEX "writer_auth_writer_id_key" ON "writer_auth"("writer_id");
CREATE UNIQUE INDEX "writer_auth_email_key" ON "writer_auth"("email");
CREATE UNIQUE INDEX "producer_auth_producer_id_key" ON "producer_auth"("producer_id");
CREATE UNIQUE INDEX "producer_auth_email_key" ON "producer_auth"("email");
