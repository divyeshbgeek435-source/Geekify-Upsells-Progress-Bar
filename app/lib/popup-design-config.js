export function generatePopupDesignId() {
  return `pop_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export const POPUP_LAYOUT_MODES = ["split_image_left", "split_image_right", "stacked", "content_only"];

/** @param {unknown} v */
export function parsePopupLayoutMode(v) {
  const s = String(v ?? "").trim();
  return POPUP_LAYOUT_MODES.includes(s) ? s : "split_image_left";
}

const CONFIG_DEFAULTS = {
  popupDesignId: "",
  headline: "GET 15% OFF TODAY",
  subheadline: "LIMITED TIME OFFER",
  couponCode: "COUPONCODE",
  ctaText: "Continue shopping",
  ctaHref: "",
  countdownEndAt: "",
  showDelayMs: 1200,
  leftImageUrl: "",
  leftImageAlt: "",
  copyCouponButtonText: "Copy code",
  copyCouponSuccessText: "Copied!",
  /** split_image_left | split_image_right | stacked | content_only */
  layoutMode: "split_image_left",
  /** When false, overlay uses a transparent backdrop (no dim) while keeping click-to-dismiss. */
  dimOverlay: true,
  showHeadline: true,
  showSubheadline: true,
  /** No drop shadow on outer shell; useful with transparent panel colors. */
  modalTransparentShell: false,
  /** Corner radius in px for the modal container. */
  modalBorderRadius: 12,
  /** Max width in px (280–920); 0 = use theme default (600px cap in CSS). */
  modalMaxWidthPx: 0,
  leftPanelBg: "#4a7fc4",
  rightPanelBg: "#dbeaf8",
  accentGold: "#c9a227",
  headlineColor: "#0f172a",
  subheadlineColor: "#475569",
  buttonBg: "#0f172a",
  buttonText: "#ffffff",
  overlayBg: "rgba(15, 23, 42, 0.45)",
};

/** Allow only safe image URL schemes for the storefront popup. */
export function sanitizePopupLeftImageUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  const lower = s.slice(0, 12).toLowerCase();
  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("//") ||
    (s[0] === "/" && !s.startsWith("//"))
  ) {
    return s;
  }
  return "";
}

function baseConfigShape() {
  return { ...CONFIG_DEFAULTS };
}

export function defaultPopupDesignConfig() {
  return {
    ...baseConfigShape(),
    popupDesignId: generatePopupDesignId(),
  };
}

export function parsePopupDesignConfig(json) {
  let raw = {};
  try {
    raw = JSON.parse(json || "{}");
    if (typeof raw !== "object" || raw === null) raw = {};
  } catch {
    raw = {};
  }
  const merged = { ...baseConfigShape(), ...raw };
  merged.popupDesignId = String(merged.popupDesignId ?? "").trim();
  merged.headline = String(merged.headline ?? CONFIG_DEFAULTS.headline).trim() || CONFIG_DEFAULTS.headline;
  merged.subheadline = String(merged.subheadline ?? CONFIG_DEFAULTS.subheadline).trim();
  merged.couponCode = String(merged.couponCode ?? CONFIG_DEFAULTS.couponCode).trim() || CONFIG_DEFAULTS.couponCode;
  merged.ctaText = String(merged.ctaText ?? CONFIG_DEFAULTS.ctaText).trim() || CONFIG_DEFAULTS.ctaText;
  merged.ctaHref = String(merged.ctaHref ?? "").trim();
  merged.countdownEndAt = String(merged.countdownEndAt ?? "").trim();
  merged.showDelayMs = Math.max(0, Number(merged.showDelayMs) || CONFIG_DEFAULTS.showDelayMs);
  merged.leftImageUrl = sanitizePopupLeftImageUrl(merged.leftImageUrl);
  merged.leftImageAlt = String(merged.leftImageAlt ?? "").trim();
  merged.copyCouponButtonText =
    String(merged.copyCouponButtonText ?? CONFIG_DEFAULTS.copyCouponButtonText).trim() ||
    CONFIG_DEFAULTS.copyCouponButtonText;
  merged.copyCouponSuccessText =
    String(merged.copyCouponSuccessText ?? CONFIG_DEFAULTS.copyCouponSuccessText).trim() ||
    CONFIG_DEFAULTS.copyCouponSuccessText;
  merged.layoutMode = parsePopupLayoutMode(merged.layoutMode);
  merged.dimOverlay = merged.dimOverlay !== false;
  merged.showHeadline = merged.showHeadline !== false;
  merged.showSubheadline = merged.showSubheadline !== false;
  merged.modalTransparentShell = merged.modalTransparentShell === true;
  const br = Number(merged.modalBorderRadius);
  merged.modalBorderRadius = Number.isFinite(br) ? Math.min(48, Math.max(0, br)) : CONFIG_DEFAULTS.modalBorderRadius;
  const mwp = Number(merged.modalMaxWidthPx);
  if (!Number.isFinite(mwp) || mwp <= 0) {
    merged.modalMaxWidthPx = 0;
  } else {
    merged.modalMaxWidthPx = Math.min(920, Math.max(280, Math.round(mwp)));
  }
  merged.leftPanelBg = String(merged.leftPanelBg || CONFIG_DEFAULTS.leftPanelBg);
  merged.rightPanelBg = String(merged.rightPanelBg || CONFIG_DEFAULTS.rightPanelBg);
  merged.accentGold = String(merged.accentGold || CONFIG_DEFAULTS.accentGold);
  merged.headlineColor = String(merged.headlineColor || CONFIG_DEFAULTS.headlineColor);
  merged.subheadlineColor = String(merged.subheadlineColor || CONFIG_DEFAULTS.subheadlineColor);
  merged.buttonBg = String(merged.buttonBg || CONFIG_DEFAULTS.buttonBg);
  merged.buttonText = String(merged.buttonText || CONFIG_DEFAULTS.buttonText);
  merged.overlayBg = String(merged.overlayBg || CONFIG_DEFAULTS.overlayBg);
  return merged;
}

/** Stable ID when older saved JSON has no popupDesignId (matches admin loader). */
export function resolvePopupDesignId(config, prismaRowId) {
  const id = String(config?.popupDesignId ?? "").trim();
  if (id) return id;
  if (prismaRowId != null && String(prismaRowId).trim()) return `popup-${prismaRowId}`;
  return "";
}
