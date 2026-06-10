import prisma from "../db.server";
import {
  APP_PLAN_ID,
  getPremiumTrialDays,
  isPremiumPlan,
} from "./app-plans.shared.js";
import { SUBSCRIPTION_STATE } from "./subscription-state.shared.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {Date | string | null | undefined} startedAt
 * @param {Date} [now]
 */
export function premiumTrialEndsAt(startedAt, now = new Date()) {
  if (!startedAt) return null;
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + getPremiumTrialDays() * MS_PER_DAY);
}

/**
 * @param {{
 *   premiumTrialStartedAt?: Date | string | null,
 *   premiumTrialExpiredAt?: Date | string | null,
 *   pendingPremiumTrialExpiryNotice?: boolean,
 * }} state
 * @param {Date} [now]
 */
export function isPremiumTrialActive(state, now = new Date()) {
  if (!state?.premiumTrialStartedAt) return false;
  if (state.premiumTrialExpiredAt) return false;
  if (state.pendingPremiumTrialExpiryNotice) return false;
  const endsAt = premiumTrialEndsAt(state.premiumTrialStartedAt, now);
  if (!endsAt) return false;
  return now.getTime() < endsAt.getTime();
}

/**
 * @param {{
 *   premiumTrialConsumedAt?: Date | string | null,
 *   premiumTrialStartedAt?: Date | string | null,
 *   premiumTrialExpiredAt?: Date | string | null,
 *   pendingPremiumTrialExpiryNotice?: boolean,
 * }} state
 */
export function hasConsumedPremiumTrial(state) {
  return Boolean(
    state?.premiumTrialConsumedAt ||
      state?.premiumTrialStartedAt ||
      state?.premiumTrialExpiredAt ||
      state?.pendingPremiumTrialExpiryNotice,
  );
}

/**
 * Merchant cancelled an in-progress trial (cancel-trial), not clock expiry.
 * Identified by consumed trial with no start timestamp (start is cleared on cancel).
 *
 * @param {{
 *   premiumTrialConsumedAt?: Date | string | null,
 *   premiumTrialStartedAt?: Date | string | null,
 * }} state
 */
export function isVoluntaryPremiumTrialCancellation(state) {
  return Boolean(state?.premiumTrialConsumedAt && !state?.premiumTrialStartedAt);
}

/**
 * @param {{
 *   premiumTrialExpiredAt?: Date | string | null,
 *   premiumTrialStartedAt?: Date | string | null,
 *   pendingPremiumTrialExpiryNotice?: boolean,
 *   premiumTrialConsumedAt?: Date | string | null,
 * }} state
 * @param {Date} [now]
 */
export function isPremiumTrialExpired(state, now = new Date()) {
  if (!state) return false;
  if (!hasConsumedPremiumTrial(state)) return false;
  if (isVoluntaryPremiumTrialCancellation(state)) return false;
  if (state.premiumTrialExpiredAt) return true;
  if (state.pendingPremiumTrialExpiryNotice) return true;
  if (!state.premiumTrialStartedAt) return false;
  return !isPremiumTrialActive(state, now);
}

/**
 * @param {string} shop
 */
export async function loadShopPlanStateRow(shop) {
  if (typeof prisma.shopPlanState?.findUnique !== "function") return null;
  return prisma.shopPlanState.findUnique({ where: { shop } });
}

/**
 * @param {Awaited<ReturnType<typeof loadShopPlanStateRow>>} row
 */
function normalizeLegacyTrialRow(row) {
  if (!row) return row;
  const consumedAt =
    row.premiumTrialConsumedAt ??
    row.premiumTrialStartedAt ??
    (row.premiumTrialExpiredAt || row.pendingPremiumTrialExpiryNotice
      ? row.premiumTrialStartedAt
      : null);
  const expiredAt =
    row.premiumTrialExpiredAt ??
    (row.pendingPremiumTrialExpiryNotice ? row.updatedAt ?? new Date() : null);
  return {
    ...row,
    premiumTrialConsumedAt: consumedAt,
    premiumTrialExpiredAt: expiredAt,
  };
}

/**
 * @param {string} shop
 * @param {Awaited<ReturnType<typeof loadShopPlanStateRow>>} existing
 * @param {Date} [now]
 */
export async function expirePremiumTrialIfNeeded(shop, existing, now = new Date()) {
  const row = normalizeLegacyTrialRow(existing);
  if (!row?.premiumTrialStartedAt && !row?.premiumTrialConsumedAt) {
    return row;
  }
  if (isVoluntaryPremiumTrialCancellation(row)) {
    if (row.premiumTrialExpiredAt || row.pendingPremiumTrialExpiryNotice) {
      if (typeof prisma.shopPlanState?.upsert !== "function") {
        return {
          ...row,
          lastKnownPlanId: APP_PLAN_ID.FREE,
          premiumTrialExpiredAt: null,
          pendingPremiumTrialExpiryNotice: false,
        };
      }
      return prisma.shopPlanState.upsert({
        where: { shop },
        create: {
          shop,
          lastKnownPlanId: APP_PLAN_ID.FREE,
          pendingDowngradeNotice: false,
          premiumTrialConsumedAt: row.premiumTrialConsumedAt,
          premiumTrialStartedAt: null,
          premiumTrialExpiredAt: null,
          pendingPremiumTrialExpiryNotice: false,
        },
        update: {
          lastKnownPlanId: APP_PLAN_ID.FREE,
          premiumTrialExpiredAt: null,
          pendingPremiumTrialExpiryNotice: false,
        },
      });
    }
    return row;
  }
  if (isPremiumTrialActive(row, now)) {
    return row;
  }
  if (isPremiumTrialExpired(row, now) && row.premiumTrialExpiredAt) {
    return row;
  }

  const expiredAt = premiumTrialEndsAt(row.premiumTrialStartedAt, now) ?? now;

  if (typeof prisma.shopPlanState?.upsert !== "function") {
    return {
      ...row,
      premiumTrialExpiredAt: expiredAt,
      pendingPremiumTrialExpiryNotice: true,
    };
  }

  return prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: row.premiumTrialConsumedAt ?? row.premiumTrialStartedAt ?? now,
      premiumTrialStartedAt: row.premiumTrialStartedAt,
      premiumTrialExpiredAt: expiredAt,
      pendingPremiumTrialExpiryNotice: true,
    },
    update: {
      lastKnownPlanId: APP_PLAN_ID.FREE,
      premiumTrialConsumedAt: row.premiumTrialConsumedAt ?? row.premiumTrialStartedAt ?? now,
      premiumTrialExpiredAt: expiredAt,
      pendingPremiumTrialExpiryNotice: true,
    },
  });
}

/**
 * @param {string} shop
 */
export async function startPremiumTrial(shop) {
  if (typeof prisma.shopPlanState?.upsert !== "function") {
    return { ok: false, error: "Plan state is not available." };
  }

  const existing = normalizeLegacyTrialRow(await loadShopPlanStateRow(shop));
  if (hasConsumedPremiumTrial(existing)) {
    if (existing && isPremiumTrialActive(existing)) {
      return { ok: false, error: "Your Premium trial is already active." };
    }
    return {
      ok: false,
      error: "Your one-time free trial has already been used. Subscribe to Premium to continue.",
    };
  }

  const startedAt = new Date();
  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.PREMIUM,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: startedAt,
      premiumTrialStartedAt: startedAt,
      premiumTrialExpiredAt: null,
      pendingPremiumTrialExpiryNotice: false,
    },
    update: {
      lastKnownPlanId: APP_PLAN_ID.PREMIUM,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: startedAt,
      premiumTrialStartedAt: startedAt,
      premiumTrialExpiredAt: null,
      pendingPremiumTrialExpiryNotice: false,
    },
  });

  return { ok: true, startedAt, endsAt: premiumTrialEndsAt(startedAt) };
}

/**
 * Ends an in-progress Premium trial early and moves the shop to the Free plan without
 * locking the app (unlike natural trial expiry).
 *
 * @param {string} shop
 * @param {Date} [now]
 */
export async function cancelPremiumTrial(shop, now = new Date()) {
  if (typeof prisma.shopPlanState?.upsert !== "function") {
    return { ok: false, error: "Plan state is not available." };
  }

  const existing = normalizeLegacyTrialRow(await loadShopPlanStateRow(shop));
  if (!existing || !isPremiumTrialActive(existing, now)) {
    return { ok: false, error: "No active Premium trial to cancel." };
  }

  const consumedAt =
    existing.premiumTrialConsumedAt ?? existing.premiumTrialStartedAt ?? now;

  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: consumedAt,
      premiumTrialStartedAt: null,
      premiumTrialExpiredAt: null,
      pendingPremiumTrialExpiryNotice: false,
    },
    update: {
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: consumedAt,
      premiumTrialStartedAt: null,
      premiumTrialExpiredAt: null,
      pendingPremiumTrialExpiryNotice: false,
    },
  });

  return { ok: true };
}

/**
 * Merchant chose the Free plan after the Premium trial ended (clears the choice modal lock).
 *
 * @param {string} shop
 */
export async function acknowledgePremiumTrialExpiryFreePlan(shop) {
  if (typeof prisma.shopPlanState?.upsert !== "function") {
    return { ok: false, error: "Plan state is not available." };
  }

  const existing = normalizeLegacyTrialRow(await loadShopPlanStateRow(shop));
  if (!existing?.pendingPremiumTrialExpiryNotice) {
    return { ok: false, error: "No plan choice is required right now." };
  }

  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingDowngradeNotice: false,
      premiumTrialConsumedAt: existing.premiumTrialConsumedAt ?? existing.premiumTrialStartedAt,
      premiumTrialStartedAt: existing.premiumTrialStartedAt,
      premiumTrialExpiredAt: existing.premiumTrialExpiredAt,
      pendingPremiumTrialExpiryNotice: false,
    },
    update: {
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingPremiumTrialExpiryNotice: false,
    },
  });

  return { ok: true };
}

/**
 * Clears lock flags after Shopify billing is active. Trial consumption stays permanent.
 *
 * @param {string} shop
 */
export async function clearPremiumTrialOnPaidSubscription(shop) {
  if (typeof prisma.shopPlanState?.upsert !== "function") return;
  const existing = await loadShopPlanStateRow(shop);
  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.PREMIUM,
      premiumTrialConsumedAt: existing?.premiumTrialConsumedAt ?? null,
      pendingPremiumTrialExpiryNotice: false,
    },
    update: {
      lastKnownPlanId: APP_PLAN_ID.PREMIUM,
      pendingPremiumTrialExpiryNotice: false,
      premiumTrialExpiredAt: null,
    },
  });
}

/**
 * @param {boolean} hasActivePayment
 * @param {Awaited<ReturnType<typeof loadShopPlanStateRow>>} planState
 * @param {Date} [now]
 */
export function resolveSubscriptionState(hasActivePayment, planState, now = new Date()) {
  if (hasActivePayment) return SUBSCRIPTION_STATE.PREMIUM_ACTIVE;
  const row = normalizeLegacyTrialRow(planState);
  if (row && isPremiumTrialActive(row, now)) {
    return SUBSCRIPTION_STATE.TRIAL_ACTIVE;
  }
  if (row?.pendingPremiumTrialExpiryNotice) {
    return SUBSCRIPTION_STATE.TRIAL_EXPIRED;
  }
  return SUBSCRIPTION_STATE.FREE;
}

/**
 * @param {boolean} hasActivePayment
 * @param {Awaited<ReturnType<typeof loadShopPlanStateRow>>} planState
 * @param {Date} [now]
 */
export function resolveEffectivePlanId(hasActivePayment, planState, now = new Date()) {
  const state = resolveSubscriptionState(hasActivePayment, planState, now);
  if (state === SUBSCRIPTION_STATE.PREMIUM_ACTIVE || state === SUBSCRIPTION_STATE.TRIAL_ACTIVE) {
    return APP_PLAN_ID.PREMIUM;
  }
  return APP_PLAN_ID.FREE;
}

/**
 * @param {boolean} hasActivePayment
 * @param {Awaited<ReturnType<typeof loadShopPlanStateRow>>} planState
 * @param {Date} [now]
 */
export function buildPremiumTrialBillingMeta(hasActivePayment, planState, now = new Date()) {
  const row = normalizeLegacyTrialRow(planState);
  const subscriptionState = resolveSubscriptionState(hasActivePayment, row, now);
  const trialDays = getPremiumTrialDays();
  const startedAt = row?.premiumTrialStartedAt ?? null;
  const endsAt = startedAt ? premiumTrialEndsAt(startedAt, now) : null;
  const trialActive = subscriptionState === SUBSCRIPTION_STATE.TRIAL_ACTIVE;
  const trialExpired =
    subscriptionState === SUBSCRIPTION_STATE.TRIAL_EXPIRED ||
    Boolean(row?.premiumTrialExpiredAt);
  const isAppLocked = Boolean(row?.pendingPremiumTrialExpiryNotice);

  let trialDaysRemaining = null;
  if (trialActive && endsAt) {
    const msLeft = endsAt.getTime() - now.getTime();
    trialDaysRemaining = Math.max(0, Math.ceil(msLeft / MS_PER_DAY));
  }

  return {
    subscriptionState,
    trialDays,
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
    trialExpiredAt: row?.premiumTrialExpiredAt ?? null,
    trialConsumedAt: row?.premiumTrialConsumedAt ?? null,
    trialActive,
    trialExpired,
    isAppLocked,
    showPremiumTrialExpiredModal: isAppLocked,
    trialDaysRemaining,
    hasUsedPremiumTrial: hasConsumedPremiumTrial(row),
    canStartTrial:
      !hasActivePayment &&
      !hasConsumedPremiumTrial(row) &&
      subscriptionState === SUBSCRIPTION_STATE.FREE,
  };
}

export { isPremiumPlan };
