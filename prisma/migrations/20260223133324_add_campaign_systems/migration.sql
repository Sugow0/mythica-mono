/*
  Warnings:

  - You are about to drop the column `campaignSystemId` on the `Campaigns` table. All the data in the column will be lost.
  - You are about to drop the `CampaignSystemVersions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CampaignSystems` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `gameSystemId` to the `Campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CampaignSystemVersions" DROP CONSTRAINT "CampaignSystemVersions_campaignSystemId_fkey";

-- DropForeignKey
ALTER TABLE "Campaigns" DROP CONSTRAINT "Campaigns_campaignSystemId_fkey";

-- AlterTable
ALTER TABLE "Campaigns" DROP COLUMN "campaignSystemId",
ADD COLUMN     "gameSystemId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CampaignSystemVersions";

-- DropTable
DROP TABLE "CampaignSystems";

-- CreateTable
CREATE TABLE "GameSystems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSystems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSystemVersions" (
    "id" TEXT NOT NULL,
    "gameSystemId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSystemVersions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSystems_name_idx" ON "GameSystems"("name");

-- CreateIndex
CREATE INDEX "GameSystemVersions_gameSystemId_idx" ON "GameSystemVersions"("gameSystemId");

-- CreateIndex
CREATE INDEX "GameSystemVersions_version_idx" ON "GameSystemVersions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "GameSystemVersions_gameSystemId_version_key" ON "GameSystemVersions"("gameSystemId", "version");

-- AddForeignKey
ALTER TABLE "Campaigns" ADD CONSTRAINT "Campaigns_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSystemVersions" ADD CONSTRAINT "GameSystemVersions_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
