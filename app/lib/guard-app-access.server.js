import { authenticate } from "../shopify.server";
import { loadShopBillingContext } from "./app-billing.server.js";
import { TRIAL_LOCK_MESSAGE } from "./subscription-state.shared.js";

/**
 * @param {Awaited<ReturnType<typeof loadShopBillingContext>>} billingPlan
 */
export function rejectIfAppLocked(billingPlan) {
  if (!billingPlan?.isAppLocked) return null;
  return {
    ok: false,
    error: TRIAL_LOCK_MESSAGE,
    appLocked: true,
    planUpgradeRequired: true,
  };
}

/**
 * Authenticates and blocks mutating requests while the shop is trial-expired locked.
 *
 * @param {Request} request
 * @param {{ allowWhenLocked?: boolean }} [options]
 */
export async function guardAppAdminMutation(request, options = {}) {
  const { session, billing, admin } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing, session.shop);
  if (!options.allowWhenLocked) {
    const blocked = rejectIfAppLocked(billingPlan);
    if (blocked) {
      return { blocked: true, response: blocked, session, billing, billingPlan, admin };
    }
  }
  return { blocked: false, session, billing, billingPlan, admin };
}
