-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('text', 'number', 'boolean', 'select', 'multiselect', 'textarea', 'resource', 'list', 'derived');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('gm', 'player', 'spectator');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('scheduled', 'active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "token_layer" AS ENUM ('background', 'object', 'token', 'gm');

-- CreateEnum
CREATE TYPE "file_domain" AS ENUM ('map', 'token', 'music', 'notes', 'report', 'video', 'asset', 'avatar', 'cover');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_systems" (
    "id" UUID NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "parent_system_id" UUID,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "game_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheet_properties" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "type" "property_type" NOT NULL,
    "default_value" TEXT,
    "min_value" DECIMAL,
    "max_value" DECIMAL,
    "options" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_sheet_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_system_properties" (
    "id" UUID NOT NULL,
    "game_system_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "group_name" VARCHAR(100),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "override_label" VARCHAR(255),
    "override_default" TEXT,
    "formula" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_system_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "game_system_id" UUID NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" "campaign_status" NOT NULL DEFAULT 'active',
    "cover_file_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_members" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'player',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_system_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_file_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "character_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_sheet_values" (
    "id" UUID NOT NULL,
    "character_sheet_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "character_sheet_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_character_sheets" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "character_sheet_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_character_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "status" "session_status" NOT NULL DEFAULT 'scheduled',
    "scheduled_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "map_state" JSONB NOT NULL DEFAULT '{}',
    "combat_state" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "character_sheet_id" UUID,
    "label" VARCHAR(255),
    "file_id" UUID,
    "pos_x" DECIMAL NOT NULL DEFAULT 0,
    "pos_y" DECIMAL NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 1,
    "height" INTEGER NOT NULL DEFAULT 1,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "layer" "token_layer" NOT NULL DEFAULT 'token',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "session_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_token_overrides" (
    "id" UUID NOT NULL,
    "session_token_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "session_token_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "campaign_id" UUID,
    "domain" "file_domain" NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_systems_slug_key" ON "game_systems"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "character_sheet_properties_key_key" ON "character_sheet_properties"("key");

-- CreateIndex
CREATE INDEX "idx_properties_key" ON "character_sheet_properties"("key");

-- CreateIndex
CREATE UNIQUE INDEX "game_system_properties_game_system_id_property_id_key" ON "game_system_properties"("game_system_id", "property_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_deleted" ON "campaigns"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_campaign_members_campaign" ON "campaign_members"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_campaign_members_user" ON "campaign_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_members_campaign_id_user_id_key" ON "campaign_members"("campaign_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_character_sheets_user" ON "character_sheets"("user_id");

-- CreateIndex
CREATE INDEX "idx_character_sheets_system" ON "character_sheets"("game_system_id");

-- CreateIndex
CREATE INDEX "idx_sheet_values_sheet" ON "character_sheet_values"("character_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_sheet_values_character_sheet_id_property_id_key" ON "character_sheet_values"("character_sheet_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_character_sheets_campaign_id_character_sheet_id_key" ON "campaign_character_sheets"("campaign_id", "character_sheet_id");

-- CreateIndex
CREATE INDEX "idx_sessions_campaign" ON "sessions"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_sessions_status" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "idx_session_tokens_session" ON "session_tokens"("session_id");

-- CreateIndex
CREATE INDEX "idx_token_overrides_token" ON "session_token_overrides"("session_token_id");

-- CreateIndex
CREATE INDEX "idx_token_overrides_property" ON "session_token_overrides"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_overrides_session_token_id_property_id_key" ON "session_token_overrides"("session_token_id", "property_id");

-- CreateIndex
CREATE INDEX "idx_files_owner" ON "files"("owner_id");

-- CreateIndex
CREATE INDEX "idx_files_campaign_domain" ON "files"("campaign_id", "domain");

-- CreateIndex
CREATE INDEX "idx_files_deleted" ON "files"("deleted_at");

-- AddForeignKey
ALTER TABLE "game_systems" ADD CONSTRAINT "game_systems_parent_system_id_fkey" FOREIGN KEY ("parent_system_id") REFERENCES "game_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_system_properties" ADD CONSTRAINT "game_system_properties_game_system_id_fkey" FOREIGN KEY ("game_system_id") REFERENCES "game_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_system_properties" ADD CONSTRAINT "game_system_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "character_sheet_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_game_system_id_fkey" FOREIGN KEY ("game_system_id") REFERENCES "game_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_cover_file_id_fkey" FOREIGN KEY ("cover_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_game_system_id_fkey" FOREIGN KEY ("game_system_id") REFERENCES "game_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheets" ADD CONSTRAINT "character_sheets_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_values" ADD CONSTRAINT "character_sheet_values_character_sheet_id_fkey" FOREIGN KEY ("character_sheet_id") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_sheet_values" ADD CONSTRAINT "character_sheet_values_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "character_sheet_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_character_sheets" ADD CONSTRAINT "campaign_character_sheets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_character_sheets" ADD CONSTRAINT "campaign_character_sheets_character_sheet_id_fkey" FOREIGN KEY ("character_sheet_id") REFERENCES "character_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_tokens" ADD CONSTRAINT "session_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_tokens" ADD CONSTRAINT "session_tokens_character_sheet_id_fkey" FOREIGN KEY ("character_sheet_id") REFERENCES "character_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_tokens" ADD CONSTRAINT "session_tokens_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_token_overrides" ADD CONSTRAINT "session_token_overrides_session_token_id_fkey" FOREIGN KEY ("session_token_id") REFERENCES "session_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_token_overrides" ADD CONSTRAINT "session_token_overrides_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "character_sheet_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
