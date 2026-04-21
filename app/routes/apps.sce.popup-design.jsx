import { authenticate } from "../shopify.server";
import { parsePopupDesignConfig, resolvePopupDesignId } from "../lib/popup-design-config.js";
import prisma from "../db.server";

const BAR_TYPE = "popup_design";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  const requestedDesignId = (
    url.searchParams.get("popup_design_id") ||
    url.searchParams.get("id") ||
    ""
  ).trim();

  const rows = await prisma.announcementBar.findMany({
    where: { shop, barType: BAR_TYPE },
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true, configJson: true },
  });

  let row = null;
  if (requestedDesignId) {
    for (const r of rows) {
      const parsed = parsePopupDesignConfig(r.configJson);
      const resolvedId = resolvePopupDesignId(parsed, r.id);
      if (resolvedId === requestedDesignId) {
        row = r;
        break;
      }
    }
  } else if (rows.length === 1) {
    // Backward compatibility: single saved popup, theme block without query param
    row = rows[0];
  }

  if (!row) {
    return Response.json({
      ok: false,
      error: requestedDesignId ? "popup_not_found" : "popup_design_id_required",
      matched: false,
    });
  }

  const parsed = parsePopupDesignConfig(row.configJson);
  const config = {
    ...parsed,
    popupDesignId: resolvePopupDesignId(parsed, row.id),
  };

  return Response.json({
    ok: true,
    id: row.id,
    version: `${row.id}:${row.updatedAt?.toISOString?.() || ""}`,
    updatedAt: row.updatedAt?.toISOString?.() || null,
    config,
    matched: true,
  });
};
