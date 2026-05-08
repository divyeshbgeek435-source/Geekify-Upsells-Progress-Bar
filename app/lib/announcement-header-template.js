import { parseConfig } from "./announcement-bar-config.js";
import {
  generateAnnouncementSectionHtmlId,
  normalizeAnnouncementSectionHtmlId,
} from "./announcement-section-html-id.js";

function parseTemplateJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveSectionHtmlIdFromHeader(row) {
  const template = parseTemplateJson(row?.templateJson);
  const fromTemplate = normalizeAnnouncementSectionHtmlId(
    String(template?.sectionHtmlId || "").trim(),
  );
  if (fromTemplate) return fromTemplate;
  const cfg = parseConfig(row?.configJson || "{}");
  const fromConfig = normalizeAnnouncementSectionHtmlId(
    String(cfg.sectionHtmlId || "").trim(),
  );
  return fromConfig || `sce-ab-${row?.id || generateAnnouncementSectionHtmlId()}`;
}

export function buildAnnouncementTemplate({
  rowId,
  name,
  barType,
  configJson,
  customHtml,
  customLiquid,
  customCss,
  templateJson,
  sectionHtmlId,
}) {
  const cfg = parseConfig(configJson || "{}");
  const parsedSectionId = normalizeAnnouncementSectionHtmlId(sectionHtmlId || "");
  const sectionId =
    parsedSectionId ||
    resolveSectionHtmlIdFromHeader({
      id: rowId,
      configJson,
      templateJson,
    });
  const existing = parseTemplateJson(templateJson) || {};
  return {
    ...existing,
    version: 1,
    sectionHtmlId: sectionId,
    header: {
      ...(existing.header || {}),
      title: String(name || ""),
    },
    body: {
      ...(existing.body || {}),
      messages: Array.isArray(cfg.messages) ? cfg.messages : [],
    },
    rate: {
      ...(existing.rate || {}),
      value: String(existing?.rate?.value || ""),
    },
    discount: {
      ...(existing.discount || {}),
      value: String(existing?.discount?.value || ""),
    },
    uiBlocks: Array.isArray(existing.uiBlocks) ? existing.uiBlocks : [],
    render: {
      barType,
      config: { ...cfg, sectionHtmlId: sectionId },
      customHtml: String(customHtml || ""),
      customLiquid: String(customLiquid || ""),
      customCss: String(customCss || ""),
    },
  };
}

export function templateRenderPayload(template, fallbackRow) {
  const render =
    template?.render && typeof template.render === "object"
      ? template.render
      : {};
  const fallbackConfig = parseConfig(fallbackRow?.configJson || "{}");
  return {
    sectionHtmlId:
      normalizeAnnouncementSectionHtmlId(
        String(
          template?.sectionHtmlId || render?.config?.sectionHtmlId || "",
        ).trim(),
      ) || `sce-ab-${fallbackRow?.id || generateAnnouncementSectionHtmlId()}`,
    barType: String(render?.barType || fallbackRow?.barType || "sticky"),
    config:
      render?.config && typeof render.config === "object"
        ? render.config
        : fallbackConfig,
    customHtml: String(render?.customHtml ?? fallbackRow?.customHtml ?? ""),
    customLiquid: String(render?.customLiquid ?? fallbackRow?.customLiquid ?? ""),
    customCss: String(render?.customCss ?? fallbackRow?.customCss ?? ""),
  };
}
