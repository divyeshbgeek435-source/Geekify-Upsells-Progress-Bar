import { parseAdditionalConfig } from "./additional-ui-config.js";

function parseTemplateJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function buildAdditionalTemplate({
  name,
  sectionId,
  bodyJson,
  templateJson,
}) {
  const cfg = parseAdditionalConfig(bodyJson || "{}");
  const existing = parseTemplateJson(templateJson) || {};
  return {
    ...existing,
    version: 1,
    sectionId: String(sectionId || cfg.sectionId || "").toLowerCase(),
    templateDesign: {
      ...(existing.templateDesign || {}),
      displayMode: cfg.displayMode,
      marquee: {
        durationSeconds: cfg.marqueeDurationSeconds,
        direction: cfg.marqueeDirection,
        separator: cfg.marqueeSeparator,
        separatorRepeat: cfg.marqueeSeparatorRepeat,
        trailingSeparator: cfg.marqueeTrailingSeparator !== false,
        fullWidth: cfg.marqueeFullWidth !== false,
      },
      rotate: {
        intervalMs: cfg.rotateIntervalMs,
        direction: cfg.rotateDirection,
        autoplay: cfg.rotateAutoplay !== false,
        pauseOnHover: cfg.rotatePauseOnHover !== false,
      },
      layout: {
        gapPx: cfg.gapPx,
        fontSizePx: cfg.fontSizePx,
        paddingYpx: cfg.paddingYpx,
        paddingXpx: cfg.paddingXpx,
        backgroundColor: cfg.backgroundColor,
        textColor: cfg.textColor,
      },
    },
    header: { ...(existing.header || {}), title: String(name || "") },
    body: { ...(existing.body || {}), messages: cfg.messages },
    rate: { ...(existing.rate || {}), value: String(existing?.rate?.value || "") },
    discount: { ...(existing.discount || {}), value: String(existing?.discount?.value || "") },
    uiBlocks: Array.isArray(existing.uiBlocks) ? existing.uiBlocks : [],
    render: {
      config: cfg,
    },
  };
}

export function templateRenderPayload(template, fallbackBodyJson) {
  const render = template?.render && typeof template.render === "object" ? template.render : {};
  const cfg =
    render?.config && typeof render.config === "object"
      ? render.config
      : parseAdditionalConfig(fallbackBodyJson || "{}");
  return {
    sectionId: String(template?.sectionId || cfg.sectionId || "").toLowerCase(),
    config: cfg,
  };
}
