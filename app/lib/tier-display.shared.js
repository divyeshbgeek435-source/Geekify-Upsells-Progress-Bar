/** Shared tier caption + eligibility helpers (admin preview, app proxy, storefront). */

function parseTierDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveTierStatus(tier, now = new Date()) {
  if (!tier) return "INACTIVE";
  if (tier.active === false) return "INACTIVE";
  const start = parseTierDate(tier.scheduleStartAt);
  const end = parseTierDate(tier.scheduleEndAt);
  if (start && now < start) return "SCHEDULED";
  if (end && now > end) return "EXPIRED";
  return "ACTIVE";
}

export function resolveDiscountStatus(discount, now = new Date()) {
  if (!discount) return "INACTIVE";
  const start = parseTierDate(discount.scheduleStartAt);
  const end = parseTierDate(discount.scheduleEndAt);
  if (end && now > end) return "EXPIRED";
  if (start && now < start) return "SCHEDULED";
  if (discount.active === false) return "INACTIVE";
  return "ACTIVE";
}

export function normalizeTierName(tier, fallback = "Tier") {
  const name = String(tier?.name ?? "").trim();
  return name || fallback;
}

/** Active tiers belonging to an active discount, sorted by minimum subtotal. */
export function resolveEligibleActiveTiers(tierRules, tierDiscounts, now = new Date()) {
  const discountByName = new Map(
    (tierDiscounts || []).map((discount) => [String(discount.name || "").trim(), discount]),
  );
  return (tierRules || [])
    .filter((tier) => {
      if (resolveTierStatus(tier, now) !== "ACTIVE") return false;
      const discountName = String(tier.discountName || "Default Discount").trim();
      const linked = discountByName.get(discountName);
      if (!linked) return false;
      return resolveDiscountStatus(linked, now) === "ACTIVE";
    })
    .sort((a, b) => Number(a.minSubtotal || 0) - Number(b.minSubtotal || 0));
}

export function resolveTierCaptionLabels(sortedTiers) {
  const tier1 = sortedTiers?.[0];
  const tier2 = sortedTiers?.[1];
  return {
    tier1LabelText: tier1 ? normalizeTierName(tier1, "Tier 1") : "",
    tier2LabelText: tier2 ? normalizeTierName(tier2, "Tier 2") : "",
  };
}

export function resolveWidgetPreviewMins(sortedTiers) {
  const tier1 = sortedTiers?.[0];
  const tier2 = sortedTiers?.[1];
  return {
    liveTier1Min: Math.max(0, Number(tier1?.minSubtotal || 0)),
    liveTier2Min: tier2 ? Math.max(0, Number(tier2.minSubtotal || 0)) : 0,
  };
}

export function resolveLiveWidgetProgress(subtotal, tier1Min, tier2Min) {
  const amount = Number(subtotal || 0);
  const t1 = Math.max(0, Number(tier1Min || 0));
  const t2 = Math.max(0, Number(tier2Min || 0));
  const hasTwoTiers = t2 > 0 && t2 > t1;

  if (t1 <= 0) return 0;
  if (!hasTwoTiers) {
    if (amount >= t1) return 100;
    return Math.max(0, Math.min(100, Math.round((amount / t1) * 100)));
  }
  if (amount >= t2) return 100;
  if (amount >= t1) {
    const range = t2 - t1;
    if (range <= 0) return 50;
    const pct = 50 + ((amount - t1) / range) * 50;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  return Math.max(0, Math.min(100, Math.round((amount / t1) * 50)));
}
