CREATE TABLE "TierDiscount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "scheduleStartAt" DATETIME,
  "scheduleEndAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TierDiscount_shop_name_key"
ON "TierDiscount"("shop", "name");

CREATE INDEX "TierDiscount_shop_active_idx"
ON "TierDiscount"("shop", "active");
