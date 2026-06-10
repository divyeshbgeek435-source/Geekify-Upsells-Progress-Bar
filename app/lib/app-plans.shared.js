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

export const PREMIUM_PLAN_PRICE_USD = 4.99;
export const PREMIUM_PLAN_CURRENCY = "USD";

/** Length of the in-app Premium trial before checkout is required. */
export const PREMIUM_TRIAL_DAYS = 7;

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
      "Up to 1 discounts (enabled immediately, no scheduling)",
      "1 popup design",
      "1 announcement header + 1 announcement Section",
      "Widget preview with dynamically configured icons.",
      "Background colors per tier", 
      // "Tier icons and badge icon colors",
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
      `${PREMIUM_TRIAL_DAYS}-day free trial`,
      "Unlimited discounts (with scheduling)",
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
 *   trialDays: number | null,
 * }>}
 */
export const PLAN_LIMITS = {
  [APP_PLAN_ID.FREE]: {
    maxDiscounts: 1,
    maxPopups: 1,
    maxAnnouncementHeaders: 1,
    maxAnnouncementBodies: 1,
    advancedWidgetSettings: false,
    trialDays: null,
  },
  [APP_PLAN_ID.PREMIUM]: {
    maxDiscounts: null,
    maxPopups: null,
    maxAnnouncementHeaders: null,
    maxAnnouncementBodies: null,
    advancedWidgetSettings: true,
    trialDays: PREMIUM_TRIAL_DAYS,
  },
};

export function getPlanLimits(planId) {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS[APP_PLAN_ID.FREE];
}

/** @returns {number} Premium trial length in days (from plan limits catalog). */
export function getPremiumTrialDays() {
  const days = getPlanLimits(APP_PLAN_ID.PREMIUM).trialDays;
  return typeof days === "number" && days > 0 ? days : PREMIUM_TRIAL_DAYS;
}

export function isPremiumPlan(planId) {
  return planId === APP_PLAN_ID.PREMIUM;
}

export function canUseAdvancedWidgetSettings(planId) {
  return Boolean(getPlanLimits(planId).advancedWidgetSettings);
}

/** Discount start/end scheduling is a Premium-only feature. */
export function canScheduleDiscounts(planId) {
  return isPremiumPlan(planId);
}

/** Shown on Free plan where discount scheduling controls are hidden. */
export const FREE_PLAN_DISCOUNT_SCHEDULING_NOTE =
  "If you want to schedule discounts, please upgrade to the Pro Plan.";

/** Popup page targeting (Homepage only / Exact URL) is a Pro-only feature. */
export function canUsePopupTargeting(planId) {
  return isPremiumPlan(planId);
}

/** Shown inside the Targeting tab on the Free plan. */
export const FREE_PLAN_POPUP_TARGETING_UPGRADE_MESSAGE =
  "Targeting options are available on the Pro Plan. Upgrade to choose Homepage only or Exact URL targeting.";

export function planDisplayName(planId) {
  const row = PLAN_CATALOG.find((p) => p.id === planId);
  return row?.name ?? "Free";
}
