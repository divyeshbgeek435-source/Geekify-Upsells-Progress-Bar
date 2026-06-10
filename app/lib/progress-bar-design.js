/** Pure helpers for tier progress bar JSON (admin + storefront API). */

export const DISC_LIVE_BADGE_SHAPE = `polygon(98.60% 50.00%, 98.17% 51.89%, 96.97% 53.70%, 95.25% 55.36%, 93.35% 56.87%, 91.64% 58.28%, 90.43% 59.71%, 89.89% 61.25%, 90.03% 63.01%, 90.69% 65.01%, 91.57% 67.22%, 92.35% 69.52%, 92.69% 71.75%, 92.36% 73.73%, 91.29% 75.30%, 89.53% 76.41%, 87.31% 77.10%, 84.90% 77.51%, 82.61% 77.85%, 80.69% 78.37%, 79.27% 79.27%, 78.37% 80.69%, 77.85% 82.61%, 77.51% 84.90%, 77.10% 87.31%, 76.41% 89.53%, 75.30% 91.29%, 73.73% 92.36%, 71.75% 92.69%, 69.52% 92.35%, 67.22% 91.57%, 65.01% 90.69%, 63.01% 90.03%, 61.25% 89.89%, 59.71% 90.43%, 58.28% 91.64%, 56.87% 93.35%, 55.36% 95.25%, 53.70% 96.97%, 51.89% 98.17%, 50.00% 98.60%, 48.11% 98.17%, 46.30% 96.97%, 44.64% 95.25%, 43.13% 93.35%, 41.72% 91.64%, 40.29% 90.43%, 38.75% 89.89%, 36.99% 90.03%, 34.99% 90.69%, 32.78% 91.57%, 30.48% 92.35%, 28.25% 92.69%, 26.27% 92.36%, 24.70% 91.29%, 23.59% 89.53%, 22.90% 87.31%, 22.49% 84.90%, 22.15% 82.61%, 21.63% 80.69%, 20.73% 79.27%, 19.31% 78.37%, 17.39% 77.85%, 15.10% 77.51%, 12.69% 77.10%, 10.47% 76.41%, 8.71% 75.30%, 7.64% 73.73%, 7.31% 71.75%, 7.65% 69.52%, 8.43% 67.22%, 9.31% 65.01%, 9.97% 63.01%, 10.11% 61.25%, 9.57% 59.71%, 8.36% 58.28%, 6.65% 56.87%, 4.75% 55.36%, 3.03% 53.70%, 1.83% 51.89%, 1.40% 50.00%, 1.83% 48.11%, 3.03% 46.30%, 4.75% 44.64%, 6.65% 43.13%, 8.36% 41.72%, 9.57% 40.29%, 10.11% 38.75%, 9.97% 36.99%, 9.31% 34.99%, 8.43% 32.78%, 7.65% 30.48%, 7.31% 28.25%, 7.64% 26.27%, 8.71% 24.70%, 10.47% 23.59%, 12.69% 22.90%, 15.10% 22.49%, 17.39% 22.15%, 19.31% 21.63%, 20.73% 20.73%, 21.63% 19.31%, 22.15% 17.39%, 22.49% 15.10%, 22.90% 12.69%, 23.59% 10.47%, 24.70% 8.71%, 26.27% 7.64%, 28.25% 7.31%, 30.48% 7.65%, 32.78% 8.43%, 34.99% 9.31%, 36.99% 9.97%, 38.75% 10.11%, 40.29% 9.57%, 41.72% 8.36%, 43.13% 6.65%, 44.64% 4.75%, 46.30% 3.03%, 48.11% 1.83%, 50.00% 1.40%, 51.89% 1.83%, 53.70% 3.03%, 55.36% 4.75%, 56.87% 6.65%, 58.28% 8.36%, 59.71% 9.57%, 61.25% 10.11%, 63.01% 9.97%, 65.01% 9.31%, 67.22% 8.43%, 69.52% 7.65%, 71.75% 7.31%, 73.73% 7.64%, 75.30% 8.71%, 76.41% 10.47%, 77.10% 12.69%, 77.51% 15.10%, 77.85% 17.39%, 78.37% 19.31%, 79.27% 20.73%, 80.69% 21.63%, 82.61% 22.15%, 84.90% 22.49%, 87.31% 22.90%, 89.53% 23.59%, 91.29% 24.70%, 92.36% 26.27%, 92.69% 28.25%, 92.35% 30.48%, 91.57% 32.78%, 90.69% 34.99%, 90.03% 36.99%, 89.89% 38.75%, 90.43% 40.29%, 91.64% 41.72%, 93.35% 43.13%, 95.25% 44.64%, 96.97% 46.30%, 98.17% 48.11%)`;

export const PROGRESS_OVERLAY_KEYS = /** @type {const} */ (["tierBefore", "tierFillAfter"]);

function defaultProgressOverlayLayer(/** @type {"tierBefore" | "tierFillAfter"} */ key) {
  return {
    visible: true,
    textColor: "#f8fafc",
    backgroundColor: "#111827",
    imageDataUrl: "",
    label: key === "tierBefore" ? "Tier before" : "Tier fill after",
    xPercent: key === "tierBefore" ? 18 : 82,
    yPercent: 68,
    scalePercent: 100,
  };
}

/** “Before” = tier threshold not yet reached; “after” = reached (premium pill + badges). */
function defaultTierPhaseStyle(phase) {
  const inactive = {
    barFill: "",
    barTrack: "",
    badgeBackgroundColor: "#c3bbbb",
    badgeBorderColor: "#000000",
    badgeShadow: "0 0 0 2px #ffffff, 0 2px 10px rgba(0,0,0,0.08)",
    iconColor: "#000000",
    iconSizePx: 15,
    labelColor: "",
    priceLabelColor: "",
  };
  const active = {
    barFill: "#000000",
    barTrack: "",
    badgeBackgroundColor: "#000000",
    badgeBorderColor: "#ffffff",
    badgeShadow: "0 0 0 2px #ffffff, 0 2px 12px rgba(0,0,0,0.2)",
    iconColor: "#ffffff",
    iconSizePx: 15,
    labelColor: "",
    priceLabelColor: "",
  };
  return phase === "before" ? inactive : active;
}

export function defaultBarStyle() {
  return {
    barMaxWidthPx: 0,
    barHeightPx: 10,
    barBorderRadiusPx: 999,
    barSectionMarginTopPx: 30,
    barSectionMarginBottomPx: 6,
    badgeSizePx: 46,
    captionGapPx: 18,
    transitionMs: 280,
    badgeHoverScalePercent: 104,
    tier1: {
      before: defaultTierPhaseStyle("before"),
      after: defaultTierPhaseStyle("after"),
    },
    tier2: {
      before: defaultTierPhaseStyle("before"),
      after: defaultTierPhaseStyle("after"),
    },
  };
}

function mergeTierPhases(base, raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    before: { ...base.before, ...(r.before && typeof r.before === "object" ? r.before : {}) },
    after: { ...base.after, ...(r.after && typeof r.after === "object" ? r.after : {}) },
  };
}

function normalizeCaptionGapPx(raw, fallback) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return fallback;
  // Legacy default was 8px; use 18px spacing under tier badges.
  if (v === 8) return 18;
  return v;
}

export function mergeProgressBarDesign(raw) {
  let parsed = {};
  if (raw && typeof raw === "object") parsed = raw;
  else if (typeof raw === "string" && raw.trim()) {
    try {
      const j = JSON.parse(raw);
      if (j && typeof j === "object") parsed = j;
    } catch {
      parsed = {};
    }
  }
  const defBar = defaultBarStyle();
  const rawBar = parsed.barStyle && typeof parsed.barStyle === "object" ? parsed.barStyle : {};
  return {
    tierBefore: { ...defaultProgressOverlayLayer("tierBefore"), ...(parsed.tierBefore || {}) },
    tierFillAfter: { ...defaultProgressOverlayLayer("tierFillAfter"), ...(parsed.tierFillAfter || {}) },
    barStyle: {
      ...defBar,
      ...rawBar,
      captionGapPx: normalizeCaptionGapPx(rawBar.captionGapPx, defBar.captionGapPx),
      tier1: mergeTierPhases(defBar.tier1, rawBar.tier1),
      tier2: mergeTierPhases(defBar.tier2, rawBar.tier2),
    },
  };
}

function clampPct(n, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, x));
}

function sanitizeHex(value, fallback) {
  const s = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function sanitizeOverlayBg(value, fallback) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "transparent") return "transparent";
  return sanitizeHex(value, fallback);
}

function sanitizeOptionalHex(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : "";
}

function sanitizeShadow(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.length > 220 ? s.slice(0, 220) : s;
}

function sanitizePhase(L, def) {
  const d = L && typeof L === "object" ? L : {};
  const bg = sanitizeOptionalHex(d.badgeBackgroundColor);
  const border = sanitizeOptionalHex(d.badgeBorderColor);
  const icon = sanitizeOptionalHex(d.iconColor);
  const shRaw = d.badgeShadow != null ? String(d.badgeShadow) : def.badgeShadow;
  const sh = sanitizeShadow(shRaw);
  return {
    barFill: sanitizeOptionalHex(d.barFill) || "",
    barTrack: sanitizeOptionalHex(d.barTrack) || "",
    badgeBackgroundColor: bg || def.badgeBackgroundColor,
    badgeBorderColor: border || def.badgeBorderColor,
    badgeShadow: sh || def.badgeShadow,
    iconColor: icon || def.iconColor,
    iconSizePx: Math.min(32, Math.max(8, Number(d.iconSizePx) || def.iconSizePx)),
    labelColor: sanitizeOptionalHex(d.labelColor) || "",
    priceLabelColor: sanitizeOptionalHex(d.priceLabelColor) || "",
  };
}

export function sanitizeProgressBarDesignForDb(value) {
  const d = value && typeof value === "object" ? value : {};
  const layer = (L, key) => {
    const def = defaultProgressOverlayLayer(key);
    const img = typeof L?.imageDataUrl === "string" ? L.imageDataUrl : "";
    const trimmed = img.length > 450000 ? "" : img;
    return {
      visible: Boolean(L?.visible ?? true),
      textColor: sanitizeHex(L?.textColor, def.textColor),
      backgroundColor: sanitizeOverlayBg(L?.backgroundColor, def.backgroundColor),
      imageDataUrl: trimmed.startsWith("data:") ? trimmed : "",
      label: String(L?.label ?? def.label).slice(0, 48),
      xPercent: clampPct(L?.xPercent, def.xPercent),
      yPercent: clampPct(L?.yPercent, def.yPercent),
      scalePercent: Math.min(250, Math.max(25, Number(L?.scalePercent) || def.scalePercent)),
    };
  };
  const defBar = defaultBarStyle();
  const b = d.barStyle && typeof d.barStyle === "object" ? d.barStyle : {};
  return {
    tierBefore: layer(d.tierBefore, "tierBefore"),
    tierFillAfter: layer(d.tierFillAfter, "tierFillAfter"),
    barStyle: {
      barMaxWidthPx: Math.min(900, Math.max(0, Number(b.barMaxWidthPx) || defBar.barMaxWidthPx)),
      barHeightPx: Math.min(24, Math.max(4, Number(b.barHeightPx) || defBar.barHeightPx)),
      barBorderRadiusPx: Math.min(999, Math.max(0, Number(b.barBorderRadiusPx) || defBar.barBorderRadiusPx)),
      barSectionMarginTopPx: Math.min(80, Math.max(8, Number(b.barSectionMarginTopPx) || defBar.barSectionMarginTopPx)),
      barSectionMarginBottomPx: Math.min(80, Math.max(0, Number(b.barSectionMarginBottomPx) || defBar.barSectionMarginBottomPx)),
      badgeSizePx: Math.min(72, Math.max(28, Number(b.badgeSizePx) || defBar.badgeSizePx)),
      captionGapPx: Math.min(28, Math.max(0, Number(b.captionGapPx) || defBar.captionGapPx)),
      transitionMs: Math.min(1200, Math.max(0, Number(b.transitionMs) || defBar.transitionMs)),
      badgeHoverScalePercent: Math.min(130, Math.max(100, Number(b.badgeHoverScalePercent) || defBar.badgeHoverScalePercent)),
      tier1: {
        before: sanitizePhase(b.tier1?.before, defBar.tier1.before),
        after: sanitizePhase(b.tier1?.after, defBar.tier1.after),
      },
      tier2: {
        before: sanitizePhase(b.tier2?.before, defBar.tier2.before),
        after: sanitizePhase(b.tier2?.after, defBar.tier2.after),
      },
    },
  };
}
