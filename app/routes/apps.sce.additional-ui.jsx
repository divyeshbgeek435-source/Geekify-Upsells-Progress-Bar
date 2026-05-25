import {
  defaultAdditionalConfig,
  parseAdditionalConfig,
  resolveSectionId,
} from "../lib/additional-ui-config.js";
import { authenticateAppProxyRequest, prismaShopInClause } from "../lib/app-proxy.server.js";
import { templateRenderPayload } from "../lib/additional-ui-template.js";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { shop, errorResponse } = await authenticateAppProxyRequest(request);
  if (errorResponse) return errorResponse;
  const shopWhere = prismaShopInClause(shop);
  if (!shopWhere) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }
  const url = new URL(request.url);
  const sectionId = String(url.searchParams.get("sectionId") || "").trim().toLowerCase();

  let rows = [];
  try {
    rows = await prisma.announcementBody.findMany({
      where: shopWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sectionId: true,
        updatedAt: true,
        bodyJson: true,
        templateJson: true,
        active: true,
      },
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("Unknown field `templateJson`")) throw error;
    rows = await prisma.announcementBody.findMany({
      where: shopWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sectionId: true,
        updatedAt: true,
        bodyJson: true,
        active: true,
      },
    });
  }

  if (!sectionId) {
    return Response.json(
      {
        ok: false,
        error: "missing_section_id",
        active: false,
        hint: "Set the Section ID in the theme block to match an announcement section in the app.",
      },
      { status: 400 },
    );
  }

  const matchedRow = rows.find((entry) => {
    const parsedConfig = parseAdditionalConfig(entry.bodyJson);
    const normalizedSectionId = resolveSectionId(
      { ...parsedConfig, sectionId: entry.sectionId || parsedConfig.sectionId },
      entry.id,
    );
    return normalizedSectionId === sectionId;
  });
  const row = matchedRow || null;

  if (!row) {
    return Response.json(
      {
        ok: false,
        error: "not_found",
        active: false,
        hint: "No announcement section matches this Section ID for this shop.",
      },
      { status: 404 },
    );
  }

  if (!row.active) {
    return Response.json(
      {
        ok: false,
        error: "section_inactive",
        active: false,
        hint: "This announcement section is turned off in the app. Turn Display on to show it on the storefront.",
      },
      { status: 404 },
    );
  }
  const parsed = row ? parseAdditionalConfig(row.bodyJson) : defaultAdditionalConfig();
  const config = {
    ...parsed,
    sectionId: resolveSectionId(
      { ...parsed, sectionId: row?.sectionId || parsed.sectionId },
      row?.id,
    ),
  };
  const template = (() => {
    try {
      return JSON.parse(String(row?.templateJson || "{}"));
    } catch {
      return {};
    }
  })();
  const payload = templateRenderPayload(template, row?.bodyJson);

  return Response.json({
    ok: true,
    active: true,
    id: row?.id ?? "default",
    version: `${row?.id || "default"}:${row?.updatedAt?.toISOString?.() || "base"}`,
    updatedAt: row?.updatedAt?.toISOString?.() || null,
    config: payload.config,
    template,
  });
};
