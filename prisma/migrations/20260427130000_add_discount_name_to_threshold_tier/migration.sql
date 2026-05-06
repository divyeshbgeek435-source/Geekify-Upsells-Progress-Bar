ALTER TABLE "ThresholdTier"
ADD COLUMN "discountName" TEXT NOT NULL DEFAULT 'Default Discount';

CREATE INDEX "ThresholdTier_shop_discountName_active_position_idx"
ON "ThresholdTier"("shop", "discountName", "active", "position");
