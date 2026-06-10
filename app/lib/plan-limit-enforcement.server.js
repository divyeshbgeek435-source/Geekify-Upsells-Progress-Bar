import prisma from "../db.server";
import {
  APP_PLAN_ID,
  getPlanLimits,
  isPremiumPlan,
} from "./app-plans.shared.js";
import {
  normalizePlanLimit,
  partitionItemsByPlanLimit,
} from "./plan-limit-access.shared.js";

const TIER_DISCOUNT_KIND = "TIER_DISCOUNT";

function parseTierPayload(dataJson) {
  if (!dataJson) return { tiers: [] };
  try {
    const parsed = JSON.parse(String(dataJson));
    if (!parsed || typeof parsed !== "object") return { tiers: [] };
    return {
      tiers: Array.isArray(parsed.tiers) ? parsed.tiers : [],
      ...parsed,
    };
  } catch {
    return { tiers: [] };
  }
}

/**
 * @param {string} shop
 * @param {string} discountName
 */
async function deactivateTierDiscountRecord(shop, discountName) {
  const name = String(discountName || "").trim();
  if (!name) return;

  if (typeof prisma.tierDiscount?.updateMany === "function") {
    try {
      await prisma.tierDiscount.updateMany({
        where: { shop, name },
        data: { active: false },
      });
    } catch {
      /* optional delegate */
    }
  }

  try {
    await prisma.thresholdTier.updateMany({
      where: { shop, discountName: name },
      data: { active: false },
    });
  } catch {
    /* discountName filter may be unavailable */
  }

  const row = await prisma.discount.findFirst({
    where: { shop, kind: TIER_DISCOUNT_KIND, name },
    select: { id: true, dataJson: true },
  });
  if (!row) return;

  const payload = parseTierPayload(row.dataJson);
  const nextTiers = payload.tiers.map((tier) => ({
    ...tier,
    active: false,
  }));

  await prisma.discount.update({
    where: { id: row.id },
    data: {
      active: false,
      dataJson: JSON.stringify({ ...payload, tiers: nextTiers }),
    },
  });
}

/**
 * @param {string} shop
 * @param {number | null} limit
 */
async function enforceDiscountLimits(shop, limit) {
  const cap = normalizePlanLimit(limit);
  if (cap == null) return;

  let rows = [];
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      rows = await prisma.tierDiscount.findMany({
        where: { shop },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true, name: true, createdAt: true },
      });
    } catch {
      rows = [];
    }
  }

  if (!rows.length) {
    rows = await prisma.discount.findMany({
      where: { shop, kind: TIER_DISCOUNT_KIND },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true, name: true, createdAt: true },
    });
  }

  const { locked } = partitionItemsByPlanLimit(rows, cap);
  await Promise.all(
    locked.map((row) => deactivateTierDiscountRecord(shop, row.name)),
  );
}

/**
 * @param {string} shop
 * @param {number | null} limit
 */
async function enforcePopupLimits(shop, limit) {
  const cap = normalizePlanLimit(limit);
  if (cap == null) return;

  const rows = await prisma.popupDesign.findMany({
    where: { shop },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });
  const { locked } = partitionItemsByPlanLimit(rows, cap);
  const lockedIds = locked.map((r) => r.id).filter(Boolean);
  if (!lockedIds.length) return;

  await prisma.popupDesign.updateMany({
    where: { shop, id: { in: lockedIds } },
    data: { active: false },
  });
}

/**
 * @param {string} shop
 * @param {number | null} limit
 */
async function enforceAnnouncementHeaderLimits(shop, limit) {
  const cap = normalizePlanLimit(limit);
  if (cap == null) return;

  const rows = await prisma.announcementHeader.findMany({
    where: { shop },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });
  const { locked } = partitionItemsByPlanLimit(rows, cap);
  const lockedIds = locked.map((r) => r.id).filter(Boolean);
  if (!lockedIds.length) return;

  await prisma.announcementHeader.updateMany({
    where: { shop, id: { in: lockedIds } },
    data: { active: false },
  });
}

/**
 * @param {string} shop
 * @param {number | null} limit
 */
async function enforceAnnouncementBodyLimits(shop, limit) {
  const cap = normalizePlanLimit(limit);
  if (cap == null) return;

  const rows = await prisma.announcementBody.findMany({
    where: { shop },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true },
  });
  const { locked } = partitionItemsByPlanLimit(rows, cap);
  const lockedIds = locked.map((r) => r.id).filter(Boolean);
  if (!lockedIds.length) return;

  await prisma.announcementBody.updateMany({
    where: { shop, id: { in: lockedIds } },
    data: { active: false },
  });
}

/**
 * Deactivates storefront-active flags for items beyond Free plan caps (no deletes).
 *
 * @param {string} shop
 */
export async function enforceFreePlanLimitsForShop(shop) {
  const limits = getPlanLimits(APP_PLAN_ID.FREE);
  await Promise.all([
    enforceDiscountLimits(shop, limits.maxDiscounts),
    enforcePopupLimits(shop, limits.maxPopups),
    enforceAnnouncementHeaderLimits(shop, limits.maxAnnouncementHeaders),
    enforceAnnouncementBodyLimits(shop, limits.maxAnnouncementBodies),
  ]);
}

/**
 * @param {string} shop
 * @param {string} planId
 */
export async function loadShopPlanSlots(shop, planId) {
  if (isPremiumPlan(planId)) {
    return {
      editableDiscountNames: null,
      allDiscountNames: null,
      editablePopupIds: null,
      editableAnnouncementHeaderIds: null,
      editableAnnouncementBodyIds: null,
    };
  }

  const limits = getPlanLimits(APP_PLAN_ID.FREE);

  let discountRows = [];
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      discountRows = await prisma.tierDiscount.findMany({
        where: { shop },
        orderBy: [{ createdAt: "asc" }],
        select: { name: true, createdAt: true },
      });
    } catch {
      discountRows = [];
    }
  }
  if (!discountRows.length) {
    discountRows = await prisma.discount.findMany({
      where: { shop, kind: TIER_DISCOUNT_KIND },
      orderBy: [{ createdAt: "asc" }],
      select: { name: true, createdAt: true },
    });
  }

  const [popupRows, headerRows, bodyRows] = await Promise.all([
    prisma.popupDesign.findMany({
      where: { shop },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.announcementHeader.findMany({
      where: { shop },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
    prisma.announcementBody.findMany({
      where: { shop },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    }),
  ]);

  const discountPartition = partitionItemsByPlanLimit(
    discountRows,
    limits.maxDiscounts,
  );
  const allDiscountNames = discountRows
    .map((r) => String(r.name || "").trim())
    .filter(Boolean);

  return {
    editableDiscountNames: discountPartition.allowed
      .map((r) => String(r.name || "").trim())
      .filter(Boolean),
    allDiscountNames,
    editablePopupIds: partitionItemsByPlanLimit(popupRows, limits.maxPopups)
      .allowed.map((r) => r.id)
      .filter(Boolean),
    editableAnnouncementHeaderIds: partitionItemsByPlanLimit(
      headerRows,
      limits.maxAnnouncementHeaders,
    ).allowed.map((r) => r.id).filter(Boolean),
    editableAnnouncementBodyIds: partitionItemsByPlanLimit(
      bodyRows,
      limits.maxAnnouncementBodies,
    ).allowed.map((r) => r.id).filter(Boolean),
  };
}

/**
 * @param {string} shop
 */
export async function dismissPlanDowngradeNotice(shop) {
  if (typeof prisma.shopPlanState?.upsert !== "function") return;
  await prisma.shopPlanState.upsert({
    where: { shop },
    create: {
      shop,
      lastKnownPlanId: APP_PLAN_ID.FREE,
      pendingDowngradeNotice: false,
    },
    update: { pendingDowngradeNotice: false },
  });
}

/**
 * @param {string} shop
 * @param {string} currentPlanId
 */
export async function syncShopPlanState(shop, currentPlanId) {
  const limits = getPlanLimits(currentPlanId);
  let showPlanDowngradeNotice = false;
  let planSlots = await loadShopPlanSlots(shop, currentPlanId);

  if (isPremiumPlan(currentPlanId)) {
    if (typeof prisma.shopPlanState?.upsert === "function") {
      await prisma.shopPlanState.upsert({
        where: { shop },
        create: {
          shop,
          lastKnownPlanId: APP_PLAN_ID.PREMIUM,
          pendingDowngradeNotice: false,
        },
        update: {
          lastKnownPlanId: APP_PLAN_ID.PREMIUM,
          pendingDowngradeNotice: false,
        },
      });
    }
    return { showPlanDowngradeNotice: false, planSlots, limits };
  }

  await enforceFreePlanLimitsForShop(shop);
  planSlots = await loadShopPlanSlots(shop, currentPlanId);

  if (typeof prisma.shopPlanState?.upsert !== "function") {
    return { showPlanDowngradeNotice: false, planSlots, limits };
  }

  const existing = await prisma.shopPlanState.findUnique({ where: { shop } });
  const wasPremium = existing?.lastKnownPlanId === APP_PLAN_ID.PREMIUM;

  if (wasPremium) {
    await prisma.shopPlanState.upsert({
      where: { shop },
      create: {
        shop,
        lastKnownPlanId: APP_PLAN_ID.FREE,
        pendingDowngradeNotice: true,
      },
      update: {
        lastKnownPlanId: APP_PLAN_ID.FREE,
        pendingDowngradeNotice: true,
      },
    });
    showPlanDowngradeNotice = true;
  } else {
    showPlanDowngradeNotice = Boolean(existing?.pendingDowngradeNotice);
    await prisma.shopPlanState.upsert({
      where: { shop },
      create: {
        shop,
        lastKnownPlanId: APP_PLAN_ID.FREE,
        pendingDowngradeNotice: showPlanDowngradeNotice,
      },
      update: { lastKnownPlanId: APP_PLAN_ID.FREE },
    });
  }

  return { showPlanDowngradeNotice, planSlots, limits };
}

/**
 * @param {string} planId
 * @param {{
 *   editableDiscountNames?: string[],
 *   allDiscountNames?: string[],
 *   editablePopupIds?: string[],
 *   editableAnnouncementHeaderIds?: string[],
 *   editableAnnouncementBodyIds?: string[],
 * } | null | undefined} planSlots
 * @param {{ discountName?: string, popupId?: string, announcementKind?: "header" | "body", announcementId?: string }} target
 */
export function rejectIfPlanItemLocked(planId, planSlots, target) {
  if (isPremiumPlan(planId)) return null;

  if (target.discountName) {
    const name = String(target.discountName || "").trim();
    const allowed = planSlots?.editableDiscountNames ?? [];
    const allKnown = planSlots?.allDiscountNames ?? [];
    if (name && !allowed.includes(name) && allKnown.includes(name)) {
      return {
        ok: false,
        error: PLAN_LOCKED_ITEM_MESSAGE,
        planLocked: true,
        planUpgradeRequired: true,
      };
    }
  }

  if (target.popupId) {
    const id = String(target.popupId || "").trim();
    const allowed = planSlots?.editablePopupIds ?? [];
    if (id && !allowed.includes(id)) {
      return {
        ok: false,
        error: PLAN_LOCKED_ITEM_MESSAGE,
        planLocked: true,
        planUpgradeRequired: true,
      };
    }
  }

  if (target.announcementId && target.announcementKind) {
    const id = String(target.announcementId || "").trim();
    const allowed =
      target.announcementKind === "header"
        ? planSlots?.editableAnnouncementHeaderIds ?? []
        : planSlots?.editableAnnouncementBodyIds ?? [];
    if (id && !allowed.includes(id)) {
      return {
        ok: false,
        error: PLAN_LOCKED_ITEM_MESSAGE,
        planLocked: true,
        planUpgradeRequired: true,
      };
    }
  }

  return null;
}

/**
 * @param {string} planId
 * @param {Parameters<typeof rejectIfPlanItemLocked>[1]} planSlots
 * @param {FormData} form
 * @param {{ blockActivationOnly?: boolean }} [options]
 */
export function rejectIfAnnouncementFormLocked(planId, planSlots, form, options = {}) {
  const explicit = String(form.get("recordKind") || "").trim().toLowerCase();
  let kind = "header";
  if (explicit === "body" || explicit === "header") {
    kind = explicit;
  } else {
    const intent = String(form.get("intent") || "");
    if (intent === "set_active" && form.has("rowId") && String(form.get("rowId") || "").trim()) {
      kind = "body";
    } else if (intent === "delete" && form.has("rowId") && String(form.get("rowId") || "").trim()) {
      kind = "body";
    } else if (form.has("messagesJson")) {
      kind = "body";
    }
  }

  const rowId =
    kind === "body"
      ? String(form.get("rowId") || "").trim()
      : String(form.get("id") || "").trim();
  if (!rowId) return null;

  if (options.blockActivationOnly) {
    const intent = String(form.get("intent") || "");
    const wantActive = String(form.get("active") || "") === "1";
    if (intent === "set_active" && !wantActive) return null;
  }

  return rejectIfPlanItemLocked(planId, planSlots, {
    announcementKind: kind,
    announcementId: rowId,
  });
}

// Re-export message for server actions
export { PLAN_LOCKED_ITEM_MESSAGE } from "./plan-limit-access.shared.js";
