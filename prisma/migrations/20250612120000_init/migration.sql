-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "announcement_body" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "announcement_body_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_headers" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "barType" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "customHtml" TEXT NOT NULL DEFAULT '',
    "customLiquid" TEXT NOT NULL DEFAULT '',
    "customCss" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "announcement_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popup_design" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "popupDesignId" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "templateJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popup_design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TIER_DISCOUNT',
    "name" TEXT NOT NULL DEFAULT 'Default Discount',
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scheduleStartAt" TIMESTAMP(3),
    "scheduleEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierDiscount" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scheduleStartAt" TIMESTAMP(3),
    "scheduleEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierWidgetSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "sequentialMsg1" TEXT NOT NULL DEFAULT 'Apply discount to unlock free shipping',
    "sequentialMsg2" TEXT NOT NULL DEFAULT 'Free shipping unlocked',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameTargetSelectors" TEXT NOT NULL DEFAULT '.cart-drawer__content, .drawer__inner, .drawer__header, form[action=''/cart''], .cart__blocks',
    "selectorTargets" TEXT NOT NULL DEFAULT '.product__info-container, .cart-drawer__content, .drawer__inner, form[action=''/cart''], .cart__blocks',
    "sequentialTitle" TEXT NOT NULL DEFAULT 'Rewards progress',
    "progressBarDesignJson" TEXT NOT NULL DEFAULT '{}',
    "sequentialMsg0" TEXT NOT NULL DEFAULT 'Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.',
    "sequentialHintZero" TEXT NOT NULL DEFAULT 'Progress: 0% - unlock Tier 1 to start.',
    "sequentialHintMid" TEXT NOT NULL DEFAULT 'Progress: 50% - unlock Tier 2 for free shipping.',
    "tier1Icon" TEXT NOT NULL DEFAULT '%',
    "tier2Icon" TEXT NOT NULL DEFAULT 'truck',
    "subtotalLabel" TEXT NOT NULL DEFAULT 'Current subtotal',
    "estimatedShippingLabel" TEXT NOT NULL DEFAULT 'Estimated shipping',
    "widgetBackgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "widgetTextColor" TEXT NOT NULL DEFAULT '#111827',
    "widgetBorderColor" TEXT NOT NULL DEFAULT '#d1d5db',
    "widgetUseCustomColors" BOOLEAN NOT NULL DEFAULT false,
    "tier1LabelText" TEXT NOT NULL DEFAULT 'Discount',
    "tier2LabelText" TEXT NOT NULL DEFAULT 'Free shipping',
    "minAmountPrefixText" TEXT NOT NULL DEFAULT 'Min.',
    "showTierIcons" BOOLEAN NOT NULL DEFAULT true,
    "showTierLabels" BOOLEAN NOT NULL DEFAULT true,
    "showTierMinimums" BOOLEAN NOT NULL DEFAULT true,
    "widgetDynamicConfigJson" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "TierWidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartAccessLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "itemCount" INTEGER,
    "subtotalCents" INTEGER,
    "currency" TEXT,
    "pathname" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementBar" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barType" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementBar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupSignup" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "popupDesignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_plan_state" (
    "shop" TEXT NOT NULL,
    "lastKnownPlanId" TEXT NOT NULL DEFAULT 'free',
    "pendingDowngradeNotice" BOOLEAN NOT NULL DEFAULT false,
    "premiumTrialConsumedAt" TIMESTAMP(3),
    "premiumTrialStartedAt" TIMESTAMP(3),
    "premiumTrialExpiredAt" TIMESTAMP(3),
    "premiumSubscriptionActive" BOOLEAN NOT NULL DEFAULT false,
    "pendingPremiumTrialExpiryNotice" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_plan_state_pkey" PRIMARY KEY ("shop")
);

-- CreateIndex
CREATE INDEX "announcement_body_shop_updatedAt_idx" ON "announcement_body"("shop", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_body_shop_sectionId_key" ON "announcement_body"("shop", "sectionId");

-- CreateIndex
CREATE INDEX "announcement_headers_shop_updatedAt_idx" ON "announcement_headers"("shop", "updatedAt");

-- CreateIndex
CREATE INDEX "announcement_headers_shop_active_idx" ON "announcement_headers"("shop", "active");

-- CreateIndex
CREATE INDEX "popup_design_shop_updatedAt_idx" ON "popup_design"("shop", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "popup_design_shop_popupDesignId_key" ON "popup_design"("shop", "popupDesignId");

-- CreateIndex
CREATE INDEX "Discount_shop_kind_active_idx" ON "Discount"("shop", "kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_shop_kind_name_key" ON "Discount"("shop", "kind", "name");

-- CreateIndex
CREATE INDEX "TierDiscount_shop_active_idx" ON "TierDiscount"("shop", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TierDiscount_shop_name_key" ON "TierDiscount"("shop", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TierWidgetSettings_shop_key" ON "TierWidgetSettings"("shop");

-- CreateIndex
CREATE INDEX "CartAccessLog_shop_createdAt_idx" ON "CartAccessLog"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementBar_shop_updatedAt_idx" ON "AnnouncementBar"("shop", "updatedAt");

-- CreateIndex
CREATE INDEX "AnnouncementBar_shop_active_idx" ON "AnnouncementBar"("shop", "active");

-- CreateIndex
CREATE INDEX "PopupSignup_shop_popupDesignId_idx" ON "PopupSignup"("shop", "popupDesignId");

-- CreateIndex
CREATE UNIQUE INDEX "PopupSignup_shop_popupDesignId_email_key" ON "PopupSignup"("shop", "popupDesignId", "email");

