import { useState } from "react";
import { Outlet, useLoaderData, useLocation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { getShopifyAppClientId } from "../lib/shopify-config.server";
import { authenticate } from "../shopify.server";
import {
  acknowledgePremiumTrialExpiryFreePlan,
  billingReturnUrl,
  billingUsesTestMode,
  loadShopBillingContext,
} from "../lib/app-billing.server.js";
import { PREMIUM_PLAN_BILLING_KEY } from "../lib/app-plans.shared.js";
import { syncStorefrontConfigToShopMetafield } from "../lib/storefront-config-sync.server.js";
import { dismissPlanDowngradeNotice } from "../lib/plan-limit-enforcement.server.js";
import { PlanGatedDeleteNavBridge } from "../components/plan-gated-delete.jsx";
import { PlanDowngradeNoticeModal } from "../components/plan-downgrade-notice.jsx";
import {
  AppTrialLockOverlay,
  PremiumTrialLockModal,
} from "../components/app-trial-lock.jsx";
import { guardAppAdminMutation } from "../lib/guard-app-access.server.js";
import { PlanLockedGlobalStyles } from "../components/plan-locked-visual.jsx";
import { EmailIcon } from "@shopify/polaris-icons";

const SUPPORT_EMAIL = "contact@geekwebsolution.com";
const SUPPORT_BUTTON_STYLE = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  background: "rgb(0 123 96 / 10%)",
  color: "rgb(0 123 96)",
  borderRadius: "6px",
  padding: "10px 14px",
  transition: "all 0.3s ease",
  border: "none",
};

/** Unified theme app embed (announcement + tier progress + popup). */
const STOREFRONT_EMBED_HANDLE = "smart-cart-storefront-embed";
const CART_PAGE_BLOCK_HANDLE = "free-shipping-progress-block";
const ADDITIONAL_UI_BLOCK_HANDLE = "additional-ui-block";
const ANNOUNCEMENT_BAR_BLOCK_HANDLE = "announcement-bar-block";

export const action = async ({ request }) => {
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "choose-free-plan" || intent === "subscribe") {
    const guard = await guardAppAdminMutation(request, {
      allowWhenLocked: true,
    });
    if (guard.blocked) return guard.response;
    const { session, billing, billingPlan, admin } = guard;

    if (intent === "choose-free-plan") {
      if (!billingPlan.isAppLocked) {
        return { ok: false, error: "No plan choice is required right now." };
      }
      const result = await acknowledgePremiumTrialExpiryFreePlan(session.shop);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      try {
        await syncStorefrontConfigToShopMetafield(admin, session.shop);
      } catch (e) {
        console.warn("[app] storefront unlock metafield sync failed", e?.message);
      }
      return {
        ok: true,
        intent: "choose-free-plan",
        message: "You are now on the Free plan. Premium trial features above Free limits are no longer available.",
      };
    }

    if (intent === "subscribe") {
      return billing.request({
        plan: PREMIUM_PLAN_BILLING_KEY,
        isTest: billingUsesTestMode(),
        returnUrl: billingReturnUrl(request),
      });
    }
  }

  const guard = await guardAppAdminMutation(request);
  if (guard.blocked) return guard.response;
  const { session } = guard;
  if (intent === "dismiss-plan-downgrade-notice") {
    await dismissPlanDowngradeNotice(session.shop);
    return { ok: true, intent: "dismiss-plan-downgrade-notice" };
  }
  return { ok: false, error: "Unknown action." };
};

export const loader = async ({ request }) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const billingPlan = await loadShopBillingContext(billing, shop);
  if (billingPlan.isAppLocked) {
    try {
      await syncStorefrontConfigToShopMetafield(admin, shop);
    } catch (e) {
      console.warn("[app] storefront lock metafield sync failed", e?.message);
    }
  }
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
  const isAppLocked = Boolean(billingPlan?.isAppLocked);
  const onBillingPage = location.pathname.includes("/app/billing");

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
      <AppTrialLockOverlay locked={isAppLocked && !onBillingPage} />
      <PremiumTrialLockModal
        locked={isAppLocked}
        formAction="/app"
        billingPath="/app/billing"
      />
      <s-app-nav>
        {isAppLocked ? (
          <s-link href={withShopifyParams("/app/billing")}>Pricing — choose a plan</s-link>
        ) : (
          <>
            <s-link href={withShopifyParams("/app/discounts")}>Discounts</s-link>
            <s-link href={withShopifyParams("/app/popup-design")}>Popup</s-link>
            <s-link href={withShopifyParams("/app/announcements")}>Announcements</s-link>
            <s-link href={withShopifyParams("/app/billing")}>Pricing</s-link>
          </>
        )}
      </s-app-nav>
      <div
        style={
          isAppLocked && !onBillingPage
            ? { pointerEvents: "none", opacity: 0.45, userSelect: "none" }
            : undefined
        }
        aria-hidden={isAppLocked && !onBillingPage ? true : undefined}
      >
        <Outlet context={{ onboarding, billingPlan }} />
      </div>
      {!isAppLocked ? (
        <button
          type="button"
          aria-label="Get Support"
          onClick={() => {
            window.open(
              `mailto:${SUPPORT_EMAIL}?subject=Get Support`,
              "_blank",
            );
          }}
          style={SUPPORT_BUTTON_STYLE}
        >
          <EmailIcon width={20} height={20} aria-hidden style={{ fill: "rgb(0 123 96)" }} />
          <span>Get Support</span>
        </button>
      ) : null}
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
