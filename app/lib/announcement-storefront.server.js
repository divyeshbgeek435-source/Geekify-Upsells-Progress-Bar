import prisma from "../db.server";
import { shopVariantsForLookup } from "./app-proxy.server.js";
import { resolveSectionHtmlIdFromHeader } from "./announcement-header-template.js";
import { announcementSectionHtmlIdsMatch } from "./announcement-section-html-id.js";

export function normalizeStorefrontSectionId(raw) {
  let s = String(raw ?? "").trim();
  try {
    if (s.includes("%")) s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  return s;
}

function headerMatchesSectionId(row, sectionId) {
  const candidateSectionId = resolveSectionHtmlIdFromHeader(row);
  if (announcementSectionHtmlIdsMatch(candidateSectionId, sectionId)) return true;
  return String(row?.id || "").trim() === sectionId;
}

/**
 * Resolves a header announcement for the storefront.
 * Display toggle (`active`) is checked before treating a section ID as valid.
 */
export async function resolveHeaderAnnouncementForStorefront(shop, rawSectionId) {
  const sectionId = normalizeStorefrontSectionId(rawSectionId);
  const shops = shopVariantsForLookup(shop);

  if (!sectionId) {
    const bar = await prisma.announcementHeader.findFirst({
      where: { shop: { in: shops }, active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!bar) {
      return {
        ok: false,
        status: 404,
        error: "no_active_header",
        active: false,
        hint: "Turn on a Header / Announcement bar in the app. The theme block can leave Section ID empty to use the active bar.",
      };
    }
    return { ok: true, bar, active: true };
  }

  const bars = await prisma.announcementHeader.findMany({
    where: { shop: { in: shops } },
    orderBy: { updatedAt: "desc" },
  });

  let bar = null;
  for (const candidate of bars) {
    if (headerMatchesSectionId(candidate, sectionId)) {
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
    return {
      ok: false,
      status: 404,
      error: "not_found",
      active: false,
      hint:
        "No announcement matches this Section ID for this shop. Copy the exact Section ID from Announcement Bars in the app (or paste the bar's database ID). Check for extra spaces or theme preview using a different shop.",
    };
  }

  if (!bar.active) {
    return {
      ok: false,
      status: 404,
      error: "header_inactive",
      active: false,
      hint: "This announcement bar is turned off in the app. Enable Display to show it on the storefront.",
    };
  }

  return { ok: true, bar, active: true };
}
