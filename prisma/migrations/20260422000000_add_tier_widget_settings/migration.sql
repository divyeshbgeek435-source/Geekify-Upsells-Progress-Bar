-- CreateTable
CREATE TABLE "TierWidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sequentialMsg1" TEXT NOT NULL DEFAULT 'Apply discount to unlock free shipping',
    "sequentialMsg2" TEXT NOT NULL DEFAULT 'Free shipping unlocked',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TierWidgetSettings_shop_key" ON "TierWidgetSettings"("shop");
