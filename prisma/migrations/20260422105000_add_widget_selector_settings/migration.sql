-- AlterTable
ALTER TABLE "TierWidgetSettings" ADD COLUMN "nameTargetSelectors" TEXT NOT NULL DEFAULT '.cart-drawer__content, .drawer__inner, .drawer__header, form[action=''/cart''], .cart__blocks';
ALTER TABLE "TierWidgetSettings" ADD COLUMN "selectorTargets" TEXT NOT NULL DEFAULT '.product__info-container, .cart-drawer__content, .drawer__inner, form[action=''/cart''], .cart__blocks';
ALTER TABLE "TierWidgetSettings" ADD COLUMN "sequentialTitle" TEXT NOT NULL DEFAULT 'Rewards progress';
