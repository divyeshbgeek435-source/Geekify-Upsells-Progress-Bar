import { authenticate } from "../shopify.server";
import {
  defaultAdditionalConfig,
  parseAdditionalConfig,
  resolveSectionId,
} from "../lib/additional-ui-config.js";
import { templateRenderPayload } from "../lib/additional-ui-template.js";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  const sectionId = String(url.searchParams.get("sectionId") || "").trim().toLowerCase();
  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  let rows = [];
  try {
    rows = await prisma.announcementBody.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sectionId: true,
        updatedAt: true,
        bodyJson: true,
        templateJson: true,
      },
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("Unknown field `templateJson`")) throw error;
    rows = await prisma.announcementBody.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      select: { id: true, sectionId: true, updatedAt: true, bodyJson: true },
    });
  }

  const matchedRow = rows.find((entry) => {
    const parsedConfig = parseAdditionalConfig(entry.bodyJson);
    const normalizedSectionId = resolveSectionId(
      { ...parsedConfig, sectionId: entry.sectionId || parsedConfig.sectionId },
      entry.id,
    );
    return normalizedSectionId === sectionId;
  });
  const row = matchedRow || rows[0] || null;
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
    id: row?.id ?? "default",
    version: `${row?.id || "default"}:${row?.updatedAt?.toISOString?.() || "base"}`,
    updatedAt: row?.updatedAt?.toISOString?.() || null,
    config: payload.config,
    template,
  });
};
