ALTER TABLE "TierWidgetSettings"
ADD COLUMN "tier1LabelText" TEXT NOT NULL DEFAULT 'Discount';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "tier2LabelText" TEXT NOT NULL DEFAULT 'Free shipping';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "minAmountPrefixText" TEXT NOT NULL DEFAULT 'Min.';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "showTierIcons" BOOLEAN NOT NULL DEFAULT 1;

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "showTierLabels" BOOLEAN NOT NULL DEFAULT 1;

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "showTierMinimums" BOOLEAN NOT NULL DEFAULT 1;
