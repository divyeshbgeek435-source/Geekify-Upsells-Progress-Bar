-- CreateTable
CREATE TABLE "shop_plan_state" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "lastKnownPlanId" TEXT NOT NULL DEFAULT 'free',
    "pendingDowngradeNotice" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
