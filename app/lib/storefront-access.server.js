import {
  buildPremiumTrialBillingMeta,
  expirePremiumTrialIfNeeded,
  loadShopPlanStateRow,
  resolveSubscriptionState,
} from "./premium-trial.server.js";
import { SUBSCRIPTION_STATE } from "./subscription-state.shared.js";
import prisma from "../db.server";

/** Cached Shopify billing flag on ShopPlanState (updated when admin billing is checked). */
export async function syncShopPremiumSubscriptionFlag(shop, hasActivePayment) {
  if (typeof prisma.shopPlanState?.upsert !== "function") return;
  const active = Boolean(hasActivePayment);
  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      premiumSubscriptionActive: active,
      lastKnownPlanId: active ? "premium" : "free",
    },
    update: { premiumSubscriptionActive: active },
  });
}

/**
 * Storefront + app-proxy access (no Shopify billing API — uses DB subscription flag).
 *
 * @param {string} shop
 * @param {Date} [now]
 */
export async function resolveStorefrontAccessContext(shop, now = new Date()) {
  let planState = await loadShopPlanStateRow(shop);
  planState = await expirePremiumTrialIfNeeded(shop, planState);
  const hasActivePayment = Boolean(planState?.premiumSubscriptionActive);
  const subscriptionState = resolveSubscriptionState(hasActivePayment, planState, now);
  const premiumTrial = buildPremiumTrialBillingMeta(hasActivePayment, planState, now);
  const storefrontEnabled = subscriptionState !== SUBSCRIPTION_STATE.TRIAL_EXPIRED;

  return {
    storefrontEnabled,
    subscriptionState,
    isAppLocked: !storefrontEnabled,
    hasActivePayment,
    premiumTrial,
    planState,
  };
}

/**
 * JSON returned to theme scripts and shop metafield when the trial expired.
 *
 * @param {string} shop
 * @param {string} [subscriptionState]
 */
export function buildStorefrontDisabledPayload(
  shop,
  subscriptionState = SUBSCRIPTION_STATE.TRIAL_EXPIRED,
) {
  return {
    ok: true,
    storefrontEnabled: false,
    disabledReason: "trial_expired",
    subscriptionState,
    shop,
    service: "sce-cart-access",
    tiers: [],
    appliedTier: null,
    progressBarDesign: {},
    widgetDynamicConfig: {},
  };
}

/**
 * @param {unknown} payload
 */
export function isStorefrontPayloadDisabled(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      payload.ok === true &&
      payload.storefrontEnabled === false,
  );
}

/**
 * Standard app-proxy JSON when storefront is locked.
 *
 * @param {string} shop
 */
export async function storefrontDisabledProxyResponse(shop) {
  const ctx = await resolveStorefrontAccessContext(shop);
  if (ctx.storefrontEnabled) return null;
  return Response.json(buildStorefrontDisabledPayload(shop, ctx.subscriptionState), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
