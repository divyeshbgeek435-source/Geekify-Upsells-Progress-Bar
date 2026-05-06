ALTER TABLE "TierWidgetSettings"
ADD COLUMN "sequentialHintZero" TEXT NOT NULL DEFAULT 'Progress: 0% — unlock Tier 1 to start.';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "sequentialHintMid" TEXT NOT NULL DEFAULT 'Progress: 50% — unlock Tier 2 for free shipping.';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "tier1Icon" TEXT NOT NULL DEFAULT '%';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "tier2Icon" TEXT NOT NULL DEFAULT '🚚';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "subtotalLabel" TEXT NOT NULL DEFAULT 'Current subtotal';

ALTER TABLE "TierWidgetSettings"
ADD COLUMN "estimatedShippingLabel" TEXT NOT NULL DEFAULT 'Estimated shipping';
