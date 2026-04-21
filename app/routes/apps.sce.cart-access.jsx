import { authenticate } from "../shopify.server";
import prisma from "../db.server";

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
  const tierRules = await prisma.thresholdTier.findMany({
    where: { shop, active: true },
    orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
  });

  let appliedTier = null;
  if (Number.isFinite(subtotalMinor) && subtotalMinor > 0) {
    for (const tier of tierRules) {
      const tierMinor = tierMinMinorUnits(tier.minSubtotal, exp);
      if (subtotalMinor >= tierMinor) appliedTier = tier;
    }
  }

  console.info("[sce-cart-access] GET ping", { shop, at: new Date().toISOString() });
  return Response.json({
    ok: true,
    service: "sce-cart-access",
    shop,
    tiers: tierRules,
    appliedTier,
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
