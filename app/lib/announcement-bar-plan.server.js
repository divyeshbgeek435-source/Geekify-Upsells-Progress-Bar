import prisma from "../db.server";
import { shopHasActiveAppSubscription } from "./app-subscription.server.js";
import {
  FREE_PLAN_ANNOUNCEMENT_BAR_LIMIT,
  PAID_MONTHLY_PLAN_KEY,
  STOREFRONT_ANNOUNCEMENT_BAR_TYPES,
} from "./announcement-bar-plan.shared.js";

const storefrontBarsWhere = { barType: { in: STOREFRONT_ANNOUNCEMENT_BAR_TYPES } };

async function resolveHasPaidPlan(billing, admin) {
  if (billing) {
    try {
      const check = await billing.check({ plans: [PAID_MONTHLY_PLAN_KEY] });
      return Boolean(check?.hasActivePayment);
    } catch (e) {
      console.warn("[announcement-bar-plan] billing.check failed", e?.message);
    }
  }
  return shopHasActiveAppSubscription(admin);
}

export async function getAnnouncementBarsPlanGate({ admin, billing, shop }) {
  const [storefrontBarCount, hasPaidPlan] = await Promise.all([
    prisma.announcementBar.count({ where: { shop, ...storefrontBarsWhere } }),
    resolveHasPaidPlan(billing, admin),
  ]);
  const atFreeTierLimit = storefrontBarCount >= FREE_PLAN_ANNOUNCEMENT_BAR_LIMIT;
  const canCreateStorefrontBar = hasPaidPlan || !atFreeTierLimit;
  return {
    storefrontBarCount,
    hasPaidPlan,
    atFreeTierLimit,
    canCreateStorefrontBar,
  };
}

export function listStorefrontAnnouncementBarsQuery(shop) {
  return {
    where: { shop, ...storefrontBarsWhere },
    orderBy: { updatedAt: "desc" },
  };
}
