import { APP_PLAN_ID } from "./app-plans.shared.js";

export const FREE_PLAN_DELETE_BLOCKED_MESSAGE =
  "You are currently on the Free Plan, so deletion is not allowed. You can use limited features only. To unlock this feature, please upgrade your plan.";

export const BILLING_PLANS_PATH = "/app/billing";

/** Premium ($5/mo) shops may delete records; Free plan may not. */
export function canDeleteOnPlan(planId) {
  return planId === APP_PLAN_ID.PREMIUM;
}
