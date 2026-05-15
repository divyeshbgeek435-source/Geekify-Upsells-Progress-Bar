import { authenticateAppProxyRequest } from "../lib/app-proxy.server.js";

/**
 * App proxy health check: GET https://{shop}/apps/sce/health
 * Use from the storefront (browser) or curl on the shop domain to confirm the proxy reaches this app.
 */
export const loader = async ({ request }) => {
  const { session, shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;

  return Response.json({
    ok: true,
    service: "sce-health",
    shop,
    proxyVerified: true,
    hasSession: Boolean(session),
    at: new Date().toISOString(),
  });
};
