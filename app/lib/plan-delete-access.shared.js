import { APP_PLAN_ID } from "./app-plans.shared.js";

export const FREE_PLAN_DELETE_BLOCKED_MESSAGE =
  "Delete feature is not available in Free Plan. Upgrade to access it.";

/** Hover tooltip copy for disabled delete (speech bubble). */
export const FREE_PLAN_DELETE_TOOLTIP_MESSAGE = FREE_PLAN_DELETE_BLOCKED_MESSAGE;

export const BILLING_PLANS_PATH = "/app/billing";

/** Premium ($5/mo) shops may delete records; Free plan may not. */
export function canDeleteOnPlan(planId) {
  return planId === APP_PLAN_ID.PREMIUM;
}
