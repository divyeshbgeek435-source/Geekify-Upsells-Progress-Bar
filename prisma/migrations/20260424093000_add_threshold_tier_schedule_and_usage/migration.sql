-- AlterTable
ALTER TABLE "ThresholdTier" ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ThresholdTier" ADD COLUMN "scheduleStartAt" DATETIME;
ALTER TABLE "ThresholdTier" ADD COLUMN "scheduleEndAt" DATETIME;
