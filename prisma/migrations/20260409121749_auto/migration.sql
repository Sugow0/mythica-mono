-- CreateEnum
CREATE TYPE "CharacterTypeEnum" AS ENUM ('PLAYER', 'NPC');

-- CreateTable
CREATE TABLE "Characters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CharacterTypeEnum" NOT NULL DEFAULT 'PLAYER',
    "data" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "campaignId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Characters_userId_idx" ON "Characters"("userId");

-- CreateIndex
CREATE INDEX "Characters_campaignId_idx" ON "Characters"("campaignId");

-- CreateIndex
CREATE INDEX "Characters_campaignId_type_idx" ON "Characters"("campaignId", "type");

-- AddForeignKey
ALTER TABLE "Characters" ADD CONSTRAINT "Characters_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Characters" ADD CONSTRAINT "Characters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
