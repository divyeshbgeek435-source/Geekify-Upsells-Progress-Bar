/** Shared announcement bar JSON config (admin + app proxy). */

export function defaultConfig() {
  return {
    messages: ["Summer sale - 20% off everything", "Free shipping over $50"],
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
    borderColor: "#334155",
    borderWidthPx: 0,
    fontSizePx: 14,
    fontWeight: "500",
    fontFamily: "inherit",
    textAlign: "center",
    paddingYpx: 10,
    paddingXpx: 16,
    borderRadiusPx: 0,
    shadow: "none",
    letterSpacingEm: 0,
    lineHeight: 1.35,
    maxContentWidthPx: 0,
    marqueeSpeedSeconds: 22,
    marqueeSeparatorIcon: "•",
    marqueeSeparatorGapPx: 16,
    marqueePauseOnHover: false,
    rotateIntervalMs: 4500,
    linkUrl: "",
    linkUnderline: true,
    dismissible: false,
    /** Optional pill button (sticky bars). Requires linkUrl. */
    ctaLabel: "",
    ctaBackgroundColor: "#EF5350",
    /** DOM id for the whole bar (marquee text stays inside the same section). */
    sectionHtmlId: "",
  };
}

export function parseConfig(json) {
  let raw = {};
  try {
    raw = JSON.parse(json || "{}");
    if (typeof raw !== "object" || raw === null) raw = {};
  } catch {
    raw = {};
  }
  const base = defaultConfig();
  const merged = { ...base, ...raw };
  if (!Array.isArray(merged.messages) || !merged.messages.length) {
    merged.messages = [...base.messages];
  } else {
    merged.messages = merged.messages.map((m) => String(m ?? "")).filter(Boolean);
    if (!merged.messages.length) merged.messages = [...base.messages];
  }
  merged.fontSizePx = Number(merged.fontSizePx) || base.fontSizePx;
  merged.borderWidthPx = Math.max(0, Number(merged.borderWidthPx) || 0);
  merged.paddingYpx = Math.max(0, Number(merged.paddingYpx) || 0);
  merged.paddingXpx = Math.max(0, Number(merged.paddingXpx) || 0);
  merged.borderRadiusPx = Math.max(0, Number(merged.borderRadiusPx) || 0);
  merged.marqueeSpeedSeconds = Math.max(4, Number(merged.marqueeSpeedSeconds) || 22);
  merged.marqueeSeparatorIcon = String(merged.marqueeSeparatorIcon ?? "•").trim() || "•";
  merged.marqueeSeparatorGapPx = Math.max(0, Number(merged.marqueeSeparatorGapPx) || 16);
  merged.marqueePauseOnHover = merged.marqueePauseOnHover === true;
  merged.rotateIntervalMs = Math.max(1500, Number(merged.rotateIntervalMs) || 4500);
  merged.lineHeight =
    typeof merged.lineHeight === "number" && merged.lineHeight > 0
      ? merged.lineHeight
      : base.lineHeight;
  merged.maxContentWidthPx = Math.max(0, Number(merged.maxContentWidthPx) || 0);
  merged.letterSpacingEm = Number(merged.letterSpacingEm) || 0;
  merged.fontWeight = String(merged.fontWeight || "500");
  merged.fontFamily = String(merged.fontFamily || "inherit");
  merged.textAlign = String(merged.textAlign || "center");
  merged.shadow = String(merged.shadow || "none");
  merged.linkUrl = String(merged.linkUrl || "").trim();
  merged.dismissible = Boolean(merged.dismissible);
  merged.linkUnderline = merged.linkUnderline !== false;
  merged.sectionHtmlId = String(merged.sectionHtmlId ?? "").trim();
  merged.ctaLabel = String(merged.ctaLabel ?? "").trim();
  merged.ctaBackgroundColor = String(merged.ctaBackgroundColor || "#EF5350").trim();
  return merged;
}
