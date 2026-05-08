-- CreateTable
CREATE TABLE "announcement_headers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "barType" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "customHtml" TEXT NOT NULL DEFAULT '',
    "customLiquid" TEXT NOT NULL DEFAULT '',
    "customCss" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "announcement_headers_shop_updatedAt_idx" ON "announcement_headers"("shop", "updatedAt");
CREATE INDEX "announcement_headers_shop_active_idx" ON "announcement_headers"("shop", "active");

-- Backfill announcement header rows from AnnouncementBar
INSERT INTO "announcement_headers" ("id", "shop", "name", "active", "barType", "configJson", "customHtml", "customLiquid", "customCss", "createdAt", "updatedAt")
SELECT
  "id",
  "shop",
  "name",
  "active",
  "barType",
  "configJson",
  "customHtml",
  "customLiquid",
  "customCss",
  "createdAt",
  "updatedAt"
FROM "AnnouncementBar"
WHERE "barType" IN ('sticky', 'marquee', 'rotating')
;
