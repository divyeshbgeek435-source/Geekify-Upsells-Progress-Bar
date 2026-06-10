import { buildStorefrontCartAccessPayload } from "./storefront-cart-access-payload.server.js";

export const STOREFRONT_CONFIG_METAFIELD_KEY = "storefront_config";

async function ensureStorefrontConfigDefinition(admin) {
  const res = await admin.graphql(
    `#graphql
    mutation SceEnsureStorefrontConfigDefinition {
      metafieldDefinitionCreate(
        definition: {
          namespace: "$app"
          key: "${STOREFRONT_CONFIG_METAFIELD_KEY}"
          name: "SCE storefront config"
          description: "Tier progress bar config for theme embed"
          type: "json"
          ownerType: SHOP
          access: { admin: MERCHANT_READ_WRITE, storefront: PUBLIC_READ }
        }
      ) {
        createdDefinition {
          id
        }
        userErrors {
          code
          message
          field
        }
      }
    }`,
  );
  const json = await res.json();
  const userErrors = json?.data?.metafieldDefinitionCreate?.userErrors || [];
  const ignorable = userErrors.every(
    (e) =>
      String(e.message || "").toLowerCase().includes("already") ||
      String(e.code || "").includes("TAKEN"),
  );
  if (userErrors.length && !ignorable) {
    console.warn("[sce-storefront-sync] definition create", userErrors);
  }
}

/**
 * Pushes tier/widget config to a shop metafield so the theme embed can render
 * without relying on the app proxy (fixes 404 when proxy is misconfigured per store).
 */
export async function syncStorefrontConfigToShopMetafield(admin, shop) {
  if (!admin || !shop) return { ok: false, error: "missing_admin_or_shop" };

  const payload = await buildStorefrontCartAccessPayload(shop);
  if (!payload?.ok) return { ok: false, error: payload?.error || "payload_failed" };

  const shopRes = await admin.graphql(`#graphql
    query SceShopId {
      shop {
        id
      }
    }
  `);
  const shopJson = await shopRes.json();
  const shopId = shopJson?.data?.shop?.id;
  if (!shopId) {
    console.warn("[sce-storefront-sync] missing shop id", { shop, errors: shopJson?.errors });
    return { ok: false, error: "missing_shop_id" };
  }

  await ensureStorefrontConfigDefinition(admin);

  const setRes = await admin.graphql(
    `#graphql
    mutation SceSetStorefrontConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
        }
        userErrors {
          field
          message
          code
        }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: "$app",
            key: STOREFRONT_CONFIG_METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(payload),
          },
        ],
      },
    },
  );
  const setJson = await setRes.json();
  const userErrors = setJson?.data?.metafieldsSet?.userErrors || [];
  if (userErrors.length) {
    console.warn("[sce-storefront-sync] metafieldsSet userErrors", {
      shop,
      userErrors,
      graphqlErrors: setJson?.errors,
    });
    return { ok: false, error: "metafield_set_failed", userErrors };
  }

  console.info("[sce-storefront-sync] ok", {
    shop,
    storefrontEnabled: payload.storefrontEnabled !== false,
    tierCount: Array.isArray(payload.tiers) ? payload.tiers.length : 0,
  });
  return { ok: true };
}
