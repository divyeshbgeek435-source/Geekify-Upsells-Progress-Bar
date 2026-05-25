import {
  normalizeStorefrontSectionId,
  resolveHeaderAnnouncementForStorefront,
} from "../lib/announcement-storefront.server.js";
import {
  authenticateAppProxyRequest,
} from "../lib/app-proxy.server.js";
import { templateRenderPayload } from "../lib/announcement-header-template.js";

/**
 * App proxy: GET https://{shop}/apps/sce/announcement-bar?sectionId={sectionId}
 * sectionId optional — when omitted, returns the single Display-on header bar.
 * When provided, the bar must exist, match the ID, and have Display on.
 */
export const loader = async ({ request }) => {
  const { shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const sectionId = normalizeStorefrontSectionId(url.searchParams.get("sectionId"));

  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  const resolved = await resolveHeaderAnnouncementForStorefront(shop, sectionId);
  if (!resolved.ok) {
    return Response.json(
      {
        ok: false,
        error: resolved.error,
        active: resolved.active ?? false,
        hint: resolved.hint,
      },
      { status: resolved.status ?? 404 },
    );
  }

  const bar = resolved.bar;
  const template = (() => {
    try {
      return JSON.parse(String(bar.templateJson || "{}"));
    } catch {
      return {};
    }
  })();
  const payload = templateRenderPayload(template, bar);

  return Response.json({
    ok: true,
    active: true,
    id: bar.id,
    sectionHtmlId: payload.sectionHtmlId,
    version: `${bar.id}:${bar.updatedAt?.toISOString?.() || ""}`,
    updatedAt: bar.updatedAt?.toISOString?.() || null,
    barType: payload.barType,
    config: payload.config,
    customHtml: payload.customHtml,
    customCss: payload.customCss,
    template,
  });
};
