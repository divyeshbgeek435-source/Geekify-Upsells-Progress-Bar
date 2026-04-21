-- CreateTable
CREATE TABLE "ThresholdDiscountConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "automaticDiscountId" TEXT,
    "functionId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Threshold tiers',
    "tier1Type" TEXT NOT NULL DEFAULT 'FREE_SHIPPING',
    "tier1MinSubtotal" REAL NOT NULL DEFAULT 500,
    "tier1DiscountPct" REAL NOT NULL DEFAULT 10,
    "tier1Message" TEXT NOT NULL DEFAULT 'Tier 1 unlocked',
    "tier2MinSubtotal" REAL NOT NULL DEFAULT 1000,
    "tier2DiscountPct" REAL NOT NULL DEFAULT 20,
    "tier2Message" TEXT NOT NULL DEFAULT 'Tier 2 unlocked',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ThresholdDiscountConfig_shop_key" ON "ThresholdDiscountConfig"("shop");

-- CreateIndex
CREATE INDEX "ThresholdDiscountConfig_shop_updatedAt_idx" ON "ThresholdDiscountConfig"("shop", "updatedAt");
