/**
 * Turns Shopify BillingError / GraphQL payloads into a single readable string.
 */
export function formatShopifyBillingFailure(err) {
  const data = err?.errorData;
  if (Array.isArray(data) && data.length) {
    const parts = data.map((e) => {
      if (!e) return null;
      if (typeof e === "object" && typeof e.message === "string") return e.message;
      if (Array.isArray(e.message)) return e.message.join(", ");
      if (typeof e.message === "object" && e.message !== null) {
        try {
          return JSON.stringify(e.message);
        } catch {
          return String(e.message);
        }
      }
      if (typeof e === "string") return e;
      try {
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    });
    const joined = parts.filter(Boolean).join(" — ");
    if (joined) return joined;
  }
  if (typeof err?.message === "string" && err.message) return err.message;
  return "Billing request failed.";
}

/**
 * Extra guidance after `billing.request` fails (append to API `detail` message).
 * Checks `detail` first for custom-app restriction, then managed-pricing style errors.
 */
export function getBillingRequestUserHint(detail) {
  const d = String(detail || "");
  if (/custom apps cannot use the billing api/i.test(d)) {
    return " This store is using a custom app install (from Settings → Apps and sales channels → Develop apps). Those installs cannot use Shopify’s Billing API. To test or sell subscriptions, install the app from the Shopify Partners Dashboard (dev store) or from the App Store after you publish it.";
  }
  if (/managed\s+app\s+pricing|managed\s+pricing|billing\s+api.*not\s+available|cannot\s+use\s+the\s+billing\s+api/i.test(d)) {
    return " For Partner-hosted apps: Partners Dashboard → your app → Pricing — turn off Managed app pricing if you need charges created in code with the Billing API.";
  }
  return "";
}
