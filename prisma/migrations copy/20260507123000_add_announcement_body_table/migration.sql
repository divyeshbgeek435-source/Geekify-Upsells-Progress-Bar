-- CreateTable
CREATE TABLE "announcement_body" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "announcement_body_shop_sectionId_key" ON "announcement_body"("shop", "sectionId");
CREATE INDEX "announcement_body_shop_updatedAt_idx" ON "announcement_body"("shop", "updatedAt");

-- Backfill existing additional UI rows from AnnouncementBar
INSERT INTO "announcement_body" ("id", "shop", "name", "sectionId", "bodyJson", "active", "createdAt", "updatedAt")
SELECT
  ab."id",
  ab."shop",
  ab."name",
  COALESCE(NULLIF(json_extract(ab."configJson", '$.sectionId'), ''), lower(substr(ab."id", 1, 12))),
  ab."configJson",
  ab."active",
  ab."createdAt",
  ab."updatedAt"
FROM "AnnouncementBar" ab
WHERE ab."barType" = 'additional_ui'
;
