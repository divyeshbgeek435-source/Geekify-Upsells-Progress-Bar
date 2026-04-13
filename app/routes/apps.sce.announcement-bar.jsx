import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { renderAnnouncementLiquid } from "../utils/announcementLiquid";
import { enforceSingleActiveAnnouncementBar } from "../utils/announcementBarActive.server";

/**
 * App proxy: GET https://{shop}/apps/sce/announcement-bar?id={barId}
 * Omit `id` to use the shop's most recently updated active bar (no paste in theme).
 * Requires [app_proxy] in shopify.app.toml (subpath sce).
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();

  if (!shop) {
    return Response.json({ ok: false, error: "missing_shop" }, { status: 400 });
  }

  await enforceSingleActiveAnnouncementBar(shop, id || null);

  if (id) {
    const anyBar = await prisma.announcementBar.findFirst({
      where: { shop, id },
    });
    if (anyBar && !anyBar.active) {
      return Response.json(
        { ok: false, error: "inactive", hint: "Turn the bar on in the app (Active checkbox)." },
        { status: 404 },
      );
    }
  }

  const bar = id
    ? await prisma.announcementBar.findFirst({
        where: { shop, id, active: true },
      })
    : await prisma.announcementBar.findFirst({
        where: { shop, active: true },
        orderBy: { updatedAt: "desc" },
      });

  if (!bar) {
    return Response.json(
      {
        ok: false,
        error: "not_found",
        hint: id
          ? "Check the Bar ID matches the app and the bar is active."
          : "Create an active announcement bar in the app.",
      },
      { status: 404 },
    );
  }

  let config = {};
  try {
    config = JSON.parse(bar.configJson || "{}");
    if (typeof config !== "object" || config === null) config = {};
  } catch {
    config = {};
  }

  const liquidSrc = String(bar.customLiquid ?? "").trim();
  let customHtml = bar.customHtml ?? "";
  if (liquidSrc) {
    try {
      const rendered = await renderAnnouncementLiquid(liquidSrc, shop);
      if (String(rendered ?? "").trim()) customHtml = rendered;
    } catch {
      /* keep stored customHtml on template error */
    }
  }

  return Response.json({
    ok: true,
    id: bar.id,
    barType: bar.barType,
    config,
    customHtml,
    customCss: bar.customCss ?? "",
  });
};
