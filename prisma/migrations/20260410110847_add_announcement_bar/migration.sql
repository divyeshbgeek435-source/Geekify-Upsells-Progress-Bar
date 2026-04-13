-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnnouncementBar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "barType" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AnnouncementBar" ("barType", "configJson", "createdAt", "id", "name", "shop", "updatedAt") SELECT "barType", "configJson", "createdAt", "id", "name", "shop", "updatedAt" FROM "AnnouncementBar";
DROP TABLE "AnnouncementBar";
ALTER TABLE "new_AnnouncementBar" RENAME TO "AnnouncementBar";
CREATE INDEX "AnnouncementBar_shop_idx" ON "AnnouncementBar"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
