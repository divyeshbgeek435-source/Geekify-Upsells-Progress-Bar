import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  resolveSectionHtmlIdFromHeader,
  templateRenderPayload,
} from "../lib/announcement-header-template.js";

/**
 * App proxy: GET https://{shop}/apps/sce/announcement-bar?sectionId={sectionId}
 * sectionId is required for rendering (strict ID-driven behavior).
 * Requires [app_proxy] in shopify.app.toml (subpath sce).
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  const sectionId = (url.searchParams.get("sectionId") || "").trim();

  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  let bar = null;

  if (!sectionId) {
    return Response.json(
      {
        ok: false,
        error: "missing_section_id",
        hint: "Enter a Section ID in the theme block settings (format: sce-ab-...).",
      },
      { status: 400 },
    );
  }

  const bars = await prisma.announcementHeader.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });
  for (const candidate of bars) {
    const candidateSectionId = resolveSectionHtmlIdFromHeader(candidate);
    if (candidateSectionId === sectionId) {
      bar = candidate;
      break;
    }
  }

  if (!bar) {
    return Response.json(
      {
        ok: false,
        error: "not_found",
        hint: "Check the Section ID matches an announcement in the app.",
      },
      { status: 404 },
    );
  }

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
