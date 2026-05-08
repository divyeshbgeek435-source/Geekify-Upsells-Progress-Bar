-- CreateTable
CREATE TABLE "popup_design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "popupDesignId" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "templateJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "popup_design_shop_popupDesignId_key" ON "popup_design"("shop", "popupDesignId");
CREATE INDEX "popup_design_shop_updatedAt_idx" ON "popup_design"("shop", "updatedAt");

-- Backfill existing popup designs from AnnouncementBar rows
INSERT INTO "popup_design" ("id", "shop", "name", "popupDesignId", "configJson", "templateJson", "active", "createdAt", "updatedAt")
SELECT
  ab."id",
  ab."shop",
  ab."name",
  COALESCE(NULLIF(json_extract(ab."configJson", '$.popupDesignId'), ''), ab."id"),
  ab."configJson",
  json_object(
    'version', 1,
    'popupDesignId', COALESCE(NULLIF(json_extract(ab."configJson", '$.popupDesignId'), ''), ab."id"),
    'templateDesign', json_object(
      'designTemplateId', COALESCE(json_extract(ab."configJson", '$.designTemplateId'), ''),
      'layoutMode', COALESCE(json_extract(ab."configJson", '$.layoutMode'), ''),
      'visualStyle', COALESCE(json_extract(ab."configJson", '$.visualStyle'), '')
    ),
    'header', json_object('headline', COALESCE(json_extract(ab."configJson", '$.headline'), '')),
    'body', json_object(
      'subheadline', COALESCE(json_extract(ab."configJson", '$.subheadline'), ''),
      'bodyText', COALESCE(json_extract(ab."configJson", '$.bodyText'), '')
    ),
    'rate', json_object('value', COALESCE(json_extract(ab."configJson", '$.rate'), '')),
    'discount', json_object(
      'couponCode', COALESCE(json_extract(ab."configJson", '$.couponCode'), ''),
      'value', COALESCE(json_extract(ab."configJson", '$.discount'), '')
    ),
    'uiBlocks', COALESCE(json_extract(ab."configJson", '$.uiBlocks'), json('[]')),
    'render', json_object('config', json(ab."configJson"))
  ),
  ab."active",
  ab."createdAt",
  ab."updatedAt"
FROM "AnnouncementBar" ab
WHERE ab."barType" = 'popup_design'
;
