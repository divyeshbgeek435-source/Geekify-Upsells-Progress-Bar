/** Logical plan ids returned by billing resolution (not Shopify billing config keys). */
export const APP_PLAN_ID = {
  FREE: "free",
  PREMIUM: "premium",
};

/**
 * Key in `shopify.server.js` `billing` and `billing.request({ plan })`.
 */
export const PREMIUM_PLAN_BILLING_KEY = "premium";

/** @deprecated Use PREMIUM_PLAN_BILLING_KEY */
export const PAID_MONTHLY_PLAN_KEY = PREMIUM_PLAN_BILLING_KEY;

export const PREMIUM_PLAN_PRICE_USD = 5;
export const PREMIUM_PLAN_CURRENCY = "USD";

/** @deprecated Use getPlanLimits().maxAnnouncementHeaders */
export const FREE_PLAN_ANNOUNCEMENT_BAR_LIMIT = 1;

export const PLAN_CATALOG = [
  {
    id: APP_PLAN_ID.FREE,
    name: "Free",
    priceLabel: "$0",
    intervalLabel: "forever",
    description: "Core cart tools with sensible limits for smaller stores.",
    features: [
      "Up to 2 discounts",
      "1 popup design",
      "1 announcement header + 1 announcement Section",
      "Widget preview with dynamic tier names",
      "Badge background colors per tier",
      "Tier icons and badge icon colors",
    ],
    highlighted: false,
  },
  {
    id: APP_PLAN_ID.PREMIUM,
    name: "Premium",
    priceLabel: `$${PREMIUM_PLAN_PRICE_USD}`,
    intervalLabel: "per month",
    description: "Unlimited campaigns and full widget control.",
    billingKey: PREMIUM_PLAN_BILLING_KEY,
    features: [
      "Unlimited discounts",
      "Unlimited popup designs",
      "Unlimited announcements",
      "Advanced widget settings & full customization",
    ],
    highlighted: true,
  },
];

/**
 * @type {Record<string, {
 *   maxDiscounts: number | null,
 *   maxPopups: number | null,
 *   maxAnnouncementHeaders: number | null,
 *   maxAnnouncementBodies: number | null,
 *   advancedWidgetSettings: boolean,
 * }>}
 */
export const PLAN_LIMITS = {
  [APP_PLAN_ID.FREE]: {
    maxDiscounts: 2,
    maxPopups: 1,
    maxAnnouncementHeaders: 1,
    maxAnnouncementBodies: 1,
    advancedWidgetSettings: false,
  },
  [APP_PLAN_ID.PREMIUM]: {
    maxDiscounts: null,
    maxPopups: null,
    maxAnnouncementHeaders: null,
    maxAnnouncementBodies: null,
    advancedWidgetSettings: true,
  },
};

export function getPlanLimits(planId) {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS[APP_PLAN_ID.FREE];
}

export function isPremiumPlan(planId) {
  return planId === APP_PLAN_ID.PREMIUM;
}

export function canUseAdvancedWidgetSettings(planId) {
  return Boolean(getPlanLimits(planId).advancedWidgetSettings);
}

export function planDisplayName(planId) {
  const row = PLAN_CATALOG.find((p) => p.id === planId);
  return row?.name ?? "Free";
}
