import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";
import {
  parseSequentialUnlockConfig,
  parseSequentialUnlockLevel,
} from "./sequential_unlock.js";

/**
  * @typedef {import("../generated/api").DeliveryInput} RunInput
  * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
  */

export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return {operations: []};
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );

  if (!hasShippingDiscountClass) {
    return {operations: []};
  }
  const config = parseFunctionConfig(input?.discount?.metafield?.jsonValue);
  const sequential = parseSequentialUnlockConfig(
    input?.discount?.metafield?.jsonValue,
  );
  const unlockLevel = parseSequentialUnlockLevel(input.cart);

  if (sequential.enabled) {
    if (unlockLevel < 2) {
      return {operations: []};
    }
    return {
      operations: [
        {
          deliveryDiscountsAdd: {
            candidates: [
              {
                message: config.shipping.message,
                targets: [
                  {
                    deliveryGroup: {
                      id: firstDeliveryGroup.id,
                    },
                  },
                ],
                value: {
                  percentage: {
                    value: 100,
                  },
                },
              },
            ],
            selectionStrategy: DeliveryDiscountSelectionStrategy.All,
          },
        },
      ],
    };
  }

  const subtotal = normalizeAmount(input?.cart?.cost?.subtotalAmount?.amount);
  const threshold = config.thresholdTiers;
  const tier1Qualified = subtotal >= Number(threshold?.tier1?.minSubtotal || 0);
  const tier1FreeShipping =
    threshold?.tier1?.type === "FREE_SHIPPING" && tier1Qualified;
  const dynamicFreeShippingTier = resolveQualifiedFreeShippingTier(config.tiers, subtotal);
  const tierDecision = resolveShippingTier(subtotal, config.shipping);

  if (!tier1FreeShipping && !dynamicFreeShippingTier && tierDecision.shippingCharge > 0) {
    // Shopify Functions can discount shipping, but cannot add a surcharge.
    return {operations: []};
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: dynamicFreeShippingTier
                ? String(dynamicFreeShippingTier?.message || "Free shipping unlocked")
                : tier1FreeShipping
                ? String(threshold?.tier1?.message || "Free shipping unlocked")
                : tierDecision.message,
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 100,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

function parseFunctionConfig(raw) {
  const base = {
    tiers: [],
    thresholdTiers: {
      tier1: {
        type: "FREE_SHIPPING",
        minSubtotal: 500,
        discountPercentage: 5,
        message: "You have free shipping!",
      },
      tier2: {
        minSubtotal: 1000,
        discountPercentage: 20,
        message: "20% off unlocked",
      },
    },
    shipping: {
      message: "You have free shipping!",
      defaultCharge: 50,
      tiers: [
        { min: 500, max: 999.99, shipping: 0, message: "You have free shipping!" },
        { min: 1000, max: null, shipping: 50, message: "Shipping charge Rs 50 applied" },
      ],
    },
  };
  if (!raw || typeof raw !== 'object') return base;
  return {
    tiers: normalizeRuntimeTiers(raw?.tiers),
    thresholdTiers: normalizeThresholdTiers(raw?.thresholdTiers, base.thresholdTiers),
    shipping: {
      message: String(raw?.shipping?.message || base.shipping.message),
      defaultCharge: normalizeAmount(raw?.shipping?.defaultCharge, base.shipping.defaultCharge),
      tiers: normalizeTiers(raw?.shipping?.tiers, base.shipping.tiers),
    },
  };
}

function normalizeRuntimeTiers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tier) => ({
      minSubtotal: normalizeAmount(tier?.minSubtotal, 0),
      rewardType:
        String(tier?.rewardType || "").trim().toUpperCase() === "FREE_SHIPPING"
          ? "FREE_SHIPPING"
          : "PERCENTAGE",
      discountPercentage: normalizeAmount(tier?.discountPercentage, 0),
      message: String(tier?.message || ""),
      active: tier?.active !== false,
    }))
    .filter((tier) => tier.active)
    .sort((a, b) => a.minSubtotal - b.minSubtotal);
}

function resolveQualifiedFreeShippingTier(runtimeTiers, subtotal) {
  if (!Array.isArray(runtimeTiers) || runtimeTiers.length === 0) return null;
  let matchedTier = null;
  for (const tier of runtimeTiers) {
    if (subtotal < Number(tier.minSubtotal || 0)) continue;
    const isFreeShipping =
      String(tier.rewardType || "").trim().toUpperCase() === "FREE_SHIPPING";
    if (isFreeShipping) matchedTier = tier;
  }
  return matchedTier;
}

function normalizeThresholdTiers(value, fallback) {
  const src = value && typeof value === "object" ? value : {};
  const tier1 = src.tier1 && typeof src.tier1 === "object" ? src.tier1 : {};
  const tier2 = src.tier2 && typeof src.tier2 === "object" ? src.tier2 : {};
  return {
    tier1: {
      type: normalizeTier1Type(tier1.type, fallback.tier1.type),
      minSubtotal: normalizeAmount(tier1.minSubtotal, fallback.tier1.minSubtotal),
      discountPercentage: normalizeAmount(tier1.discountPercentage, fallback.tier1.discountPercentage),
      message: String(tier1.message || fallback.tier1.message),
    },
    tier2: {
      minSubtotal: normalizeAmount(tier2.minSubtotal, fallback.tier2.minSubtotal),
      discountPercentage: normalizeAmount(tier2.discountPercentage, fallback.tier2.discountPercentage),
      message: String(tier2.message || fallback.tier2.message),
    },
  };
}

function normalizeTier1Type(value, fallback) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "FREE_SHIPPING") return "FREE_SHIPPING";
  if (normalized === "DISCOUNT") return "DISCOUNT";
  return fallback;
}

function normalizeAmount(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeTiers(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const tiers = value
    .map((tier) => ({
      min: normalizeAmount(tier?.min, 0),
      max: tier?.max == null ? null : normalizeAmount(tier?.max, null),
      shipping: normalizeAmount(tier?.shipping, 0),
      message: tier?.message ? String(tier.message) : "",
    }))
    .filter((tier) => tier.max == null || tier.max >= tier.min)
    .sort((a, b) => a.min - b.min);
  return tiers.length ? tiers : fallback;
}

function resolveShippingTier(subtotal, shippingConfig) {
  const matchedTier = shippingConfig.tiers.find((tier) => {
    if (subtotal < tier.min) return false;
    if (tier.max == null) return true;
    return subtotal <= tier.max;
  });
  if (!matchedTier) {
    return {
      shippingCharge: shippingConfig.defaultCharge,
      message: shippingConfig.message,
    };
  }
  return {
    shippingCharge: matchedTier.shipping,
    message: matchedTier.message || shippingConfig.message,
  };
}