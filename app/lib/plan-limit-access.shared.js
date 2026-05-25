import { APP_PLAN_ID, getPlanLimits, isPremiumPlan } from "./app-plans.shared.js";

export const FREE_PLAN_DOWNGRADE_NOTICE_MESSAGE =
  "Your plan has changed to Free. Only limited items can be edited. Extra items will be disabled automatically based on Free plan limits.";

export const PLAN_LOCKED_ITEM_MESSAGE =
  "This item exceeds your Free plan limit and is locked. Upgrade to Premium to edit it, or use one of your allowed slots.";

/**
 * @param {unknown} limit
 * @returns {number | null}
 */
export function normalizePlanLimit(limit) {
  if (limit == null) return null;
  const n = Number(limit);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * First `limit` items stay editable; the rest are locked (no deletes).
 *
 * @template {{ id?: string, createdAt?: Date | string | number }} T
 * @param {T[]} items sorted oldest-first
 * @param {number | null} limit
 */
export function partitionItemsByPlanLimit(items, limit) {
  const cap = normalizePlanLimit(limit);
  if (cap == null) {
    return {
      allowed: items.slice(),
      locked: [],
      editableIds: new Set(items.map((item) => String(item?.id ?? "")).filter(Boolean)),
    };
  }
  const allowed = items.slice(0, cap);
  const locked = items.slice(cap);
  return {
    allowed,
    locked,
    editableIds: new Set(allowed.map((item) => String(item?.id ?? "")).filter(Boolean)),
  };
}

/**
 * @param {string} planId
 * @param {number | null} limit
 * @param {number} index zero-based position in oldest-first list
 */
export function isWithinPlanLimitIndex(planId, limit, index) {
  if (isPremiumPlan(planId)) return true;
  const cap = normalizePlanLimit(limit);
  if (cap == null) return true;
  return index >= 0 && index < cap;
}

/**
 * @param {string} planId
 * @param {import("./app-plans.shared.js").PLAN_LIMITS[typeof APP_PLAN_ID.FREE]} limits
 * @param {{ editableDiscountNames?: string[], editablePopupIds?: string[], editableAnnouncementHeaderIds?: string[], editableAnnouncementBodyIds?: string[] } | null | undefined} planSlots
 */
export function buildPlanAccess(planId, limits, planSlots) {
  if (isPremiumPlan(planId)) {
    return {
      isPremium: true,
      limits,
      slots: planSlots ?? null,
      allEditable: true,
    };
  }
  return {
    isPremium: false,
    limits: getPlanLimits(APP_PLAN_ID.FREE),
    slots: planSlots ?? {
      editableDiscountNames: [],
      editablePopupIds: [],
      editableAnnouncementHeaderIds: [],
      editableAnnouncementBodyIds: [],
    },
    allEditable: false,
  };
}

/**
 * @param {string} planId
 * @param {string} discountName
 * @param {{ editableDiscountNames?: string[] } | null | undefined} planSlots
 */
export function isDiscountEditableOnPlan(planId, discountName, planSlots) {
  if (isPremiumPlan(planId)) return true;
  const name = String(discountName || "").trim();
  if (!name) return false;
  const allowed = planSlots?.editableDiscountNames ?? [];
  return allowed.includes(name);
}

/**
 * @param {string} planId
 * @param {string} popupId
 * @param {{ editablePopupIds?: string[] } | null | undefined} planSlots
 */
export function isPopupEditableOnPlan(planId, popupId, planSlots) {
  if (isPremiumPlan(planId)) return true;
  const id = String(popupId || "").trim();
  if (!id) return false;
  return (planSlots?.editablePopupIds ?? []).includes(id);
}

/**
 * @param {string} planId
 * @param {"header" | "body"} kind
 * @param {string} rowId
 * @param {{ editableAnnouncementHeaderIds?: string[], editableAnnouncementBodyIds?: string[] } | null | undefined} planSlots
 */
export function isAnnouncementEditableOnPlan(planId, kind, rowId, planSlots) {
  if (isPremiumPlan(planId)) return true;
  const id = String(rowId || "").trim();
  if (!id) return false;
  if (kind === "header") {
    return (planSlots?.editableAnnouncementHeaderIds ?? []).includes(id);
  }
  return (planSlots?.editableAnnouncementBodyIds ?? []).includes(id);
}
