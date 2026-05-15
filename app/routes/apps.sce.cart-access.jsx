import prisma from "../db.server";
import {
  authenticateAppProxyRequest,
  prismaShopInClause,
  shopVariantsForLookup,
} from "../lib/app-proxy.server.js";
import { mergeProgressBarDesign } from "../lib/progress-bar-design.js";

const lastPingLogAtByShop = new Map();

/** Same list as storefront free-shipping-progress.js - minSubtotal in DB is major units; cart uses minor units. */
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

function parseDateInput(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveTierStatus(tier, now = new Date()) {
  if (!tier) return "INACTIVE";
  if (tier.active === false) return "INACTIVE";
  const start = parseDateInput(tier.scheduleStartAt);
  const end = parseDateInput(tier.scheduleEndAt);
  if (start && now < start) return "SCHEDULED";
  if (end && now > end) return "EXPIRED";
  return "ACTIVE";
}

function resolveDiscountStatus(discount, now = new Date()) {
  if (!discount) return "INACTIVE";
  const start = parseDateInput(discount.scheduleStartAt);
  const end = parseDateInput(discount.scheduleEndAt);
  if (end && now > end) return "EXPIRED";
  if (start && now < start) return "SCHEDULED";
  if (discount.active === false) return "INACTIVE";
  return "ACTIVE";
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
 * App Proxy route (storefront → your app, HMAC-verified).
 * Storefront URL: https://{shop}/apps/sce/cart-access
 *
 * Configure in shopify.app.toml [app_proxy] and run deploy / dev so Shopify registers the proxy.
 */
export const loader = async ({ request }) => {
  const { shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;
  const shopWhere = prismaShopInClause(shop);
  if (!shopWhere) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }
  const url = new URL(request.url);
  const subtotalMinor = Number(url.searchParams.get("subtotalCents") || 0);
  const currency = String(url.searchParams.get("currency") || "").trim();
  const exp = currencyExponent(currency);
  const now = new Date();
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

  const nowMs = Date.now();
  const lastLogAt = lastPingLogAtByShop.get(shop) || 0;
  if (nowMs - lastLogAt >= 10000) {
    console.info("[sce-cart-access] GET ping", { shop, at: new Date().toISOString() });
    lastPingLogAtByShop.set(shop, nowMs);
  }
  const visibleTiers = eligibleTiers
    .map((tier) => ({ ...tier, status: resolveTierStatus(tier, now) }))
    .filter((tier) => tier.status === "ACTIVE");
  let widgetDynamicConfig = {};
  try {
    const rawDynamic =
      tierWidgetSettings?.widgetDynamicConfigJson ??
      "{}";
    const parsed = JSON.parse(String(rawDynamic || "{}"));
    if (parsed && typeof parsed === "object") widgetDynamicConfig = parsed;
  } catch {
    widgetDynamicConfig = {};
  }
  const progressBarDesign = mergeProgressBarDesign(tierWidgetSettings?.progressBarDesignJson ?? "{}");

  return Response.json({
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
      tierWidgetSettings?.sequentialMsg1 ||
      "Apply discount to unlock free shipping",
    sequentialMsg2:
      tierWidgetSettings?.sequentialMsg2 ||
      "Free shipping unlocked",
    sequentialHintZero:
      tierWidgetSettings?.sequentialHintZero ||
      "Progress: 0% - unlock Tier 1 to start.",
    sequentialHintMid:
      tierWidgetSettings?.sequentialHintMid ||
      "Progress: 50% - unlock Tier 2 for free shipping.",
    tier1Icon:
      tierWidgetSettings?.tier1Icon || "%",
    tier2Icon:
      tierWidgetSettings?.tier2Icon || "🚚",
    subtotalLabel:
      tierWidgetSettings?.subtotalLabel ||
      "Current subtotal",
    estimatedShippingLabel:
      tierWidgetSettings?.estimatedShippingLabel ||
      "Estimated shipping",
    widgetBackgroundColor:
      tierWidgetSettings?.widgetBackgroundColor ||
      "#ffffff",
    widgetTextColor:
      tierWidgetSettings?.widgetTextColor ||
      "#111827",
    widgetBorderColor:
      tierWidgetSettings?.widgetBorderColor ||
      "#d1d5db",
    widgetUseCustomColors: Boolean(
      tierWidgetSettings?.widgetUseCustomColors ?? false,
    ),
    tier1LabelText:
      tierWidgetSettings?.tier1LabelText ||
      "Discount",
    tier2LabelText:
      tierWidgetSettings?.tier2LabelText ||
      "Free shipping",
    minAmountPrefixText:
      tierWidgetSettings?.minAmountPrefixText ||
      "Min.",
    showTierIcons: Boolean(
      tierWidgetSettings?.showTierIcons ?? true,
    ),
    showTierLabels: Boolean(
      tierWidgetSettings?.showTierLabels ?? true,
    ),
    showTierMinimums: Boolean(
      tierWidgetSettings?.showTierMinimums ?? true,
    ),
    widgetDynamicConfig,
    selectorTargets:
      tierWidgetSettings?.selectorTargets ||
      ".sce-free-shipping-widget, .product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
    nameTargetSelectors:
      tierWidgetSettings?.nameTargetSelectors ||
      ".sce-free-shipping-widget, .cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
    sequentialTitle:
      tierWidgetSettings?.sequentialTitle ||
      "Rewards progress",
  });
};

export const action = async ({ request }) => {
  const { session, shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const itemCount =
    typeof payload.item_count === "number" ? payload.item_count : payload.itemCount ?? null;
  const subtotalCents =
    typeof payload.items_subtotal_price === "number"
      ? payload.items_subtotal_price
      : typeof payload.subtotalCents === "number"
        ? payload.subtotalCents
        : null;
  const currency = typeof payload.currency === "string" ? payload.currency : null;
  const pathname = typeof payload.pathname === "string" ? payload.pathname : null;
  const source = typeof payload.source === "string" ? payload.source : "theme_extension";

  const line = {
    shop,
    hasSession: Boolean(session),
    itemCount,
    subtotalCents,
    currency,
    pathname,
    source,
    at: new Date().toISOString(),
  };

  console.info("[sce-cart-access] cart.js snapshot", line);

  try {
    await prisma.cartAccessLog.create({
      data: {
        shop,
        itemCount: itemCount ?? undefined,
        subtotalCents: subtotalCents ?? undefined,
        currency: currency ?? undefined,
        pathname: pathname ?? undefined,
        source: source ?? undefined,
      },
    });
  } catch (e) {
    console.error("[sce-cart-access] prisma log failed", { shop, message: e?.message });
  }

  return Response.json({ ok: true });
};
