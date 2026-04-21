import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseConfig } from "../lib/announcement-bar-config.js";
import { renderAnnouncementLiquid } from "../utils/announcementLiquid";

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

  const bars = await prisma.announcementBar.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });
  for (const candidate of bars) {
    const cfg = parseConfig(candidate.configJson);
    const candidateSectionId = String(cfg.sectionHtmlId || `sce-ab-${candidate.id}`).trim();
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

  const cfg = parseConfig(bar.configJson);
  const storedSectionId = String(cfg.sectionHtmlId ?? "").trim();
  const sectionHtmlId = storedSectionId || `sce-ab-${bar.id}`;
  const config = { ...cfg };
  delete config.sectionHtmlId;

  const liquidSrc = String(bar.customLiquid ?? "").trim();
  let customHtml = bar.customHtml ?? "";
  if (liquidSrc) {
    try {
      const rendered = await renderAnnouncementLiquid(liquidSrc, shop);
      if (String(rendered ?? "").trim()) customHtml = rendered;
    } catch {
      /* keep stored customHtml on template error */
    }
  }

  return Response.json({
    ok: true,
    id: bar.id,
    sectionHtmlId,
    version: `${bar.id}:${bar.updatedAt?.toISOString?.() || ""}`,
    updatedAt: bar.updatedAt?.toISOString?.() || null,
    barType: bar.barType,
    config,
    customHtml,
    customCss: bar.customCss ?? "",
  });
};
