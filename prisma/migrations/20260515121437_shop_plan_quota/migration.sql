-- CreateTable
CREATE TABLE "shop_plan_quota" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "popupsCreated" INTEGER NOT NULL DEFAULT 0,
    "discountsCreated" INTEGER NOT NULL DEFAULT 0,
    "announcementHeadersCreated" INTEGER NOT NULL DEFAULT 0,
    "announcementBodiesCreated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
