/** Resolved shop subscription lifecycle (not the Shopify billing plan key). */
export const SUBSCRIPTION_STATE = {
  FREE: "free",
  TRIAL_ACTIVE: "trial_active",
  TRIAL_EXPIRED: "trial_expired",
  PREMIUM_ACTIVE: "premium_active",
};

export const TRIAL_LOCK_MESSAGE =
  "Your Premium free trial has ended. Choose the Free plan or upgrade to Premium to continue.";

export function subscriptionStateLabel(state) {
  switch (state) {
    case SUBSCRIPTION_STATE.PREMIUM_ACTIVE:
      return "Premium Active";
    case SUBSCRIPTION_STATE.TRIAL_ACTIVE:
      return "Trial Active";
    case SUBSCRIPTION_STATE.TRIAL_EXPIRED:
      return "Trial ended — choose a plan";
    default:
      return "Free Plan";
  }
}
