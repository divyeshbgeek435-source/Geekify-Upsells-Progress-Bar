import { useState } from "react";
import { Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { getShopifyAppClientId } from "../lib/shopify-config.server";
import { authenticate } from "../shopify.server";
import { loadShopBillingContext } from "../lib/app-billing.server.js";
import { dismissPlanDowngradeNotice } from "../lib/plan-limit-enforcement.server.js";
import { PlanGatedDeleteNavBridge } from "../components/plan-gated-delete.jsx";
import { PlanDowngradeNoticeModal } from "../components/plan-downgrade-notice.jsx";
import { PlanLockedGlobalStyles } from "../components/plan-locked-visual.jsx";

/** Unified theme app embed (announcement + tier progress + popup). */
const STOREFRONT_EMBED_HANDLE = "smart-cart-storefront-embed";
const CART_PAGE_BLOCK_HANDLE = "free-shipping-progress-block";
const ADDITIONAL_UI_BLOCK_HANDLE = "additional-ui-block";
const ANNOUNCEMENT_BAR_BLOCK_HANDLE = "announcement-bar-block";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  if (String(form.get("intent") || "") === "dismiss-plan-downgrade-notice") {
    await dismissPlanDowngradeNotice(session.shop);
    return { ok: true, intent: "dismiss-plan-downgrade-notice" };
  }
  return { ok: false, error: "Unknown action." };
};

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const billingPlan = await loadShopBillingContext(billing, shop);
  const storeHandle = shop.replace(/\.myshopify\.com$/i, "");

  const clientId = getShopifyAppClientId();
  const apiKeyForBridge =
    process.env.SHOPIFY_API_KEY?.trim() || clientId;

  const storefrontEmbedQuery = new URLSearchParams({
    context: "apps",
    activateAppId: `${clientId}/${STOREFRONT_EMBED_HANDLE}`,
  });
  const cartBlockQuery = new URLSearchParams({
    template: "cart",
    addAppBlockId: `${clientId}/${CART_PAGE_BLOCK_HANDLE}`,
    target: "newAppsSection",
  });
  const additionalUiBlockQuery = new URLSearchParams({
    addAppBlockId: `${clientId}/${ADDITIONAL_UI_BLOCK_HANDLE}`,
    target: "newAppsSection",
  });
  const announcementBarBlockHeaderQuery = new URLSearchParams({
    template: "index",
    addAppBlockId: `${clientId}/${ANNOUNCEMENT_BAR_BLOCK_HANDLE}`,
    target: "sectionGroup:header",
  });

  const editorBase = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`;

  const onboarding = {
    shop,
    storeHandle,
    clientIdConfigured: Boolean(clientId),
    appEmbedEditorUrl: `${editorBase}?${storefrontEmbedQuery.toString()}`,
    cartBlockEditorUrl: `${editorBase}?${cartBlockQuery.toString()}`,
    additionalUiBlockEditorUrl: `${editorBase}?${additionalUiBlockQuery.toString()}`,
    popupDesignEmbedEditorUrl: `${editorBase}?${storefrontEmbedQuery.toString()}`,
    announcementBarEmbedEditorUrl: `${editorBase}?${storefrontEmbedQuery.toString()}`,
    announcementBarBlockHeaderUrl: `${editorBase}?${announcementBarBlockHeaderQuery.toString()}`,
    legacyAppEmbedUrl: `https://${shop}/admin/themes/current/editor?${storefrontEmbedQuery.toString()}`,
    legacyCartBlockUrl: `https://${shop}/admin/themes/current/editor?${cartBlockQuery.toString()}`,
    legacyAdditionalUiBlockUrl: `https://${shop}/admin/themes/current/editor?${additionalUiBlockQuery.toString()}`,
    legacyPopupDesignEmbedUrl: `https://${shop}/admin/themes/current/editor?${storefrontEmbedQuery.toString()}`,
    legacyAnnouncementBarEmbedUrl: `https://${shop}/admin/themes/current/editor?${storefrontEmbedQuery.toString()}`,
    legacyAnnouncementBarBlockHeaderUrl: `https://${shop}/admin/themes/current/editor?${announcementBarBlockHeaderQuery.toString()}`,
    storefrontEmbedHandle: STOREFRONT_EMBED_HANDLE,
    appEmbedHandle: STOREFRONT_EMBED_HANDLE,
    cartBlockHandle: CART_PAGE_BLOCK_HANDLE,
    additionalUiBlockHandle: ADDITIONAL_UI_BLOCK_HANDLE,
    popupDesignEmbedHandle: STOREFRONT_EMBED_HANDLE,
    announcementBarEmbedHandle: STOREFRONT_EMBED_HANDLE,
    announcementBarBlockHandle: ANNOUNCEMENT_BAR_BLOCK_HANDLE,
  };

  return { apiKey: apiKeyForBridge, onboarding, billingPlan };
};

export default function App() {
  const { apiKey, onboarding, billingPlan } = useLoaderData();
  const location = useLocation();
  const [downgradeNoticeDismissed, setDowngradeNoticeDismissed] = useState(false);
  const showPlanDowngradeNotice =
    Boolean(billingPlan?.showPlanDowngradeNotice) && !downgradeNoticeDismissed;

  const withShopifyParams = (path) => {
    const [pathname, existingQuery = ""] = path.split("?");
    const current = new URLSearchParams(location.search);
    const keep = new URLSearchParams(existingQuery);
    for (const key of ["host", "shop"]) {
      const val = current.get(key);
      if (val && !keep.has(key)) keep.set(key, val);
    }
    const qs = keep.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PlanLockedGlobalStyles />
      <PlanGatedDeleteNavBridge />
      <PlanDowngradeNoticeModal
        open={showPlanDowngradeNotice}
        onDismiss={() => setDowngradeNoticeDismissed(true)}
      />
      <s-app-nav> 
      <s-link href={withShopifyParams("/app/discounts")}>Discounts</s-link>
      <s-link href={withShopifyParams("/app/popup-design")}>Popup</s-link> 
      <s-link href={withShopifyParams("/app/announcements")}>Announcements</s-link>
      <s-link href={withShopifyParams("/app/billing")}>Pricing</s-link>
      </s-app-nav>
      <Outlet context={{ onboarding, billingPlan }} />
    </AppProvider>
  );
}
// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
