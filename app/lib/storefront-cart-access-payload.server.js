import prisma from "../db.server";
import { prismaShopInClause, shopVariantsForLookup } from "./app-proxy.server.js";
import { mergeProgressBarDesign } from "./progress-bar-design.js";
import {
  resolveDiscountStatus,
  resolveTierCaptionLabels,
  resolveTierStatus,
} from "./tier-display.shared.js";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

function currencyExponent(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase();
  if (c && ZERO_DECIMAL_CURRENCIES.has(c)) return 0;
  return 2;
}

function tierMinMinorUnits(minSubtotalMajor, exp) {
  const n = Number(minSubtotalMajor || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 10 ** exp);
}

function isUnknownPrismaArgument(error, fieldName) {
  const message = String(error?.message || "");
  return message.includes(`Unknown argument \`${fieldName}\``);
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || "").toLowerCase();
  const t = String(tableName || "").toLowerCase();
  if (!t) return false;
  return (
    (message.includes("no such table") && message.includes(t)) ||
    (message.includes("relation") &&
      message.includes(t) &&
      message.includes("does not exist"))
  );
}

async function deactivateExpiredTierDiscountsForShop(shop) {
  if (typeof prisma.tierDiscount?.updateMany !== "function") return;
  const shopWhere = prismaShopInClause(shop);
  if (!shopWhere) return;
  try {
    await prisma.tierDiscount.updateMany({
      where: {
        ...shopWhere,
        active: true,
        scheduleEndAt: { lt: new Date() },
      },
      data: { active: false },
    });
  } catch (error) {
    if (!isMissingTableError(error, "TierDiscount")) throw error;
  }
}

async function loadTierWidgetSettingsForShop(shop) {
  if (!shop || typeof prisma.tierWidgetSettings?.findUnique !== "function") return null;
  const shopWhere = prismaShopInClause(shop);
  if (shopWhere && typeof prisma.tierWidgetSettings?.findMany === "function") {
    const rows = await prisma.tierWidgetSettings.findMany({ where: shopWhere, take: 1 });
    return rows[0] ?? null;
  }
  for (const variant of shopVariantsForLookup(shop)) {
    const row = await prisma.tierWidgetSettings.findUnique({ where: { shop: variant } });
    if (row) return row;
  }
  return null;
}

/**
 * Shared cart-access JSON for app proxy and shop metafield (storefront fallback when proxy 404s).
 */
export async function buildStorefrontCartAccessPayload(
  shop,
  { subtotalMinor = 0, currency = "", now = new Date() } = {},
) {
  const shopWhere = prismaShopInClause(shop);
  if (!shopWhere) {
    return { ok: false, error: "missing_shop" };
  }

  const exp = currencyExponent(currency);

  try {
    await prisma.thresholdTier.updateMany({
      where: {
        ...shopWhere,
        active: true,
        scheduleEndAt: { lt: now },
      },
      data: { active: false },
    });
  } catch (error) {
    if (!isUnknownPrismaArgument(error, "scheduleEndAt")) throw error;
  }

  await deactivateExpiredTierDiscountsForShop(shop);

  const tierRules = await prisma.thresholdTier.findMany({
    where: shopWhere,
    orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
  });

  let tierDiscounts = [];
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      tierDiscounts = await prisma.tierDiscount.findMany({
        where: shopWhere,
      });
    } catch (error) {
      if (!isMissingTableError(error, "TierDiscount")) throw error;
      tierDiscounts = [];
    }
  }

  const discountByName = new Map(
    tierDiscounts.map((discount) => [String(discount.name || "").trim(), discount]),
  );

  const eligibleTiers = tierRules.filter((tier) => {
    if (resolveTierStatus(tier, now) !== "ACTIVE") return false;
    const name = String(tier.discountName || "Default Discount").trim();
    const linked = discountByName.get(name);
    if (!linked) return false;
    return resolveDiscountStatus(linked, now) === "ACTIVE";
  });

  const tierWidgetSettings = await loadTierWidgetSettingsForShop(shop);

  let appliedTier = null;
  if (Number.isFinite(subtotalMinor) && subtotalMinor > 0) {
    for (const tier of eligibleTiers) {
      if (resolveTierStatus(tier, now) !== "ACTIVE") continue;
      const tierMinor = tierMinMinorUnits(tier.minSubtotal, exp);
      if (subtotalMinor >= tierMinor) appliedTier = tier;
    }
  }

  const visibleTiers = eligibleTiers
    .map((tier) => ({ ...tier, status: resolveTierStatus(tier, now) }))
    .filter((tier) => tier.status === "ACTIVE");

  const tierCaptionLabels = resolveTierCaptionLabels(visibleTiers);

  let widgetDynamicConfig = {};
  try {
    const rawDynamic = tierWidgetSettings?.widgetDynamicConfigJson ?? "{}";
    const parsed = JSON.parse(String(rawDynamic || "{}"));
    if (parsed && typeof parsed === "object") widgetDynamicConfig = parsed;
  } catch {
    widgetDynamicConfig = {};
  }

  const progressBarDesign = mergeProgressBarDesign(
    tierWidgetSettings?.progressBarDesignJson ?? "{}",
  );

  return {
    ok: true,
    service: "sce-cart-access",
    shop,
    tiers: visibleTiers,
    appliedTier,
    progressBarDesign,
    sequentialMsg0:
      tierWidgetSettings?.sequentialMsg0 ||
      "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
    sequentialMsg1:
      tierWidgetSettings?.sequentialMsg1 || "Apply discount to unlock free shipping",
    sequentialMsg2: tierWidgetSettings?.sequentialMsg2 || "Free shipping unlocked",
    sequentialHintZero:
      tierWidgetSettings?.sequentialHintZero ||
      "Progress: 0% - unlock Tier 1 to start.",
    sequentialHintMid:
      tierWidgetSettings?.sequentialHintMid ||
      "Progress: 50% - unlock Tier 2 for free shipping.",
    tier1Icon: tierWidgetSettings?.tier1Icon || "%",
    tier2Icon: tierWidgetSettings?.tier2Icon || "🚚",
    subtotalLabel: tierWidgetSettings?.subtotalLabel || "Current subtotal",
    estimatedShippingLabel:
      tierWidgetSettings?.estimatedShippingLabel || "Estimated shipping",
    widgetBackgroundColor: tierWidgetSettings?.widgetBackgroundColor || "#ffffff",
    widgetTextColor: tierWidgetSettings?.widgetTextColor || "#111827",
    widgetBorderColor: tierWidgetSettings?.widgetBorderColor || "#000000",
    widgetUseCustomColors: Boolean(tierWidgetSettings?.widgetUseCustomColors ?? false),
    tier1LabelText: tierCaptionLabels.tier1LabelText,
    tier2LabelText: tierCaptionLabels.tier2LabelText,
    minAmountPrefixText: tierWidgetSettings?.minAmountPrefixText || "Min.",
    showTierIcons: Boolean(tierWidgetSettings?.showTierIcons ?? true),
    showTierLabels: Boolean(tierWidgetSettings?.showTierLabels ?? true),
    showTierMinimums: Boolean(tierWidgetSettings?.showTierMinimums ?? true),
    widgetDynamicConfig,
    selectorTargets:
      tierWidgetSettings?.selectorTargets ||
      ".sce-free-shipping-widget, .product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
    nameTargetSelectors:
      tierWidgetSettings?.nameTargetSelectors ||
      ".sce-free-shipping-widget, .cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
    sequentialTitle: tierWidgetSettings?.sequentialTitle || "Rewards progress",
  };
}
