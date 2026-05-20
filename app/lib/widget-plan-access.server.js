import prisma from "../db.server";
import { canUseAdvancedWidgetSettings } from "./app-plans.shared.js";
import { mergeProgressBarDesign, sanitizeProgressBarDesignForDb } from "./progress-bar-design.js";

export async function loadTierWidgetSettingsForShop(shop) {
  if (typeof prisma.tierWidgetSettings?.findUnique !== "function") return null;
  try {
    return await prisma.tierWidgetSettings.findUnique({ where: { shop } });
  } catch {
    return null;
  }
}

/** Free plan may only change badge background/icon colors in progress bar design. */
export function mergeFreePlanProgressBarDesign(existingRaw, submittedRaw) {
  const existing = mergeProgressBarDesign(existingRaw);
  const submitted = mergeProgressBarDesign(submittedRaw);
  const next = {
    ...existing,
    barStyle: {
      ...existing.barStyle,
      tier1: {
        before: { ...existing.barStyle.tier1.before },
        after: { ...existing.barStyle.tier1.after },
      },
      tier2: {
        before: { ...existing.barStyle.tier2.before },
        after: { ...existing.barStyle.tier2.after },
      },
    },
  };
  for (const tier of ["tier1", "tier2"]) {
    for (const phase of ["before", "after"]) {
      const bg = submitted.barStyle?.[tier]?.[phase]?.badgeBackgroundColor;
      const icon = submitted.barStyle?.[tier]?.[phase]?.iconColor;
      if (bg) next.barStyle[tier][phase].badgeBackgroundColor = bg;
      if (icon) next.barStyle[tier][phase].iconColor = icon;
    }
  }
  return JSON.stringify(sanitizeProgressBarDesignForDb(next));
}

export async function saveFreePlanWidgetSettings(shop, formData) {
  const progressBarDesignJsonRaw = String(formData.get("progressBarDesignJson") ?? "").trim();
  const tier1Icon = String(formData.get("tier1Icon") ?? "").trim();
  const tier2Icon = String(formData.get("tier2Icon") ?? "").trim();
  const widgetErrors = {};

  if (!tier1Icon) widgetErrors.tier1Icon = "Tier 1 icon is required";
  if (!tier2Icon) widgetErrors.tier2Icon = "Tier 2 icon is required";
  if (Object.keys(widgetErrors).length) {
    return { ok: false, errors: widgetErrors };
  }

  let submittedDesign = {};
  if (progressBarDesignJsonRaw) {
    try {
      submittedDesign = JSON.parse(progressBarDesignJsonRaw);
      if (!submittedDesign || typeof submittedDesign !== "object") {
        return { ok: false, errors: { progressBarDesignJson: "Invalid progress bar design" } };
      }
    } catch {
      return { ok: false, errors: { progressBarDesignJson: "Invalid progress bar design" } };
    }
  }

  if (typeof prisma.tierWidgetSettings?.upsert !== "function") {
    return {
      ok: false,
      errors: {
        progressBarDesignJson:
          "Widget settings are unavailable in the current runtime. Restart the dev server and try again.",
      },
    };
  }

  const existing = await loadTierWidgetSettingsForShop(shop);
  const progressBarDesignJson = mergeFreePlanProgressBarDesign(
    existing?.progressBarDesignJson,
    submittedDesign,
  );

  const defaults = existing || {};
  await prisma.tierWidgetSettings.upsert({
    where: { shop },
    create: {
      shop,
      progressBarDesignJson,
      tier1Icon,
      tier2Icon,
      sequentialMsg0:
        defaults.sequentialMsg0 ||
        "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
      sequentialMsg1: defaults.sequentialMsg1 || "Apply discount to unlock free shipping",
      sequentialMsg2: defaults.sequentialMsg2 || "Free shipping unlocked",
      sequentialHintZero:
        defaults.sequentialHintZero || "Progress: 0% - unlock Tier 1 to start.",
      sequentialHintMid:
        defaults.sequentialHintMid || "Progress: 50% - unlock Tier 2 for free shipping.",
      subtotalLabel: defaults.subtotalLabel || "Current subtotal",
      estimatedShippingLabel: defaults.estimatedShippingLabel || "Estimated shipping",
      minAmountPrefixText: defaults.minAmountPrefixText || "Min.",
      selectorTargets:
        defaults.selectorTargets ||
        ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
      nameTargetSelectors:
        defaults.nameTargetSelectors ||
        ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
      sequentialTitle: defaults.sequentialTitle || "Rewards progress",
    },
    update: {
      progressBarDesignJson,
      tier1Icon,
      tier2Icon,
    },
  });

  return { ok: true, tierIntent: "tier-widget-settings-save" };
}

export function assertAdvancedWidgetAccess(planId) {
  if (canUseAdvancedWidgetSettings(planId)) return null;
  return {
    ok: false,
    errors: {
      plan:
        "Advanced widget settings are available on Premium. Upgrade to unlock messages, bar styling, and visibility controls.",
    },
    planUpgradeRequired: true,
  };
}
