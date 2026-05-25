export function generatePopupDesignId() {
  return `pop_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export const POPUP_LAYOUT_MODES = ["split_image_left", "split_image_right", "stacked", "content_only"];

/** @param {unknown} v */
export function parsePopupLayoutMode(v) {
  const s = String(v ?? "").trim();
  return POPUP_LAYOUT_MODES.includes(s) ? s : "split_image_left";
}

export const POPUP_VISUAL_STYLES = ["classic", "glass", "minimal", "editorial"];

/** Storefront look: classic (default), glass (frosted panel), minimal (bold sans, pill CTA), editorial (large serif). */
export function parsePopupVisualStyle(v) {
  const s = String(v ?? "").trim();
  return POPUP_VISUAL_STYLES.includes(s) ? s : "classic";
}

export const POPUP_CONTENT_ALIGNS = ["left", "center"];

export function parsePopupContentAlign(v) {
  return String(v ?? "").trim() === "center" ? "center" : "left";
}

export const POPUP_COUNTDOWN_STYLES = ["compact", "labeled"];

export function parsePopupCountdownStyle(v) {
  return String(v ?? "").trim() === "labeled" ? "labeled" : "compact";
}

export const POPUP_COUPON_VARIANTS = ["dashed", "ticket"];

export function parsePopupCouponVariant(v) {
  return String(v ?? "").trim() === "ticket" ? "ticket" : "dashed";
}

export const POPUP_MODAL_BG_FITS = ["cover", "contain"];

export function parsePopupModalBackgroundImageFit(v) {
  return String(v ?? "").trim() === "contain" ? "contain" : "cover";
}

export const POPUP_CLOSE_BUTTON_POSITIONS = ["top_left", "top_right", "bottom_left", "bottom_right"];

export function parsePopupCloseButtonPosition(v) {
  const s = String(v ?? "").trim().replace(/-/g, "_");
  return POPUP_CLOSE_BUTTON_POSITIONS.includes(s) ? s : "top_right";
}

const CONFIG_DEFAULTS = {
  /** Which ready-made layout this popup was created from; drives admin editor field visibility. */
  designTemplateId: "",
  popupDesignId: "",
  headline: "GET 15% OFF TODAY",
  subheadline: "LIMITED TIME OFFER",
  couponCode: "COUPONCODE",
  ctaText: "Continue shopping",
  ctaHref: "",
  countdownEndAt: "",
  showDelayMs: 1200,
  displayTrigger: "delay",
  showMode: "repeat",
  repeatFrequencyMinutes: 60,
  /** 0 = unlimited storefront impressions (per browser); each time the modal is shown counts once. */
  maxImpressions: 0,
  pageTarget: "all",
  /** Full storefront path for pageTarget "exact", e.g. /products/gift-card */
  exactPageUrl: "",
  /** @deprecated use exactPageUrl */
  customPathContains: "",
  leftImageUrl: "",
  leftImageAlt: "",
  copyCouponButtonText: "Copy code",
  copyCouponSuccessText: "Copied!",
  /** Small line under the CTA (dismiss / decline messaging). */
  showDismissFootnote: true,
  dismissFootnoteText: "No thanks, I'll pay full price",
  /** split_image_left | split_image_right | stacked | content_only */
  layoutMode: "split_image_left",
  /** When false, overlay uses a transparent backdrop (no dim) while keeping click-to-dismiss. */
  dimOverlay: true,
  showTitle: true,
  /** Pill badge above headline (when showTitle). */
  titleBadgeText: "✦ LIMITED OFFER",
  /** classic | glass | minimal | editorial */
  visualStyle: "classic",
  showHeadline: true,
  showSubheadline: true,
  showContent: true,
  showTiming: true,
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
  /** Optional paragraph under sub-headline. */
  bodyText: "",
  /** left | center - content column alignment. */
  contentAlign: "left",
  /** compact (DD:HH:MM:SS row) | labeled (units under boxes). */
  countdownStyle: "compact",
  /** dashed | ticket */
  couponVariant: "dashed",
  /** Show email field before CTA; CTA appends ?email=… when set. */
  emailCaptureEnabled: false,
  emailPlaceholder: "Enter your email",
  secondEmailFieldEnabled: false,
  secondEmailPlaceholder: "",
  /**
   * When true (and email capture on), submitting a valid email POSTs to the app proxy first to record
   * the signup and increment the per-popup subscriber count, then redirects to the CTA URL.
   */
  subscriberSignupEnabled: false,
  /**
   * When true (with email capture), Subscribe POSTs to the app proxy which runs Admin API `customerCreate`
   * (requires write_customers scope + app installed). Optional in-popup success UI via customerCreateStayInPopup.
   */
  shopifyCustomerCreateEnabled: false,
  /** When creating a Shopify customer, set email marketing consent to SUBSCRIBED (single opt-in). */
  customerCreateMarketingOptIn: true,
  /** Shown in the popup after successful customer create when staying in the modal. */
  customerCreateSuccessMessage: "You are subscribed. Thank you!",
  /** Optional image URL (https / shop-relative) shown on success. */
  customerCreateSuccessImageUrl: "",
  /**
   * When true (default), after a successful customer create the popup shows the success state instead of redirecting.
   * When false, redirects to CTA link with ?email=… after success (if CTA URL is set).
   */
  customerCreateStayInPopup: true,
  /**
   * After a successful customer create, how long to show the in-popup success state before auto-closing
   * when there is no CTA URL (0–120000 ms). Ignored when redirecting via CTA href.
   */
  customerCreateSuccessAutoCloseMs: 2600,
  /** Full-card background behind columns (separate from left-column hero image). */
  modalBackgroundImageUrl: "",
  modalBackgroundImageAlt: "",
  /** cover | contain */
  modalBackgroundImageFit: "cover",
  /** top_left | top_right | bottom_left | bottom_right */
  closeButtonPosition: "top_right",
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

/** Same rules as hero/left panel images (Shopify CDN, https, relative shop paths). */
export function sanitizePopupModalBackgroundImageUrl(url) {
  return sanitizePopupLeftImageUrl(url);
}

function normalizePopupPageTargetInConfig(raw) {
  const t = String(raw || "all").trim();
  if (t === "all" || t === "home" || t === "exact") return t;
  if (t === "custom" || t === "url") return "exact";
  return "all";
}

function normalizePopupPathInConfig(raw) {
  let path = String(raw || "/").trim() || "/";
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* fall through */
    }
  }
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.toLowerCase().split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  return path || "/";
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
  if (merged.pageTarget == null && raw.page_target != null) {
    merged.pageTarget = raw.page_target;
  }
  if (!merged.exactPageUrl && raw.exact_page_url) {
    merged.exactPageUrl = raw.exact_page_url;
  }
  merged.designTemplateId = String(merged.designTemplateId ?? "").trim();
  merged.popupDesignId = String(merged.popupDesignId ?? "").trim();
  merged.headline = String(merged.headline ?? CONFIG_DEFAULTS.headline).trim() || CONFIG_DEFAULTS.headline;
  merged.subheadline = String(merged.subheadline ?? CONFIG_DEFAULTS.subheadline).trim();
  merged.couponCode = String(merged.couponCode ?? CONFIG_DEFAULTS.couponCode).trim() || CONFIG_DEFAULTS.couponCode;
  merged.ctaText = String(merged.ctaText ?? CONFIG_DEFAULTS.ctaText).trim() || CONFIG_DEFAULTS.ctaText;
  merged.ctaHref = String(merged.ctaHref ?? "").trim();
  merged.countdownEndAt = String(merged.countdownEndAt ?? "").trim();
  merged.showDelayMs = Math.max(0, Number(merged.showDelayMs) || CONFIG_DEFAULTS.showDelayMs);
  merged.displayTrigger = String(merged.displayTrigger || CONFIG_DEFAULTS.displayTrigger).trim();
  if (merged.displayTrigger !== "on_load" && merged.displayTrigger !== "delay") {
    merged.displayTrigger = CONFIG_DEFAULTS.displayTrigger;
  }
  merged.showMode = String(merged.showMode || CONFIG_DEFAULTS.showMode).trim();
  if (merged.showMode !== "once" && merged.showMode !== "repeat") {
    merged.showMode = CONFIG_DEFAULTS.showMode;
  }
  const repeatMinutes = Number(merged.repeatFrequencyMinutes);
  merged.repeatFrequencyMinutes = Number.isFinite(repeatMinutes)
    ? Math.max(1, Math.min(10080, Math.round(repeatMinutes)))
    : CONFIG_DEFAULTS.repeatFrequencyMinutes;
  const maxImp = Number(merged.maxImpressions);
  merged.maxImpressions = Number.isFinite(maxImp)
    ? Math.max(0, Math.min(10000, Math.round(maxImp)))
    : CONFIG_DEFAULTS.maxImpressions;
  merged.pageTarget = normalizePopupPageTargetInConfig(merged.pageTarget);
  const exactRaw = String(merged.exactPageUrl || merged.customPathContains || "").trim();
  merged.exactPageUrl =
    merged.pageTarget === "exact" && exactRaw ? normalizePopupPathInConfig(exactRaw) : "";
  merged.customPathContains = "";
  merged.leftImageUrl = sanitizePopupLeftImageUrl(merged.leftImageUrl);
  merged.leftImageAlt = String(merged.leftImageAlt ?? "").trim();
  merged.copyCouponButtonText =
    String(merged.copyCouponButtonText ?? CONFIG_DEFAULTS.copyCouponButtonText).trim() ||
    CONFIG_DEFAULTS.copyCouponButtonText;
  merged.copyCouponSuccessText =
    String(merged.copyCouponSuccessText ?? CONFIG_DEFAULTS.copyCouponSuccessText).trim() ||
    CONFIG_DEFAULTS.copyCouponSuccessText;
  merged.showDismissFootnote = merged.showDismissFootnote !== false;
  const foot = String(merged.dismissFootnoteText ?? CONFIG_DEFAULTS.dismissFootnoteText).trim();
  merged.dismissFootnoteText =
    foot.slice(0, 280) || CONFIG_DEFAULTS.dismissFootnoteText;
  merged.layoutMode = parsePopupLayoutMode(merged.layoutMode);
  merged.dimOverlay = merged.dimOverlay !== false;
  merged.showTitle = merged.showTitle !== false;
  const badge = String(merged.titleBadgeText ?? CONFIG_DEFAULTS.titleBadgeText).trim();
  merged.titleBadgeText = badge.slice(0, 120) || CONFIG_DEFAULTS.titleBadgeText;
  merged.visualStyle = parsePopupVisualStyle(merged.visualStyle);
  merged.showHeadline = merged.showHeadline !== false;
  merged.showSubheadline = merged.showSubheadline !== false;
  merged.showContent = merged.showContent !== false;
  merged.showTiming = merged.showTiming !== false;
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
  merged.bodyText = String(merged.bodyText ?? "").trim().slice(0, 800);
  merged.contentAlign = parsePopupContentAlign(merged.contentAlign);
  merged.countdownStyle = parsePopupCountdownStyle(merged.countdownStyle);
  merged.couponVariant = parsePopupCouponVariant(merged.couponVariant);
  merged.emailCaptureEnabled = merged.emailCaptureEnabled === true;
  const emPh = String(merged.emailPlaceholder ?? CONFIG_DEFAULTS.emailPlaceholder).trim();
  merged.emailPlaceholder = emPh.slice(0, 120) || CONFIG_DEFAULTS.emailPlaceholder;
  merged.secondEmailFieldEnabled = false;
  merged.secondEmailPlaceholder = "";
  merged.subscriberSignupEnabled =
    merged.subscriberSignupEnabled === true && merged.emailCaptureEnabled === true;
  merged.shopifyCustomerCreateEnabled =
    merged.shopifyCustomerCreateEnabled === true && merged.emailCaptureEnabled === true;
  merged.customerCreateMarketingOptIn = merged.customerCreateMarketingOptIn !== false;
  const succMsg = String(merged.customerCreateSuccessMessage ?? CONFIG_DEFAULTS.customerCreateSuccessMessage).trim();
  merged.customerCreateSuccessMessage =
    succMsg.slice(0, 500) || CONFIG_DEFAULTS.customerCreateSuccessMessage;
  merged.customerCreateSuccessImageUrl = sanitizePopupLeftImageUrl(merged.customerCreateSuccessImageUrl);
  merged.customerCreateStayInPopup = merged.customerCreateStayInPopup !== false;
  const autoCloseMs = Number(merged.customerCreateSuccessAutoCloseMs);
  merged.customerCreateSuccessAutoCloseMs = Number.isFinite(autoCloseMs)
    ? Math.max(0, Math.min(120000, Math.round(autoCloseMs)))
    : CONFIG_DEFAULTS.customerCreateSuccessAutoCloseMs;
  merged.modalBackgroundImageUrl = sanitizePopupModalBackgroundImageUrl(merged.modalBackgroundImageUrl);
  merged.modalBackgroundImageAlt = String(merged.modalBackgroundImageAlt ?? "").trim().slice(0, 200);
  merged.modalBackgroundImageFit = parsePopupModalBackgroundImageFit(merged.modalBackgroundImageFit);
  merged.closeButtonPosition = parsePopupCloseButtonPosition(merged.closeButtonPosition);
  const tid = String(merged.designTemplateId ?? "").trim().slice(0, 80);
  merged.designTemplateId = /^[a-z0-9_-]+$/i.test(tid) ? tid : "";
  return merged;
}

/** Stable ID when older saved JSON has no popupDesignId (matches admin loader). */
export function resolvePopupDesignId(config, prismaRowId) {
  const id = String(config?.popupDesignId ?? "").trim();
  if (id) return id;
  if (prismaRowId != null && String(prismaRowId).trim()) return `popup-${prismaRowId}`;
  return "";
}
