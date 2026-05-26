import prisma from "../db.server";
import { authenticateAppProxyRequest } from "../lib/app-proxy.server.js";
import { buildStorefrontCartAccessPayload } from "../lib/storefront-cart-access-payload.server.js";

const lastPingLogAtByShop = new Map();

/**
 * App Proxy route (storefront → your app, HMAC-verified).
 * Storefront URL: https://{shop}/apps/sce/cart-access
 *
 * Configure in shopify.app.toml [app_proxy] and run deploy / dev so Shopify registers the proxy.
 */
export const loader = async ({ request }) => {
  const { shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const subtotalMinor = Number(url.searchParams.get("subtotalCents") || 0);
  const currency = String(url.searchParams.get("currency") || "").trim();

  const payload = await buildStorefrontCartAccessPayload(shop, {
    subtotalMinor,
    currency,
  });

  if (!payload.ok) {
    return Response.json(payload, { status: 400 });
  }

  const nowMs = Date.now();
  const lastLogAt = lastPingLogAtByShop.get(shop) || 0;
  if (nowMs - lastLogAt >= 10000) {
    console.info("[sce-cart-access] GET ping", { shop, at: new Date().toISOString() });
    lastPingLogAtByShop.set(shop, nowMs);
  }

  return Response.json(payload);
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
