/**
 * Whether the shop has at least one ACTIVE Shopify app subscription (e.g. $2/mo plan).
 * Uses Admin API; no extra billing config in shopify.server.js required.
 */
export async function shopHasActiveAppSubscription(admin) {
  const query = `#graphql
    query AnnouncementBarSubscriptionStatus {
      currentAppInstallation {
        activeSubscriptions {
          status
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const json = await response.json();
    if (json?.errors?.length) {
      console.warn("[app-subscription] GraphQL errors", json.errors);
      return false;
    }
    const subs = json?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    return subs.some((s) => String(s?.status || "").toUpperCase() === "ACTIVE");
  } catch (e) {
    console.warn("[app-subscription] request failed", e?.message);
    return false;
  }
}
