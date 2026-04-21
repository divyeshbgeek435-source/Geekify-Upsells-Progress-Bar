/*
  Warnings:

  - You are about to drop the `ThresholdDiscountConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ThresholdDiscountConfig";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ThresholdTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSubtotal" REAL NOT NULL,
    "rewardType" TEXT NOT NULL,
    "discountPercent" REAL,
    "message" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ThresholdTier_shop_active_position_idx" ON "ThresholdTier"("shop", "active", "position");
