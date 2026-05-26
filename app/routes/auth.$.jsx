import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { syncStorefrontConfigToShopMetafield } from "../lib/storefront-config-sync.server.js";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  if (admin && session?.shop) {
    try {
      await syncStorefrontConfigToShopMetafield(admin, session.shop);
    } catch (error) {
      console.warn("[sce-storefront-sync] auth sync failed", {
        shop: session.shop,
        message: error?.message || String(error),
      });
    }
  }

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
