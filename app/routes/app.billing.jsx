import { useCallback } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useLocation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  APP_PLAN_ID,
  PLAN_CATALOG,
  PREMIUM_PLAN_BILLING_KEY,
  PREMIUM_PLAN_PRICE_USD,
} from "../lib/app-plans.shared.js";
import {
  billingReturnUrl,
  billingUsesTestMode,
  countShopAnnouncementBodies,
  countShopAnnouncementHeaders,
  countShopPopups,
  countShopTierDiscounts,
  loadShopBillingContext,
} from "../lib/app-billing.server.js";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const billingCtx = await loadShopBillingContext(billing, session.shop);
  const shop = session.shop;
  const [announcementHeaders, announcementBodies, popupCount, discountCount] =
    await Promise.all([
      countShopAnnouncementHeaders(shop),
      countShopAnnouncementBodies(shop),
      countShopPopups(shop),
      countShopTierDiscounts(shop),
    ]);

  return {
    ...billingCtx,
    plans: PLAN_CATALOG,
    premiumPriceUsd: PREMIUM_PLAN_PRICE_USD,
    usage: {
      announcementHeaders,
      announcementBodies,
      popupCount,
      discountCount,
    },
  };
};

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const isTest = billingUsesTestMode();

  if (intent === "subscribe") {
    return billing.request({
      plan: PREMIUM_PLAN_BILLING_KEY,
      isTest,
      returnUrl: billingReturnUrl(request),
    });
  }

  if (intent === "cancel") {
    const check = await billing.check({
      plans: [PREMIUM_PLAN_BILLING_KEY],
      isTest,
    });
    const sub = check.appSubscriptions?.[0];
    if (!sub?.id) {
      return {
        ok: false,
        error: "No active Premium subscription to cancel.",
      };
    }
    await billing.cancel({
      subscriptionId: sub.id,
      isTest,
      prorate: true,
    });
    return { ok: true, intent: "cancel", message: "Premium subscription cancelled." };
  }

  return { ok: false, error: "Unknown action." };
};

function PlanCard({ plan, currentPlanId, isPremium, premiumPriceUsd }) {
  const isCurrent = plan.id === currentPlanId;
  const isPaidPlan = plan.id === APP_PLAN_ID.PREMIUM;

  return (
    <div
      style={{
        flex: "1 1 260px",
        maxWidth: 360,
        borderRadius: 16,
        border: plan.highlighted
          ? "2px solid rgb(0 123 96)"
          : "1px solid rgba(15, 23, 42, 0.1)",
        background: plan.highlighted ? "rgb(0 123 96 / 4%)" : "#fff",
        padding: 20,
        boxShadow: plan.highlighted
          ? "0 12px 40px rgba(0, 123, 96, 0.12)"
          : "0 4px 20px rgba(15, 23, 42, 0.06)",
      }}
    >
      {plan.highlighted ? (
        <div
          style={{
            display: "inline-block",
            marginBottom: 10,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: "rgb(0 123 96)",
            color: "#fff",
          }}
        >
          Recommended
        </div>
      ) : null}
      <h2 style={{ margin: "0 0 6px", fontSize: "1.25rem", color: "#0f172a" }}>
        {plan.name}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#64748b" }}>
        {plan.description}
      </p>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a" }}>
          {plan.priceLabel}
        </span>
        <span style={{ marginLeft: 6, fontSize: "0.9rem", color: "#64748b" }}>
          {plan.intervalLabel}
        </span>
      </div>
      <ul
        style={{
          margin: "0 0 18px",
          paddingLeft: 18,
          fontSize: "0.875rem",
          color: "#334155",
          lineHeight: 1.5,
        }}
      >
        {plan.features.map((f) => (
          <li key={f} style={{ marginBottom: 6 }}>
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <s-button type="button" variant="secondary" disabled>
          Current plan
        </s-button>
      ) : isPaidPlan && !isPremium ? (
        <Form method="post">
          <input type="hidden" name="intent" value="subscribe" />
          <s-button type="submit" variant="primary">
            Upgrade to Premium - ${premiumPriceUsd}/mo
          </s-button>
        </Form>
      ) : isPaidPlan ? null : (
        <s-text tone="neutral">Default plan for all new installs</s-text>
      )}
    </div>
  );
}

export default function BillingPage() {
  const data = useLoaderData();
  const actionData = useActionData();
  const location = useLocation();

  const withShopifyParams = useCallback(
    (path) => {
      const [pathname, existingQuery = ""] = path.split("?");
      const current = new URLSearchParams(location.search);
      const keep = new URLSearchParams(existingQuery);
      for (const key of ["host", "shop"]) {
        const val = current.get(key);
        if (val && !keep.has(key)) keep.set(key, val);
      }
      const qs = keep.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [location.search],
  );

  const { planId, planName, isPremium, limits, isTest, usage, plans, premiumPriceUsd } =
    data;

  return (
    <s-page heading="Pricing & plans">
      {isTest ? (
        <s-banner tone="info" heading="Test billing mode">
          Charges are in test mode (no real card charges). Set{" "}
          <code>SHOPIFY_APP_BILLING_TEST=false</code> in production when you go live.
        </s-banner>
      ) : null}

      {actionData?.ok && actionData?.message ? (
        <s-banner tone="success" heading="Subscription updated">
          {actionData.message}
        </s-banner>
      ) : null}

      {actionData?.ok === false && actionData?.error ? (
        <s-banner tone="critical" heading="Billing action failed">
          {actionData.error}
        </s-banner>
      ) : null}

      {/* <s-section>
        <s-stack direction="block" gap="base">
          <s-text>
            You are on the <strong>{planName}</strong> plan.
            {limits.maxDiscounts != null
              ? ` Discounts: ${usage.discountCount} / ${limits.maxDiscounts}.`
              : ` Discounts: ${usage.discountCount} (unlimited).`}
            {limits.maxPopups != null
              ? ` Popups: ${usage.popupCount} / ${limits.maxPopups}.`
              : ` Popups: ${usage.popupCount} (unlimited).`}
            {limits.maxAnnouncementHeaders != null
              ? ` Headers: ${usage.announcementHeaders} / ${limits.maxAnnouncementHeaders}.`
              : ` Headers: ${usage.announcementHeaders} (unlimited).`}
            {limits.maxAnnouncementBodies != null
              ? ` Bodies: ${usage.announcementBodies} / ${limits.maxAnnouncementBodies}.`
              : ` Bodies: ${usage.announcementBodies} (unlimited).`}
          </s-text>
        </s-stack>
      </s-section> */}

      <s-section heading="Choose a plan">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={planId}
              isPremium={isPremium}
              premiumPriceUsd={premiumPriceUsd}
            />
          ))}
        </div>
      </s-section>

      {isPremium ? (
        <s-section heading="Manage subscription">
          <s-stack direction="block" gap="small">
            <s-text tone="neutral">
              Cancelling moves you back to the Free plan at the end of the current billing
              period (prorated credit may apply). Existing content stays, but new items
              above Free limits cannot be created until you upgrade again or remove extras.
            </s-text>
            <Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              <s-button type="submit" variant="secondary" tone="critical">
                Cancel Premium subscription
              </s-button>
            </Form>
          </s-stack>
        </s-section>
      ) : null}

      <s-section>
        <s-link href={withShopifyParams("/app")}>← Back to dashboard</s-link>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
