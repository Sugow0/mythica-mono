/*
  Warnings:

  - Added the required column `campaignSystemId` to the `Campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaigns" ADD COLUMN     "campaignSystemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CampaignSystems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSystems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSystemVersions" (
    "id" TEXT NOT NULL,
    "campaignSystemId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSystemVersions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignSystems_name_idx" ON "CampaignSystems"("name");

-- AddForeignKey
ALTER TABLE "Campaigns" ADD CONSTRAINT "Campaigns_campaignSystemId_fkey" FOREIGN KEY ("campaignSystemId") REFERENCES "CampaignSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSystemVersions" ADD CONSTRAINT "CampaignSystemVersions_campaignSystemId_fkey" FOREIGN KEY ("campaignSystemId") REFERENCES "CampaignSystems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
