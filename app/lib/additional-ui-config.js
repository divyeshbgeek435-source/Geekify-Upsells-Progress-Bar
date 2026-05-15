export const DEFAULT_MESSAGES = [
  "BLACK FRIDAY SALE!",
  "BUY 1 GET 1 FREE",
  "FREE SHIPPING ABOVE $50",
];

export function generateSectionId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function ensureTwelveCharId(value, fallback = "") {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (normalized.length === 12) return normalized;
  if (fallback) return fallback;
  return generateSectionId();
}

/** Marquee lines are plain strings; one `sectionId` identifies the whole block. */
export function normalizeMessagesArray(raw, fallbackStrings) {
  const fb = [...fallbackStrings];
  if (!Array.isArray(raw) || !raw.length) return fb;
  const out = [];
  for (const entry of raw) {
    if (entry != null && typeof entry === "object" && !Array.isArray(entry)) {
      const t = String(entry.text ?? entry.message ?? "").trim();
      if (t) out.push(t);
    } else {
      const t = String(entry ?? "").trim();
      if (t) out.push(t);
    }
  }
  return out.length ? out : fb;
}

const CONFIG_DEFAULTS = {
  sectionId: "",
  messages: () => [...DEFAULT_MESSAGES],
  displayMode: "stack",
  rotateIntervalMs: 3000,
  rotateDirection: "forward",
  rotateAutoplay: true,
  rotatePauseOnHover: true,
  marqueeDurationSeconds: 18,
  marqueeDirection: "rtl",
  marqueeSeparator: "•",
  marqueeSeparatorRepeat: 1,
  marqueeTrailingSeparator: true,
  marqueeFullWidth: true,
  gapPx: 24,
  fontSizePx: 22,
  paddingYpx: 14,
  paddingXpx: 16,
  backgroundColor: "#b8f441",
  textColor: "#0f172a",
};

function baseConfigShape() {
  return {
    sectionId: CONFIG_DEFAULTS.sectionId,
    messages: CONFIG_DEFAULTS.messages(),
    displayMode: CONFIG_DEFAULTS.displayMode,
    rotateIntervalMs: CONFIG_DEFAULTS.rotateIntervalMs,
    rotateDirection: CONFIG_DEFAULTS.rotateDirection,
    rotateAutoplay: CONFIG_DEFAULTS.rotateAutoplay,
    rotatePauseOnHover: CONFIG_DEFAULTS.rotatePauseOnHover,
    marqueeDurationSeconds: CONFIG_DEFAULTS.marqueeDurationSeconds,
    marqueeDirection: CONFIG_DEFAULTS.marqueeDirection,
    marqueeSeparator: CONFIG_DEFAULTS.marqueeSeparator,
    marqueeSeparatorRepeat: CONFIG_DEFAULTS.marqueeSeparatorRepeat,
    marqueeTrailingSeparator: CONFIG_DEFAULTS.marqueeTrailingSeparator,
    marqueeFullWidth: CONFIG_DEFAULTS.marqueeFullWidth,
    gapPx: CONFIG_DEFAULTS.gapPx,
    fontSizePx: CONFIG_DEFAULTS.fontSizePx,
    paddingYpx: CONFIG_DEFAULTS.paddingYpx,
    paddingXpx: CONFIG_DEFAULTS.paddingXpx,
    backgroundColor: CONFIG_DEFAULTS.backgroundColor,
    textColor: CONFIG_DEFAULTS.textColor,
  };
}

/** New shop / no saved row yet - includes a fresh section id. */
export function defaultAdditionalConfig() {
  return {
    ...baseConfigShape(),
    sectionId: ensureTwelveCharId(""),
  };
}

export function parseAdditionalConfig(json) {
  let raw = {};
  try {
    raw = JSON.parse(json || "{}");
    if (typeof raw !== "object" || raw === null) raw = {};
  } catch {
    raw = {};
  }
  const merged = { ...baseConfigShape(), ...raw };
  merged.messages = normalizeMessagesArray(merged.messages, CONFIG_DEFAULTS.messages());
  merged.sectionId = ensureTwelveCharId(merged.sectionId);
  merged.gapPx = Math.max(8, Number(merged.gapPx) || CONFIG_DEFAULTS.gapPx);
  merged.displayMode = String(merged.displayMode || CONFIG_DEFAULTS.displayMode);
  if (merged.displayMode !== "rotate" && merged.displayMode !== "marquee") {
    merged.displayMode = "stack";
  }
  merged.rotateIntervalMs = Math.max(
    1000,
    Number(merged.rotateIntervalMs) || CONFIG_DEFAULTS.rotateIntervalMs,
  );
  merged.rotateDirection = String(merged.rotateDirection || CONFIG_DEFAULTS.rotateDirection);
  if (merged.rotateDirection !== "backward") merged.rotateDirection = "forward";
  merged.rotateAutoplay = merged.rotateAutoplay !== false;
  merged.rotatePauseOnHover = merged.rotatePauseOnHover !== false;
  merged.marqueeDurationSeconds = Math.max(
    4,
    Number(merged.marqueeDurationSeconds) || CONFIG_DEFAULTS.marqueeDurationSeconds,
  );
  merged.marqueeDirection = String(merged.marqueeDirection || CONFIG_DEFAULTS.marqueeDirection);
  if (merged.marqueeDirection !== "ltr") merged.marqueeDirection = "rtl";
  merged.marqueeSeparator = String(merged.marqueeSeparator ?? CONFIG_DEFAULTS.marqueeSeparator);
  merged.marqueeSeparatorRepeat = Math.max(
    1,
    Math.min(6, Number(merged.marqueeSeparatorRepeat) || CONFIG_DEFAULTS.marqueeSeparatorRepeat),
  );
  merged.marqueeTrailingSeparator = merged.marqueeTrailingSeparator !== false;
  merged.marqueeFullWidth = merged.marqueeFullWidth !== false;
  merged.fontSizePx = Math.max(12, Number(merged.fontSizePx) || CONFIG_DEFAULTS.fontSizePx);
  merged.paddingYpx = Math.max(0, Number(merged.paddingYpx) || CONFIG_DEFAULTS.paddingYpx);
  merged.paddingXpx = Math.max(0, Number(merged.paddingXpx) || CONFIG_DEFAULTS.paddingXpx);
  merged.backgroundColor = String(merged.backgroundColor || CONFIG_DEFAULTS.backgroundColor);
  merged.textColor = String(merged.textColor || CONFIG_DEFAULTS.textColor);
  return merged;
}

/** Stable ID when older saved JSON has no sectionId (matches admin loader). */
export function resolveSectionId(config, prismaRowId) {
  const sid = ensureTwelveCharId(config?.sectionId ?? "", "");
  if (sid) return sid;
  return ensureTwelveCharId(String(prismaRowId ?? ""));
}
