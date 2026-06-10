import prisma from "../db.server";
import {
  APP_PLAN_ID,
  canUsePopupTargeting,
  FREE_PLAN_POPUP_TARGETING_UPGRADE_MESSAGE,
  PREMIUM_PLAN_BILLING_KEY,
  getPlanLimits,
  planDisplayName,
} from "./app-plans.shared.js";
import { parsePopupDesignConfig } from "./popup-design-config.js";
import { normalizePopupPageTarget } from "./popup-page-target.shared.js";
import {
  FREE_PLAN_DELETE_BLOCKED_MESSAGE,
  canDeleteOnPlan,
} from "./plan-delete-access.shared.js";
import {
  loadShopPlanSlots,
  syncShopPlanState,
} from "./plan-limit-enforcement.server.js";
import {
  buildPremiumTrialBillingMeta,
  clearPremiumTrialOnPaidSubscription,
  expirePremiumTrialIfNeeded,
  loadShopPlanStateRow,
  resolveEffectivePlanId,
} from "./premium-trial.server.js";
import { syncShopPremiumSubscriptionFlag } from "./storefront-access.server.js";

/** Use test charges on dev stores unless explicitly disabled. */
export function billingUsesTestMode() {
  const flag = process.env.SHOPIFY_APP_BILLING_TEST;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * @param {import('@shopify/shopify-app-react-router/server').BillingContext} billing
 */
export async function resolveShopAppPlan(billing) {
  const { hasActivePayment } = await billing.check({
    plans: [PREMIUM_PLAN_BILLING_KEY],
    isTest: billingUsesTestMode(),
  });
  return hasActivePayment ? APP_PLAN_ID.PREMIUM : APP_PLAN_ID.FREE;
}

/**
 * @param {import('@shopify/shopify-app-react-router/server').BillingContext} billing
 * @param {string} [shop] When provided, enforces Free plan limits and tracks Premium → Free transitions.
 */
export async function loadShopBillingContext(billing, shop) {
  const isTest = billingUsesTestMode();
  const check = await billing.check({
    plans: [PREMIUM_PLAN_BILLING_KEY],
    isTest,
  });
  const hasActivePayment = check.hasActivePayment;
  let planState = null;
  if (shop) {
    planState = await loadShopPlanStateRow(shop);
    if (!hasActivePayment) {
      planState = await expirePremiumTrialIfNeeded(shop, planState);
    } else {
      await clearPremiumTrialOnPaidSubscription(shop);
      planState = await loadShopPlanStateRow(shop);
    }
    await syncShopPremiumSubscriptionFlag(shop, hasActivePayment);
    planState = await loadShopPlanStateRow(shop);
  }

  const planId = shop
    ? resolveEffectivePlanId(hasActivePayment, planState)
    : hasActivePayment
      ? APP_PLAN_ID.PREMIUM
      : APP_PLAN_ID.FREE;

  const premiumTrial = shop
    ? buildPremiumTrialBillingMeta(hasActivePayment, planState)
    : {
        subscriptionState: "free",
        trialDays: 0,
        trialStartedAt: null,
        trialEndsAt: null,
        trialActive: false,
        trialExpired: false,
        isAppLocked: false,
        showPremiumTrialExpiredModal: false,
        trialDaysRemaining: null,
        hasUsedPremiumTrial: false,
        canStartTrial: false,
      };

  let limits = getPlanLimits(planId);
  let planSlots = null;
  let showPlanDowngradeNotice = false;
  const activeSubscription = check.appSubscriptions?.[0] ?? null;

  if (shop) {
    const synced = await syncShopPlanState(shop, planId);
    limits = synced.limits;
    planSlots = synced.planSlots;
    showPlanDowngradeNotice =
      synced.showPlanDowngradeNotice && !premiumTrial.showPremiumTrialExpiredModal;
  } else if (planId === APP_PLAN_ID.FREE) {
    planSlots = {
      editableDiscountNames: [],
      allDiscountNames: [],
      editablePopupIds: [],
      editableAnnouncementHeaderIds: [],
      editableAnnouncementBodyIds: [],
    };
  }

  const subscriptionState = premiumTrial.subscriptionState;
  const isAppLocked = Boolean(premiumTrial.isAppLocked);
  const isPremium =
    planId === APP_PLAN_ID.PREMIUM && !isAppLocked;

  return {
    planId,
    planName: planDisplayName(planId),
    isPremium,
    subscriptionState,
    isAppLocked,
    limits,
    planSlots,
    showPlanDowngradeNotice,
    isTest,
    hasActivePayment,
    premiumTrial,
    appSubscriptions: check.appSubscriptions ?? [],
    activeSubscription,
  };
}

export { rejectIfAppLocked } from "./guard-app-access.server.js";

export {
  acknowledgePremiumTrialExpiryFreePlan,
  startPremiumTrial,
  cancelPremiumTrial,
} from "./premium-trial.server.js";

/** @deprecated Prefer planSlots from loadShopBillingContext */
export async function loadShopPlanSlotsForBilling(shop, planId) {
  return loadShopPlanSlots(shop, planId);
}

export async function countShopAnnouncementHeaders(shop) {
  return prisma.announcementHeader.count({ where: { shop } });
}

export async function countShopAnnouncementBodies(shop) {
  return prisma.announcementBody.count({ where: { shop } });
}

export async function countShopAnnouncements(shop) {
  const [headers, bodies] = await Promise.all([
    countShopAnnouncementHeaders(shop),
    countShopAnnouncementBodies(shop),
  ]);
  return headers + bodies;
}

export async function countShopPopups(shop) {
  return prisma.popupDesign.count({ where: { shop } });
}

export async function countShopTierDiscounts(shop) {
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      const rows = await prisma.tierDiscount.findMany({
        where: { shop },
        select: { name: true },
      });
      return rows.length;
    } catch {
      /* fall through */
    }
  }
  const tiers = await prisma.thresholdTier.findMany({
    where: { shop },
    select: { discountName: true },
  });
  const names = new Set(
    tiers.map((t) => String(t.discountName || "Default Discount").trim()).filter(Boolean),
  );
  return names.size;
}

function upgradeMessage(resourceLabel, limit) {
  return `Your ${planDisplayName(APP_PLAN_ID.FREE)} plan allows up to ${limit} ${resourceLabel}. Upgrade to Premium for unlimited ${resourceLabel}.`;
}

/** Free plan popups always use All pages targeting. */
export function clampPopupTargetingForPlan(config, planId) {
  if (canUsePopupTargeting(planId)) return config;
  return parsePopupDesignConfig(
    JSON.stringify({
      ...config,
      pageTarget: "all",
      exactPageUrl: "",
      customPathContains: "",
    }),
  );
}

/** Blocks non–All pages targeting on the Free plan. */
export function rejectIfPopupTargetingNotAllowed(planId, pageTarget, exactPageUrl = "") {
  if (canUsePopupTargeting(planId)) return null;
  const target = normalizePopupPageTarget(pageTarget);
  const exact = String(exactPageUrl || "").trim();
  if (target === "all" && !exact) return null;
  return {
    ok: false,
    error: FREE_PLAN_POPUP_TARGETING_UPGRADE_MESSAGE,
    planUpgradeRequired: true,
  };
}

/** Blocks delete intents on the Free plan (Premium / $5 plan required). */
export function rejectIfDeleteNotAllowed(planId) {
  if (canDeleteOnPlan(planId)) return null;
  return {
    ok: false,
    error: FREE_PLAN_DELETE_BLOCKED_MESSAGE,
    planUpgradeRequired: true,
  };
}

/** @returns {"header" | "body" | null} */
export function inferAnnouncementCreateKind(form) {
  const intent = String(form.get("intent") || "");
  const kind = String(form.get("recordKind") || "").trim().toLowerCase();
  if (intent === "create") return "header";
  if (intent === "save" && !String(form.get("rowId") || "").trim()) {
    if (kind === "body" || form.has("messagesJson")) return "body";
  }
  return null;
}

export async function rejectIfAnnouncementCreateBlocked(shop, planId, form) {
  const createKind = inferAnnouncementCreateKind(form);
  if (!createKind) return null;

  const limits = getPlanLimits(planId);
  if (createKind === "header") {
    if (limits.maxAnnouncementHeaders == null) return null;
    const count = await countShopAnnouncementHeaders(shop);
    if (count >= limits.maxAnnouncementHeaders) {
      return {
        ok: false,
        error: upgradeMessage("announcement headers", limits.maxAnnouncementHeaders),
        planUpgradeRequired: true,
      };
    }
    return null;
  }

  if (limits.maxAnnouncementBodies == null) return null;
  const count = await countShopAnnouncementBodies(shop);
  if (count >= limits.maxAnnouncementBodies) {
    return {
      ok: false,
      error: upgradeMessage("announcement bodies", limits.maxAnnouncementBodies),
      planUpgradeRequired: true,
    };
  }
  return null;
}

/** @deprecated Use rejectIfAnnouncementCreateBlocked */
export async function rejectIfAnnouncementLimitReached(shop, planId) {
  const limits = getPlanLimits(planId);
  const total = limits.maxAnnouncementHeaders != null && limits.maxAnnouncementBodies != null
    ? limits.maxAnnouncementHeaders + limits.maxAnnouncementBodies
    : null;
  if (total == null) return null;
  const count = await countShopAnnouncements(shop);
  if (count >= total) {
    return {
      ok: false,
      error: upgradeMessage("announcements", total),
      planUpgradeRequired: true,
    };
  }
  return null;
}

export async function rejectIfPopupLimitReached(shop, planId) {
  const { maxPopups } = getPlanLimits(planId);
  if (maxPopups == null) return null;
  const count = await countShopPopups(shop);
  if (count >= maxPopups) {
    return {
      ok: false,
      error: upgradeMessage("popup designs", maxPopups),
      planUpgradeRequired: true,
    };
  }
  return null;
}

export async function rejectIfDiscountLimitReached(shop, planId) {
  const { maxDiscounts } = getPlanLimits(planId);
  if (maxDiscounts == null) return null;
  const count = await countShopTierDiscounts(shop);
  if (count >= maxDiscounts) {
    return {
      ok: false,
      errors: {
        tier: upgradeMessage("discounts", maxDiscounts),
      },
      planUpgradeRequired: true,
    };
  }
  return null;
}

export function billingReturnUrl(request) {
  const url = new URL(request.url);
  const returnUrl = new URL("/app/billing", url.origin);
  for (const key of ["shop", "host", "embedded"]) {
    const val = url.searchParams.get(key);
    if (val) returnUrl.searchParams.set(key, val);
  }
  return returnUrl.toString();
}
