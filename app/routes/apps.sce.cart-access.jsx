import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const lastPingLogAtByShop = new Map();

/** Same list as storefront free-shipping-progress.js — minSubtotal in DB is major units; cart uses minor units. */
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
  const hasSchedule = Boolean(start || end);
  if (hasSchedule) {
    if (end && now > end) return "EXPIRED";
    if (start && now < start) return "SCHEDULED";
    return "ACTIVE";
  }
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

/**
 * App Proxy route (storefront → your app, HMAC-verified).
 * Storefront URL: https://{shop}/apps/sce/cart-access
 *
 * Configure in shopify.app.toml [app_proxy] and run deploy / dev so Shopify registers the proxy.
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop || url.searchParams.get("shop") || "";
  const subtotalMinor = Number(url.searchParams.get("subtotalCents") || 0);
  const currency = String(url.searchParams.get("currency") || "").trim();
  const exp = currencyExponent(currency);
  const now = new Date();
  try {
    await prisma.thresholdTier.updateMany({
      where: {
        shop,
        active: true,
        scheduleEndAt: { lt: now },
      },
      data: { active: false },
    });
  } catch (error) {
    if (!isUnknownPrismaArgument(error, "scheduleEndAt")) throw error;
  }
  const tierRules = await prisma.thresholdTier.findMany({
    where: { shop },
    orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
  });
  let tierDiscounts = [];
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      tierDiscounts = await prisma.tierDiscount.findMany({
        where: { shop },
      });
    } catch (error) {
      if (!isMissingTableError(error, "TierDiscount")) throw error;
      tierDiscounts = [];
    }
  }
  const activeDiscountNames = new Set(
    tierDiscounts
      .filter((discount) => resolveDiscountStatus(discount, now) === "ACTIVE")
      .map((discount) => String(discount.name || "").trim()),
  );
  const eligibleTiers =
    tierDiscounts.length > 0
      ? tierRules.filter((tier) =>
          activeDiscountNames.has(String(tier.discountName || "").trim()),
        )
      : tierRules;
  const tierWidgetSettings =
    shop && typeof prisma.tierWidgetSettings?.findUnique === "function"
      ? await prisma.tierWidgetSettings.findUnique({
          where: { shop },
        })
      : null;
  let rawWidgetSettings = null;
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        sequentialMsg0,
        sequentialMsg1,
        sequentialMsg2,
        sequentialHintZero,
        sequentialHintMid,
        tier1Icon,
        tier2Icon,
        subtotalLabel,
        estimatedShippingLabel,
        widgetBackgroundColor,
        widgetTextColor,
        widgetBorderColor,
        widgetUseCustomColors,
        tier1LabelText,
        tier2LabelText,
        minAmountPrefixText,
        showTierIcons,
        showTierLabels,
        showTierMinimums,
        widgetDynamicConfigJson,
        selectorTargets,
        nameTargetSelectors,
        sequentialTitle
      FROM "TierWidgetSettings"
      WHERE shop = ${shop}
      LIMIT 1
    `;
    rawWidgetSettings = Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    rawWidgetSettings = null;
  }

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
      rawWidgetSettings?.widgetDynamicConfigJson ??
      tierWidgetSettings?.widgetDynamicConfigJson ??
      "{}";
    const parsed = JSON.parse(String(rawDynamic || "{}"));
    if (parsed && typeof parsed === "object") widgetDynamicConfig = parsed;
  } catch {
    widgetDynamicConfig = {};
  }
  return Response.json({
    ok: true,
    service: "sce-cart-access",
    shop,
    tiers: visibleTiers,
    appliedTier,
    sequentialMsg0:
      rawWidgetSettings?.sequentialMsg0 ||
      tierWidgetSettings?.sequentialMsg0 ||
      "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
    sequentialMsg1:
      rawWidgetSettings?.sequentialMsg1 ||
      tierWidgetSettings?.sequentialMsg1 ||
      "Apply discount to unlock free shipping",
    sequentialMsg2:
      rawWidgetSettings?.sequentialMsg2 ||
      tierWidgetSettings?.sequentialMsg2 ||
      "Free shipping unlocked",
    sequentialHintZero:
      rawWidgetSettings?.sequentialHintZero ||
      tierWidgetSettings?.sequentialHintZero ||
      "Progress: 0% — unlock Tier 1 to start.",
    sequentialHintMid:
      rawWidgetSettings?.sequentialHintMid ||
      tierWidgetSettings?.sequentialHintMid ||
      "Progress: 50% — unlock Tier 2 for free shipping.",
    tier1Icon:
      rawWidgetSettings?.tier1Icon || tierWidgetSettings?.tier1Icon || "%",
    tier2Icon:
      rawWidgetSettings?.tier2Icon || tierWidgetSettings?.tier2Icon || "🚚",
    subtotalLabel:
      rawWidgetSettings?.subtotalLabel ||
      tierWidgetSettings?.subtotalLabel ||
      "Current subtotal",
    estimatedShippingLabel:
      rawWidgetSettings?.estimatedShippingLabel ||
      tierWidgetSettings?.estimatedShippingLabel ||
      "Estimated shipping",
    widgetBackgroundColor:
      rawWidgetSettings?.widgetBackgroundColor ||
      tierWidgetSettings?.widgetBackgroundColor ||
      "#ffffff",
    widgetTextColor:
      rawWidgetSettings?.widgetTextColor ||
      tierWidgetSettings?.widgetTextColor ||
      "#111827",
    widgetBorderColor:
      rawWidgetSettings?.widgetBorderColor ||
      tierWidgetSettings?.widgetBorderColor ||
      "#d1d5db",
    widgetUseCustomColors: Boolean(
      rawWidgetSettings?.widgetUseCustomColors ?? tierWidgetSettings?.widgetUseCustomColors ?? false,
    ),
    tier1LabelText:
      rawWidgetSettings?.tier1LabelText ||
      tierWidgetSettings?.tier1LabelText ||
      "Discount",
    tier2LabelText:
      rawWidgetSettings?.tier2LabelText ||
      tierWidgetSettings?.tier2LabelText ||
      "Free shipping",
    minAmountPrefixText:
      rawWidgetSettings?.minAmountPrefixText ||
      tierWidgetSettings?.minAmountPrefixText ||
      "Min.",
    showTierIcons: Boolean(
      rawWidgetSettings?.showTierIcons ?? tierWidgetSettings?.showTierIcons ?? true,
    ),
    showTierLabels: Boolean(
      rawWidgetSettings?.showTierLabels ?? tierWidgetSettings?.showTierLabels ?? true,
    ),
    showTierMinimums: Boolean(
      rawWidgetSettings?.showTierMinimums ?? tierWidgetSettings?.showTierMinimums ?? true,
    ),
    widgetDynamicConfig,
    selectorTargets:
      rawWidgetSettings?.selectorTargets ||
      tierWidgetSettings?.selectorTargets ||
      ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
    nameTargetSelectors:
      rawWidgetSettings?.nameTargetSelectors ||
      tierWidgetSettings?.nameTargetSelectors ||
      ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
    sequentialTitle:
      rawWidgetSettings?.sequentialTitle ||
      tierWidgetSettings?.sequentialTitle ||
      "Rewards progress",
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = session?.shop || url.searchParams.get("shop") || "";

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
