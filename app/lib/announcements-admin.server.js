import prisma from "../db.server";
import { getShopifyAppClientId } from "./shopify-config.server";
import { parseConfig } from "./announcement-bar-config.js";
import {
  generateAnnouncementSectionHtmlId,
  normalizeAnnouncementSectionHtmlId,
} from "./announcement-section-html-id.js";
import {
  buildAnnouncementTemplate,
  resolveSectionHtmlIdFromHeader,
} from "./announcement-header-template.js";
import {
  parseAdditionalConfig,
  resolveSectionId,
} from "./additional-ui-config.js";
import { buildAdditionalTemplate } from "./additional-ui-template.js";

const ANNOUNCE_EMBED_HANDLE = "announcement-bar-embed";
const ANNOUNCE_BLOCK_HANDLE = "announcement-bar-block";

export async function loadAnnouncementHeaderAdminContext(shop, editId) {
  const bars = await prisma.announcementHeader.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });

  const editingBar = editId ? bars.find((b) => b.id === editId) ?? null : null;

  const clientId = getShopifyAppClientId();
  const storeHandle = shop.replace(/\.myshopify\.com$/i, "");
  const editorBase = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`;
  const embedQuery = new URLSearchParams({
    context: "apps",
    activateAppId: `${clientId}/${ANNOUNCE_EMBED_HANDLE}`,
  });
  const blockHeaderQuery = new URLSearchParams({
    template: "index",
    addAppBlockId: `${clientId}/${ANNOUNCE_BLOCK_HANDLE}`,
    target: "sectionGroup:header",
  });

  return {
    shop,
    bars,
    editingBar,
    announcementBarEditorUrl: `${editorBase}?${embedQuery.toString()}`,
    announcementBarBlockHeaderUrl: `${editorBase}?${blockHeaderQuery.toString()}`,
    clientIdConfigured: Boolean(clientId),
  };
}

export async function loadAnnouncementBodyAdminBlocks(shop) {
  let rows = [];
  try {
    rows = await prisma.announcementBody.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        sectionId: true,
        bodyJson: true,
        templateJson: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("Unknown field `templateJson`")) throw error;
    rows = await prisma.announcementBody.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, sectionId: true, bodyJson: true, updatedAt: true },
    });
  }

  return rows.map((row) => {
    const parsed = parseAdditionalConfig(row.bodyJson);
    return {
      rowId: row.id,
      name: row.name,
      config: {
        ...parsed,
        sectionId: resolveSectionId(
          { ...parsed, sectionId: row.sectionId || parsed.sectionId },
          row.id,
        ),
      },
      updatedAt: row.updatedAt.toISOString(),
      templateJson: row.templateJson ?? "{}",
    };
  });
}

export async function handleAnnouncementHeaderAdminAction(shop, form) {
  const intent = String(form.get("intent") || "");

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    await prisma.announcementHeader.deleteMany({ where: { id, shop } });
    return { ok: true, deleted: true };
  }

  const name = String(form.get("name") || "").trim();
  const barType = String(form.get("barType") || "sticky");
  const configJson = String(form.get("configJson") || "{}");
  const customHtml = String(form.get("customHtml") ?? "");
  const customLiquid = String(form.get("customLiquid") ?? "");
  const customCss = String(form.get("customCss") ?? "");
  const templateJsonRaw = String(form.get("templateJson") || "").trim();
  const id = String(form.get("id") || "");

  const cfgParsed = parseConfig(configJson);
  const sectionHtmlIdRaw = String(cfgParsed.sectionHtmlId ?? "").trim();
  const parsedSectionId = normalizeAnnouncementSectionHtmlId(sectionHtmlIdRaw);
  if (sectionHtmlIdRaw && !parsedSectionId) {
    return {
      ok: false,
      error:
        "Section HTML ID must start with a letter and only contain letters, numbers, hyphens, and underscores.",
    };
  }
  const sectionHtmlIdFinal = parsedSectionId || generateAnnouncementSectionHtmlId();

  const others = await prisma.announcementHeader.findMany({
    where: { shop, ...(id ? { NOT: { id } } : {}) },
    select: { id: true, configJson: true },
  });
  for (const row of others) {
    if (resolveSectionHtmlIdFromHeader(row) === sectionHtmlIdFinal) {
      return {
        ok: false,
        error: "That section HTML ID is already used by another announcement bar in this shop.",
      };
    }
  }

  const cfgOut = { ...cfgParsed, sectionHtmlId: sectionHtmlIdFinal };
  const configJsonOut = JSON.stringify(cfgOut);

  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  const templatePayload = buildAnnouncementTemplate({
    rowId: id || undefined,
    name,
    barType,
    configJson: configJsonOut,
    customHtml,
    customLiquid,
    customCss,
    templateJson: templateJsonRaw,
    sectionHtmlId: sectionHtmlIdFinal,
  });

  if (intent === "create") {
    let created;
    try {
      created = await prisma.announcementHeader.create({
        data: {
          shop,
          name,
          barType,
          configJson: configJsonOut,
          templateJson: JSON.stringify(templatePayload),
          customHtml,
          customLiquid,
          customCss,
        },
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (!message.includes("Unknown argument `templateJson`")) throw error;
      created = await prisma.announcementHeader.create({
        data: {
          shop,
          name,
          barType,
          configJson: configJsonOut,
          customHtml,
          customLiquid,
          customCss,
        },
      });
    }
    return { ok: true, createdId: created.id };
  }

  if (intent === "update") {
    let result;
    try {
      result = await prisma.announcementHeader.updateMany({
        where: { id, shop },
        data: {
          name,
          barType,
          configJson: configJsonOut,
          templateJson: JSON.stringify(templatePayload),
          customHtml,
          customLiquid,
          customCss,
        },
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (!message.includes("Unknown argument `templateJson`")) throw error;
      result = await prisma.announcementHeader.updateMany({
        where: { id, shop },
        data: {
          name,
          barType,
          configJson: configJsonOut,
          customHtml,
          customLiquid,
          customCss,
        },
      });
    }
    if (result.count === 0) {
      return { ok: false, error: "Bar not found." };
    }
    return { ok: true };
  }

  return { ok: false, error: "Unknown action." };
}

export async function handleAnnouncementBodyAdminAction(shop, form) {
  const intent = String(form.get("intent") || "");

  if (intent === "delete") {
    const rowId = String(form.get("rowId") || "").trim();
    if (!rowId) return { ok: false, error: "Missing row id." };

    await prisma.announcementBody.deleteMany({
      where: { id: rowId, shop },
    });
    return { ok: true, intent: "delete" };
  }

  if (intent !== "save") {
    return { ok: false, error: "Unknown action." };
  }

  let messagesPosted = [];
  try {
    messagesPosted = JSON.parse(String(form.get("messagesJson") || "[]"));
  } catch {
    messagesPosted = [];
  }
  if (!Array.isArray(messagesPosted)) messagesPosted = [];

  const config = parseAdditionalConfig(
    JSON.stringify({
      sectionId: String(form.get("sectionId") || "").trim(),
      displayMode: String(form.get("displayMode") || "stack"),
      rotateIntervalMs: Number(form.get("rotateIntervalMs") || 3000),
      rotateDirection: String(form.get("rotateDirection") || "forward"),
      rotateAutoplay: form.get("rotateAutoplay") !== "false",
      rotatePauseOnHover: form.get("rotatePauseOnHover") !== "false",
      marqueeDurationSeconds: Number(form.get("marqueeDurationSeconds") || 18),
      marqueeDirection: String(form.get("marqueeDirection") || "rtl"),
      marqueeSeparator: String(form.get("marqueeSeparator") || "•"),
      marqueeSeparatorRepeat: Number(form.get("marqueeSeparatorRepeat") || 1),
      marqueeTrailingSeparator: form.get("marqueeTrailingSeparator") !== "false",
      marqueeFullWidth: form.get("marqueeFullWidth") !== "false",
      gapPx: Number(form.get("gapPx") || 24),
      fontSizePx: Number(form.get("fontSizePx") || 22),
      paddingYpx: Number(form.get("paddingYpx") || 14),
      paddingXpx: Number(form.get("paddingXpx") || 16),
      backgroundColor: String(form.get("backgroundColor") || "#b8f441"),
      textColor: String(form.get("textColor") || "#0f172a"),
      messages: messagesPosted,
      policyContentSafe: form.get("policyContentSafe") !== "false",
      policyNoFalseClaims: form.get("policyNoFalseClaims") !== "false",
      policyAccessibilityReady: form.get("policyAccessibilityReady") !== "false",
      comments: String(form.get("comments") || "").trim(),
    }),
  );

  const rowId = String(form.get("rowId") || "").trim();
  const conflicts = await prisma.announcementBody.findMany({
    where: { shop },
    select: { id: true, sectionId: true, bodyJson: true },
  });
  const hasDuplicateId = conflicts.some((entry) => {
    if (rowId && entry.id === rowId) return false;
    const parsed = parseAdditionalConfig(entry.bodyJson);
    const existingSectionId = resolveSectionId(
      { ...parsed, sectionId: entry.sectionId || parsed.sectionId },
      entry.id,
    );
    return existingSectionId === config.sectionId;
  });
  if (hasDuplicateId) {
    return { ok: false, error: "Block ID already exists. Use a unique 12-character ID." };
  }

  const bodyJson = JSON.stringify(config);
  const templatePayload = buildAdditionalTemplate({
    name: `Additional UI ${config.sectionId}`,
    sectionId: config.sectionId,
    bodyJson,
    templateJson: String(form.get("templateJson") || ""),
  });

  if (rowId) {
    let updated;
    try {
      updated = await prisma.announcementBody.update({
        where: { id: rowId },
        data: {
          name: `Additional UI ${config.sectionId}`,
          sectionId: config.sectionId,
          bodyJson,
          templateJson: JSON.stringify(templatePayload),
          active: false,
        },
        select: { id: true, updatedAt: true },
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (!message.includes("Unknown argument `templateJson`")) throw error;
      updated = await prisma.announcementBody.update({
        where: { id: rowId },
        data: {
          name: `Additional UI ${config.sectionId}`,
          sectionId: config.sectionId,
          bodyJson,
          active: false,
        },
        select: { id: true, updatedAt: true },
      });
    }
    return {
      ok: true,
      intent: "save",
      savedId: updated.id,
      savedAt: updated.updatedAt.toISOString(),
    };
  }

  let created;
  try {
    created = await prisma.announcementBody.create({
      data: {
        shop,
        name: `Additional UI ${config.sectionId}`,
        sectionId: config.sectionId,
        bodyJson,
        templateJson: JSON.stringify(templatePayload),
        active: false,
      },
      select: { id: true, updatedAt: true },
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("Unknown argument `templateJson`")) throw error;
    created = await prisma.announcementBody.create({
      data: {
        shop,
        name: `Additional UI ${config.sectionId}`,
        sectionId: config.sectionId,
        bodyJson,
        active: false,
      },
      select: { id: true, updatedAt: true },
    });
  }
  return {
    ok: true,
    intent: "save",
    savedId: created.id,
    savedAt: created.updatedAt.toISOString(),
  };
}

function inferAnnouncementFormKind(form) {
  const explicit = String(form.get("recordKind") || "").trim().toLowerCase();
  if (explicit === "body" || explicit === "header") return explicit;
  const intent = String(form.get("intent") || "");
  if (intent === "delete" && form.has("rowId") && String(form.get("rowId") || "").trim()) {
    return "body";
  }
  if (form.has("messagesJson")) return "body";
  return "header";
}

export async function handleAnnouncementsUnifiedAction(shop, form) {
  const kind = inferAnnouncementFormKind(form);
  if (kind === "body") return handleAnnouncementBodyAdminAction(shop, form);
  return handleAnnouncementHeaderAdminAction(shop, form);
}
