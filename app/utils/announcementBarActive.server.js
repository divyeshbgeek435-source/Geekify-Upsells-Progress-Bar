import prisma from "../db.server";

/**
 * Ensures at most one active announcement bar per shop.
 * If several are active (legacy data), keeps either `preferredId` when it is active,
 * otherwise the most recently updated active bar. Deactivates the rest.
 */
export async function enforceSingleActiveAnnouncementBar(shop, preferredId = null) {
  const trimmedShop = String(shop || "").trim();
  if (!trimmedShop) return;

  const actives = await prisma.announcementBar.findMany({
    where: { shop: trimmedShop, active: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (actives.length <= 1) return;

  const preferred = preferredId ? String(preferredId).trim() : "";
  const preferredIsActive = preferred && actives.some((a) => a.id === preferred);
  const keepId = preferredIsActive ? preferred : actives[0].id;

  const toDeactivate = actives.filter((a) => a.id !== keepId).map((a) => a.id);
  if (!toDeactivate.length) return;

  await prisma.announcementBar.updateMany({
    where: { id: { in: toDeactivate }, shop: trimmedShop },
    data: { active: false },
  });
}
