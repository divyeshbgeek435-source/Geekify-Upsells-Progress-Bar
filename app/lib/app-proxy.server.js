import { authenticate } from "../shopify.server";

export function normalizeProxyShop(raw) {
  return String(raw ?? "").trim();
}

/** Shopify session shop + DB row occasionally differ only by case; SQLite compares exact strings. */
export function shopVariantsForLookup(shop) {
  const s = normalizeProxyShop(shop);
  if (!s) return [];
  const lower = s.toLowerCase();
  return [...new Set([s, lower])];
}

export function prismaShopInClause(shop) {
  const shops = shopVariantsForLookup(shop);
  if (!shops.length) return undefined;
  if (shops.length === 1) return { shop: shops[0] };
  return { shop: { in: shops } };
}

const APP_PROXY_AUTH_HINT =
  "Shopify could not verify this app-proxy request. Open the storefront on your shop domain (not the app tunnel URL). Run shopify app deploy (or shopify app dev), ensure shopify.app.toml includes [app_proxy] with prefix apps and subpath sce, and that the app has the write_app_proxy scope. In Partners → App setup → App proxy, confirm URL, prefix, and subpath match this app.";

/**
 * @returns {{ session: import("@shopify/shopify-app-react-router/server").Session | null, shop: string, errorResponse: Response | null }}
 */
export async function authenticateAppProxyRequest(request) {
  try {
    const { session } = await authenticate.public.appProxy(request);
    const url = new URL(request.url);
    const shop = normalizeProxyShop(session?.shop || url.searchParams.get("shop") || "");
    return { session, shop, errorResponse: null };
  } catch (thrown) {
    if (thrown instanceof Response) {
      const st = thrown.status;
      if (st === 400 || st === 401) {
        return {
          session: null,
          shop: "",
          errorResponse: Response.json(
            { ok: false, error: "app_proxy_auth_failed", hint: APP_PROXY_AUTH_HINT },
            { status: st },
          ),
        };
      }
      return { session: null, shop: "", errorResponse: thrown };
    }
    throw thrown;
  }
}
