/**
 * Storefront + server: popup page targeting (3 modes only, mutually exclusive).
 * - all: every page
 * - home: Shopify homepage (index OR "/")
 * - exact: strict pathname match only
 */

import { parsePopupDesignConfig } from "./popup-design-config.js";

export const POPUP_PAGE_TARGETS = ["all", "home", "exact"];
const VALID_TARGETS = new Set(POPUP_PAGE_TARGETS);

export const POPUP_ACTIVE_TARGET_CONFLICT_MESSAGE =
  "A popup is already active for this targeting option.";

/** Normalize URL path safely */
export function normalizePathname(raw) {
  let path = String(raw || "/").trim() || "/";

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* keep raw path */
    }
  }

  path = path.split("?")[0].split("#")[0].toLowerCase();

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");

  return path || "/";
}

/** Detect homepage more reliably */
function isHome(path, pageType) {
  const normalized = normalizePathname(path);

  return (
    pageType === "index" ||
    normalized === "/" ||
    normalized === ""
  );
}

/** Normalize target type */
export function normalizePopupPageTarget(raw) {
  const t = String(raw || "all").trim();
  if (VALID_TARGETS.has(t)) return t;
  if (t === "url" || t === "custom") return "exact";
  return "all";
}

/** Get exact URL */
export function getExactPageUrl(cfg) {
  return normalizePathname(cfg?.exactPageUrl || cfg?.customPathContains || "");
}

/** Authoritative targeting fields for storefront (from parsed configJson only). */
export function resolveStorefrontTargeting(cfg) {
  const pageTarget = normalizePopupPageTarget(cfg?.pageTarget);
  const exactPageUrl = pageTarget === "exact" ? getExactPageUrl(cfg) : "";
  return { pageTarget, exactPageUrl };
}

function stripOptionalLocalePrefix(pathnameNorm) {
  const path = normalizePathname(pathnameNorm);
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 1 && /^[a-z]{2}(-[a-z]{2})?$/.test(parts[0])) {
    return `/${parts.slice(1).join("/")}`;
  }
  return path;
}

/** Strict exact path match after normalization (full URL, query, trailing slash, optional /en prefix). */
export function storefrontPathsEqual(pathnameRaw, exactRaw) {
  const path = normalizePathname(pathnameRaw);
  const exact = normalizePathname(exactRaw);
  if (!exact || exact === "/") return false;
  if (path === exact) return true;
  return stripOptionalLocalePrefix(path) === exact;
}

/**
 * Main matcher
 * @param {{ pathname?: string, pageType?: string }} ctx
 * @param {{ pageTarget?: string, exactPageUrl?: string, customPathContains?: string }} cfg
 */
export function matchesPopupPageTarget(ctx, cfg) {
  const target = normalizePopupPageTarget(cfg?.pageTarget);
  const path = normalizePathname(ctx?.pathname ?? "/");
  const pageType = String(ctx?.pageType || "").toLowerCase();

  if (target === "all") return true;

  if (target === "home") {
    return isHome(path, pageType);
  }

  if (target === "exact") {
    return storefrontPathsEqual(path, getExactPageUrl(cfg));
  }

  return false;
}

/**
 * Convenience wrapper
 */
export function pathMatchesPageTarget(pathname, cfg, pageType) {
  return matchesPopupPageTarget({ pathname, pageType }, cfg);
}

/**
 * Conflict key (one active per target)
 */
export function popupTargetConflictKey(cfg) {
  const pageTarget = normalizePopupPageTarget(cfg?.pageTarget);

  if (pageTarget === "exact") {
    return `exact|${getExactPageUrl(cfg)}`;
  }

  return `${pageTarget}|`;
}

/**
 * Priority: exact > home > all
 */
export function pageTargetSpecificity(cfg) {
  const t = normalizePopupPageTarget(cfg?.pageTarget);
  return { exact: 100, home: 50, all: 5 }[t] || 5;
}

/**
 * Pick best popup for current page
 * @param {Array<{ id: string, updatedAt: Date, active: boolean, configJson: string }>} rows
 * @param {string} pathnameRaw
 * @param {string} [pageTypeRaw]
 */
export function selectBestActivePopupRow(rows, pathnameRaw, pageTypeRaw) {
  const pathname = normalizePathname(pathnameRaw);

  const ctx = {
    pathname,
    pageType: String(pageTypeRaw || "").toLowerCase(),
  };

  const candidates = [];

  for (const row of rows) {
    if (!row.active) continue;

    let cfg;
    try {
      cfg = parsePopupDesignConfig(row.configJson);
    } catch {
      continue;
    }

    if (!matchesPopupPageTarget(ctx, cfg)) continue;

    const spec = pageTargetSpecificity(cfg);
    const t =
      row.updatedAt instanceof Date
        ? row.updatedAt.getTime()
        : new Date(row.updatedAt).getTime();

    candidates.push({ row, spec, t });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.spec !== a.spec) return b.spec - a.spec;
    return b.t - a.t;
  });

  return candidates[0].row;
}
