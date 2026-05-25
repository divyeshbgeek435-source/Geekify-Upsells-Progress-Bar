import { parsePopupDesignConfig } from "./popup-design-config.js";
import { popupTargetConflictKey } from "./popup-page-target.shared.js";

/**
 * @returns {Promise<string | null>} id of another active popup with the same target key, or null
 */
export async function findOtherActivePopupSameTarget(prisma, shop, excludeRowId, config) {
  const key = popupTargetConflictKey(config);
  const rows = await prisma.popupDesign.findMany({
    where: {
      shop,
      active: true,
      ...(excludeRowId ? { id: { not: excludeRowId } } : {}),
    },
    select: { id: true, configJson: true },
  });
  for (const r of rows) {
    const cfg = parsePopupDesignConfig(r.configJson);
    if (popupTargetConflictKey(cfg) === key) return r.id;
  }
  return null;
}
