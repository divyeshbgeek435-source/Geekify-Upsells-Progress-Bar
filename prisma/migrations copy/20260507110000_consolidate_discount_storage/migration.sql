-- Create consolidated discount table
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TIER_DISCOUNT',
    "name" TEXT NOT NULL DEFAULT 'Default Discount',
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scheduleStartAt" DATETIME,
    "scheduleEndAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Indexes for common queries
CREATE UNIQUE INDEX "Discount_shop_kind_name_key" ON "Discount"("shop", "kind", "name");
CREATE INDEX "Discount_shop_kind_active_idx" ON "Discount"("shop", "kind", "active");

-- Backfill discount parent rows (if legacy table exists)
INSERT INTO "Discount" ("id", "shop", "kind", "name", "dataJson", "active", "scheduleStartAt", "scheduleEndAt", "createdAt", "updatedAt")
SELECT
  "id",
  "shop",
  'TIER_DISCOUNT',
  "name",
  '{}',
  "active",
  "scheduleStartAt",
  "scheduleEndAt",
  "createdAt",
  "updatedAt"
FROM "TierDiscount"
;

-- Ensure every legacy threshold discount group has a parent discount row
INSERT INTO "Discount" ("id", "shop", "kind", "name", "dataJson", "active", "scheduleStartAt", "scheduleEndAt", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(16))),
  t."shop",
  'TIER_DISCOUNT',
  COALESCE(NULLIF(t."discountName", ''), 'Default Discount'),
  '{}',
  1,
  NULL,
  NULL,
  MIN(t."createdAt"),
  MAX(t."updatedAt")
FROM "ThresholdTier" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "Discount" d
  WHERE d."shop" = t."shop"
    AND d."kind" = 'TIER_DISCOUNT'
    AND d."name" = COALESCE(NULLIF(t."discountName", ''), 'Default Discount')
)
GROUP BY t."shop", COALESCE(NULLIF(t."discountName", ''), 'Default Discount')
;

-- Store all threshold tiers in Discount.dataJson as a JSON array
UPDATE "Discount"
SET "dataJson" = json_object(
  'tiers',
  COALESCE((
    SELECT json_group_array(
      json_object(
        'id', tt."id",
        'name', tt."name",
        'minSubtotal', tt."minSubtotal",
        'rewardType', tt."rewardType",
        'discountPercent', tt."discountPercent",
        'message', tt."message",
        'position', tt."position",
        'active', tt."active",
        'usageCount', tt."usageCount",
        'scheduleStartAt', tt."scheduleStartAt",
        'scheduleEndAt', tt."scheduleEndAt",
        'createdAt', tt."createdAt",
        'updatedAt', tt."updatedAt"
      )
    )
    FROM "ThresholdTier" tt
    WHERE tt."shop" = "Discount"."shop"
      AND COALESCE(NULLIF(tt."discountName", ''), 'Default Discount') = "Discount"."name"
  ), json('[]'))
)
WHERE "kind" = 'TIER_DISCOUNT'
;

-- Backfill widget settings (including advanced settings JSON) into consolidated table
INSERT INTO "Discount" ("id", "shop", "kind", "name", "dataJson", "active", "scheduleStartAt", "scheduleEndAt", "createdAt", "updatedAt")
SELECT
  "id",
  "shop",
  'WIDGET_SETTINGS',
  '__widget_settings__',
  json_object(
    'sequentialMsg0', "sequentialMsg0",
    'sequentialMsg1', "sequentialMsg1",
    'sequentialMsg2', "sequentialMsg2",
    'sequentialHintZero', "sequentialHintZero",
    'sequentialHintMid', "sequentialHintMid",
    'tier1Icon', "tier1Icon",
    'tier2Icon', "tier2Icon",
    'subtotalLabel', "subtotalLabel",
    'estimatedShippingLabel', "estimatedShippingLabel",
    'widgetBackgroundColor', "widgetBackgroundColor",
    'widgetTextColor', "widgetTextColor",
    'widgetBorderColor', "widgetBorderColor",
    'widgetUseCustomColors', "widgetUseCustomColors",
    'tier1LabelText', "tier1LabelText",
    'tier2LabelText', "tier2LabelText",
    'minAmountPrefixText', "minAmountPrefixText",
    'showTierIcons', "showTierIcons",
    'showTierLabels', "showTierLabels",
    'showTierMinimums', "showTierMinimums",
    'widgetDynamicConfigJson', "widgetDynamicConfigJson",
    'selectorTargets', "selectorTargets",
    'nameTargetSelectors', "nameTargetSelectors",
    'sequentialTitle', "sequentialTitle"
  ),
  true,
  NULL,
  NULL,
  "createdAt",
  "updatedAt"
FROM "TierWidgetSettings"
;
