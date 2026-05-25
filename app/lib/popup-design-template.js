import { parsePopupDesignConfig } from "./popup-design-config.js";

function parseTemplateJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function buildPopupTemplate({ name, popupDesignId, configJson, templateJson }) {
  const cfg = parsePopupDesignConfig(configJson || "{}");
  const existing = parseTemplateJson(templateJson) || {};
  return {
    ...existing,
    version: 1,
    popupDesignId: String(popupDesignId || cfg.popupDesignId || "").trim(),
    templateDesign: {
      ...(existing.templateDesign || {}),
      designTemplateId: String(cfg.designTemplateId || ""),
      layoutMode: String(cfg.layoutMode || ""),
      visualStyle: String(cfg.visualStyle || ""),
      uiBlocks: Array.isArray(existing?.templateDesign?.uiBlocks)
        ? existing.templateDesign.uiBlocks
        : [],
    },
    header: { ...(existing.header || {}), title: String(name || "") },
    body: {
      ...(existing.body || {}),
      headline: String(cfg.headline || ""),
      subheadline: String(cfg.subheadline || ""),
      bodyText: String(cfg.bodyText || ""),
    },
    rate: { ...(existing.rate || {}), value: String(existing?.rate?.value || "") },
    discount: {
      ...(existing.discount || {}),
      couponCode: String(cfg.couponCode || ""),
      value: String(existing?.discount?.value || ""),
    },
    uiBlocks: Array.isArray(existing.uiBlocks) ? existing.uiBlocks : [],
    render: { config: cfg },
  };
}

export function templateRenderPayload(template, fallbackConfigJson) {
  const render = template?.render && typeof template.render === "object" ? template.render : {};
  const fromTemplate =
    render?.config && typeof render.config === "object" ? render.config : {};
  /** `configJson` is authoritative (pageTarget, timing, etc.); cached template.render may be stale. */
  const fromDb = parsePopupDesignConfig(fallbackConfigJson || "{}");
  const cfg = { ...fromTemplate, ...fromDb };
  return {
    popupDesignId: String(template?.popupDesignId || cfg.popupDesignId || "").trim(),
    config: cfg,
    template: template && typeof template === "object" ? template : {},
  };
}
