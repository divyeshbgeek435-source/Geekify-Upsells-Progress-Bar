import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  resolveSectionHtmlIdFromHeader,
  templateRenderPayload,
} from "../lib/announcement-header-template.js";
import { announcementSectionHtmlIdsMatch } from "../lib/announcement-section-html-id.js";

function normalizeProxyShop(raw) {
  return String(raw ?? "").trim();
}

/** Shopify session shop + DB row occasionally differ only by case; SQLite compares exact strings. */
function shopVariantsForLookup(shop) {
  const s = normalizeProxyShop(shop);
  if (!s) return [];
  const lower = s.toLowerCase();
  return [...new Set([s, lower])];
}

function normalizeIncomingSectionId(raw) {
  let s = String(raw ?? "").trim();
  try {
    if (s.includes("%")) s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  return s;
}

/**
 * App proxy: GET https://{shop}/apps/sce/announcement-bar?sectionId={sectionId}
 * sectionId is required for rendering (strict ID-driven behavior).
 * Requires [app_proxy] in shopify.app.toml (subpath sce).
 */
export const loader = async ({ request }) => {
  let session;
  try {
    const ctx = await authenticate.public.appProxy(request);
    session = ctx.session;
  } catch (thrown) {
    /** Shopify auth throws `Response` with empty body when HMAC fails - browsers then see "empty body". */
    if (thrown instanceof Response) {
      const st = thrown.status;
      if (st === 400 || st === 401) {
        return Response.json(
          {
            ok: false,
            error: "app_proxy_auth_failed",
            hint:
              "Shopify could not verify this app-proxy request (missing or invalid signature). Load the storefront from your shop domain so requests go through Shopify - do not open this URL on the app tunnel host. Run shopify app dev for local dev; in Partners → App setup → App proxy, confirm proxy URL, prefix apps, subpath sce, and API secret match this app.",
          },
          { status: st },
        );
      }
      return thrown;
    }
    throw thrown;
  }

  const url = new URL(request.url);
  const shop = normalizeProxyShop(session?.shop || url.searchParams.get("shop") || "");
  const sectionId = normalizeIncomingSectionId(url.searchParams.get("sectionId"));

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

  const shops = shopVariantsForLookup(shop);
  const bars = await prisma.announcementHeader.findMany({
    where: { shop: { in: shops } },
    orderBy: { updatedAt: "desc" },
  });
  for (const candidate of bars) {
    const candidateSectionId = resolveSectionHtmlIdFromHeader(candidate);
    if (announcementSectionHtmlIdsMatch(candidateSectionId, sectionId)) {
      bar = candidate;
      break;
    }
  }

  if (!bar) {
    bar = await prisma.announcementHeader.findFirst({
      where: { shop: { in: shops }, id: sectionId },
    });
  }

  if (!bar) {
    return Response.json(
      {
        ok: false,
        error: "not_found",
        hint:
          "No announcement matches this Section ID for this shop. Copy the exact Section ID from Announcement Bars in the app (or paste the bar's database ID). Check for extra spaces or theme preview using a different shop.",
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
