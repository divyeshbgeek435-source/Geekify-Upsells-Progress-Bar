import { Liquid } from "liquidjs";

const engine = new Liquid({
  strictVariables: false,
  strictFilters: false,
});

/**
 * Minimal `shop` drop for merchant templates (not full Shopify Liquid).
 * Use in the app admin preview and in the app-proxy JSON response.
 */
export function shopLiquidScope(shopDomain) {
  const d = String(shopDomain || "").trim();
  const handle = d.replace(/\.myshopify\.com$/i, "") || d || "shop";
  return {
    shop: {
      name: handle,
      domain: d,
      permanent_domain: d,
      myshopify_domain: d,
      url: d ? `https://${d}` : "",
    },
  };
}

export async function renderAnnouncementLiquid(template, shopDomain) {
  const t = String(template || "").trim();
  if (!t) return "";
  return engine.parseAndRender(t, shopLiquidScope(shopDomain));
}
