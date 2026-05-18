import prisma from "../db.server";
import { canUseAdvancedWidgetSettings } from "./app-plans.shared.js";

export async function loadTierWidgetSettingsForShop(shop) {
  if (typeof prisma.tierWidgetSettings?.findUnique !== "function") return null;
  try {
    return await prisma.tierWidgetSettings.findUnique({ where: { shop } });
  } catch {
    return null;
  }
}

/**
 * Free plan may only change tier label text.
 * All other fields are preserved from the existing row.
 */
export function mergeFreePlanWidgetSettingsFromForm(existing, formData) {
  const row = existing || {};
  const tier1LabelText = String(formData.get("tier1LabelText") ?? "").trim();
  const tier2LabelText = String(formData.get("tier2LabelText") ?? "").trim();

  return {
    ...row,
    tier1LabelText: tier1LabelText || row.tier1LabelText || "Discount",
    tier2LabelText: tier2LabelText || row.tier2LabelText || "Free shipping",
  };
}

export function validateFreePlanWidgetSettingsForm(formData) {
  const errors = {};
  const tier1LabelText = String(formData.get("tier1LabelText") ?? "").trim();
  const tier2LabelText = String(formData.get("tier2LabelText") ?? "").trim();

  if (!tier1LabelText) errors.tier1LabelText = "Tier 1 label is required";
  if (!tier2LabelText) errors.tier2LabelText = "Tier 2 label is required";
  return errors;
}

export async function saveFreePlanWidgetSettings(shop, formData) {
  const widgetErrors = validateFreePlanWidgetSettingsForm(formData);
  if (Object.keys(widgetErrors).length) {
    return { ok: false, errors: widgetErrors };
  }

  if (typeof prisma.tierWidgetSettings?.upsert !== "function") {
    return {
      ok: false,
      errors: {
        tier1LabelText:
          "Widget settings are unavailable in the current runtime. Restart the dev server and try again.",
      },
    };
  }

  const existing = await loadTierWidgetSettingsForShop(shop);
  const merged = mergeFreePlanWidgetSettingsFromForm(existing, formData);
  const {
    sequentialMsg0 = "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
    sequentialMsg1 = "Apply discount to unlock free shipping",
    sequentialMsg2 = "Free shipping unlocked",
    sequentialHintZero = "Progress: 0% - unlock Tier 1 to start.",
    sequentialHintMid = "Progress: 50% - unlock Tier 2 for free shipping.",
    tier1Icon = "%",
    tier2Icon = "truck",
    subtotalLabel = "Current subtotal",
    estimatedShippingLabel = "Estimated shipping",
    minAmountPrefixText = "Min.",
    showTierIcons = true,
    showTierLabels = true,
    showTierMinimums = true,
    widgetDynamicConfigJson = "{}",
    selectorTargets = ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
    nameTargetSelectors = ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
    sequentialTitle = "Rewards progress",
    progressBarDesignJson = "{}",
  } = merged;

  await prisma.tierWidgetSettings.upsert({
    where: { shop },
    create: {
      shop,
      sequentialMsg0,
      sequentialMsg1,
      sequentialMsg2,
      sequentialHintZero,
      sequentialHintMid,
      tier1Icon,
      tier2Icon,
      subtotalLabel,
      estimatedShippingLabel,
      widgetBackgroundColor: merged.widgetBackgroundColor,
      widgetTextColor: merged.widgetTextColor,
      widgetBorderColor: merged.widgetBorderColor,
      widgetUseCustomColors: merged.widgetUseCustomColors,
      tier1LabelText: merged.tier1LabelText,
      tier2LabelText: merged.tier2LabelText,
      minAmountPrefixText,
      showTierIcons,
      showTierLabels,
      showTierMinimums,
      widgetDynamicConfigJson,
      selectorTargets,
      nameTargetSelectors,
      sequentialTitle,
      progressBarDesignJson,
    },
    update: {
      tier1LabelText: merged.tier1LabelText,
      tier2LabelText: merged.tier2LabelText,
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
        "Advanced widget settings are available on Premium. Upgrade to unlock messages, icons, progress bar styling, and visibility controls.",
    },
    planUpgradeRequired: true,
  };
}
