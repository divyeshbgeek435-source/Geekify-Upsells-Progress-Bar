import prisma from "../db.server";
import {
  APP_PLAN_ID,
  PREMIUM_PLAN_BILLING_KEY,
  getPlanLimits,
  planDisplayName,
} from "./app-plans.shared.js";

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
 */
export async function loadShopBillingContext(billing) {
  const isTest = billingUsesTestMode();
  const check = await billing.check({
    plans: [PREMIUM_PLAN_BILLING_KEY],
    isTest,
  });
  const planId = check.hasActivePayment ? APP_PLAN_ID.PREMIUM : APP_PLAN_ID.FREE;
  const limits = getPlanLimits(planId);
  const activeSubscription = check.appSubscriptions?.[0] ?? null;

  return {
    planId,
    planName: planDisplayName(planId),
    isPremium: planId === APP_PLAN_ID.PREMIUM,
    limits,
    isTest,
    hasActivePayment: check.hasActivePayment,
    appSubscriptions: check.appSubscriptions ?? [],
    activeSubscription,
  };
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
  if (typeof prisma.tierDiscount?.count === "function") {
    try {
      return await prisma.tierDiscount.count({ where: { shop } });
    } catch {
      /* fall through */
    }
  }
  const tiers = await prisma.thresholdTier.findMany({
    where: { shop },
    select: { discountName: true },
  });
  return new Set(tiers.map((t) => String(t.discountName || "").trim()).filter(Boolean)).size;
}

function upgradeMessage(resourceLabel, limit) {
  return `Your ${planDisplayName(APP_PLAN_ID.FREE)} plan allows up to ${limit} ${resourceLabel}. Upgrade to Premium for unlimited ${resourceLabel}.`;
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
