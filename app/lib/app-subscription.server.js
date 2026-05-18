import { APP_PLAN_ID } from "./app-plans.shared.js";

/**
 * Whether the shop has an active Premium app subscription ($5/mo).
 * Prefer `loadShopBillingContext(billing)` when you have the billing helper from authenticate.
 */
export async function shopHasActiveAppSubscription(admin) {
  const query = `#graphql
    query AppPremiumSubscriptionStatus {
      currentAppInstallation {
        activeSubscriptions {
          name
          status
          test
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const json = await response.json();
    if (json?.errors?.length) {
      console.warn("[app-subscription] GraphQL errors", json.errors);
      return false;
    }
    const subs = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    return subs.some((s) => String(s?.status || "").toUpperCase() === "ACTIVE");
  } catch (e) {
    console.warn("[app-subscription] request failed", e?.message);
    return false;
  }
}

/** @deprecated Use resolveShopAppPlan / loadShopBillingContext */
export async function shopPlanIdFromAdmin(admin) {
  const isPremium = await shopHasActiveAppSubscription(admin);
  return isPremium ? APP_PLAN_ID.PREMIUM : APP_PLAN_ID.FREE;
}
