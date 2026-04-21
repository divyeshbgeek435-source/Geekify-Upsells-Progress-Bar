import { authenticate } from "../shopify.server";
import {
  defaultAdditionalConfig,
  parseAdditionalConfig,
  resolveSectionId,
} from "../lib/additional-ui-config.js";
import prisma from "../db.server";

const BAR_TYPE = "additional_ui";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  const row = await prisma.announcementBar.findFirst({
    where: { shop, barType: BAR_TYPE },
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true, configJson: true },
  });

  const parsed = row ? parseAdditionalConfig(row.configJson) : defaultAdditionalConfig();
  const config = {
    ...parsed,
    sectionId: resolveSectionId(parsed, row?.id),
  };

  return Response.json({
    ok: true,
    id: row?.id ?? "default",
    version: `${row?.id || "default"}:${row?.updatedAt?.toISOString?.() || "base"}`,
    updatedAt: row?.updatedAt?.toISOString?.() || null,
    config,
  });
};
