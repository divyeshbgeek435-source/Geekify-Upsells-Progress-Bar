import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';
import {
  parseSequentialUnlockConfig,
  parseSequentialUnlockLevel,
} from './sequential_unlock.js';


/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return {operations: []};
  }
  const subtotal = normalizeAmount(input?.cart?.cost?.subtotalAmount?.amount);

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return {operations: []};
  }

  const maxCartLine = input.cart.lines.reduce((maxLine, line) => {
    if (line.cost.subtotalAmount.amount > maxLine.cost.subtotalAmount.amount) {
      return line;
    }
    return maxLine;
  }, input.cart.lines[0]);

  const operations = [];
  const config = parseFunctionConfig(input?.discount?.metafield?.jsonValue);
  const sequential = parseSequentialUnlockConfig(
    input?.discount?.metafield?.jsonValue,
  );
  if (
    sequential.enabled &&
    parseSequentialUnlockLevel(input.cart) < 1
  ) {
    return {operations: []};
  }

  if (hasOrderDiscountClass) {
    const tierCandidates = resolveTierOrderCandidates(
      config.tiers,
      config.thresholdTiers,
      subtotal,
    );
    const candidates =
      tierCandidates.length > 0
        ? tierCandidates
        : [
            {
              message: config.order.message,
              targets: [
                {
                  orderSubtotal: {
                    excludedCartLineIds: [],
                  },
                },
              ],
              value:
                config.order.valueType === 'FIXED_AMOUNT'
                  ? {
                      fixedAmount: {
                        amount: config.order.amountOff,
                      },
                    }
                  : {
                      percentage: {
                        value: config.order.percentage,
                      },
                    },
            },
          ];

    if (candidates.length) {
      operations.push({
        orderDiscountsAdd: {
          candidates,
          selectionStrategy:
            tierCandidates.length > 1
              ? OrderDiscountSelectionStrategy.Maximum
              : mapOrderStrategy(config.order.selectionStrategy),
        },
      });
    }
  }

  if (hasProductDiscountClass) {
    const productValue =
      config.product.valueType === 'FIXED_AMOUNT'
        ? {
            fixedAmount: {
              amount: config.product.amountOff,
              appliesToEachItem: false,
            },
          }
        : {
            percentage: {
              value: config.product.percentage,
            },
          };

    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            message: config.product.message,
            targets: [
              {
                cartLine: {
                  id: maxCartLine.id,
                },
              },
            ],
            value: productValue,
          },
        ],
        selectionStrategy: mapProductStrategy(config.product.selectionStrategy),
      },
    });
  }

  return {
    operations,
  };
}

function parseFunctionConfig(raw) {
  const base = {
    tiers: [],
    thresholdTiers: {
      tier1: {
        type: 'FREE_SHIPPING',
        minSubtotal: 500,
        discountPercentage: 5,
        message: '5% off unlocked',
      },
      tier2: {
        minSubtotal: 1000,
        discountPercentage: 20,
        message: '20% off unlocked',
      },
    },
    order: {
      valueType: 'PERCENTAGE',
      amountOff: 5,
      percentage: 10,
      message: '10% OFF ORDER',
      selectionStrategy: 'FIRST',
    },
    product: {
      valueType: 'PERCENTAGE',
      amountOff: 5,
      percentage: 20,
      message: '20% OFF PRODUCT',
      selectionStrategy: 'FIRST',
    },
  };
  if (!raw || typeof raw !== 'object') return base;
  return {
    tiers: normalizeRuntimeTiers(raw?.tiers),
    thresholdTiers: normalizeThresholdTiers(raw?.thresholdTiers, base.thresholdTiers),
    order: {
      valueType: normalizeValueType(raw?.order?.valueType, base.order.valueType),
      amountOff: normalizeAmountOff(raw?.order?.amountOff, base.order.amountOff),
      percentage: normalizePercentage(raw?.order?.percentage, base.order.percentage),
      message: String(raw?.order?.message || base.order.message),
      selectionStrategy: String(raw?.order?.selectionStrategy || base.order.selectionStrategy).toUpperCase(),
    },
    product: {
      valueType: normalizeValueType(raw?.product?.valueType, base.product.valueType),
      amountOff: normalizeAmountOff(raw?.product?.amountOff, base.product.amountOff),
      percentage: normalizePercentage(raw?.product?.percentage, base.product.percentage),
      message: String(raw?.product?.message || base.product.message),
      selectionStrategy: String(raw?.product?.selectionStrategy || base.product.selectionStrategy).toUpperCase(),
    },
  };
}

function normalizeThresholdTiers(value, fallback) {
  const src = value && typeof value === 'object' ? value : {};
  const tier1 = src.tier1 && typeof src.tier1 === 'object' ? src.tier1 : {};
  const tier2 = src.tier2 && typeof src.tier2 === 'object' ? src.tier2 : {};
  return {
    tier1: {
      type: normalizeTier1Type(tier1.type, fallback.tier1.type),
      minSubtotal: normalizeAmountOff(tier1.minSubtotal, fallback.tier1.minSubtotal),
      discountPercentage: normalizePercentage(
        tier1.discountPercentage,
        fallback.tier1.discountPercentage,
      ),
      message: String(tier1.message || fallback.tier1.message),
    },
    tier2: {
      minSubtotal: normalizeAmountOff(tier2.minSubtotal, fallback.tier2.minSubtotal),
      discountPercentage: normalizePercentage(
        tier2.discountPercentage,
        fallback.tier2.discountPercentage,
      ),
      message: String(tier2.message || fallback.tier2.message),
    },
  };
}

function normalizeTier1Type(value, fallback) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'FREE_SHIPPING') return 'FREE_SHIPPING';
  if (normalized === 'DISCOUNT') return 'DISCOUNT';
  return fallback;
}

function normalizeRuntimeTiers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tier) => ({
      minSubtotal: normalizeAmount(tier?.minSubtotal, 0),
      rewardType:
        String(tier?.rewardType || '').trim().toUpperCase() === 'FREE_SHIPPING'
          ? 'FREE_SHIPPING'
          : 'PERCENTAGE',
      discountPercentage: normalizePercentage(tier?.discountPercentage, 0),
      message: String(tier?.message || ''),
      active: tier?.active !== false,
    }))
    .filter((tier) => tier.active)
    .sort((a, b) => a.minSubtotal - b.minSubtotal);
}

function resolveTierOrderCandidates(runtimeTiers, thresholdTiers, subtotal) {
  if (Array.isArray(runtimeTiers) && runtimeTiers.length) {
    let matchedTier = null;
    for (const tier of runtimeTiers) {
      const qualifies = subtotal >= Number(tier.minSubtotal || 0);
      const isDiscountTier =
        String(tier.rewardType || '').toUpperCase() === 'PERCENTAGE' &&
        Number(tier.discountPercentage || 0) > 0;
      if (qualifies && isDiscountTier) matchedTier = tier;
    }
    if (matchedTier) {
      return [
        {
          message: String(matchedTier.message || 'Tier discount unlocked'),
          targets: [
            {
              orderSubtotal: {
                excludedCartLineIds: [],
              },
            },
          ],
          value: {
            percentage: {
              value: Number(matchedTier.discountPercentage || 0),
            },
          },
        },
      ];
    }
    return [];
  }

  if (!thresholdTiers || typeof thresholdTiers !== 'object') return [];
  const result = [];
  const tier1 = thresholdTiers.tier1;
  const tier2 = thresholdTiers.tier2;
  if (
    tier1?.type === 'DISCOUNT' &&
    subtotal >= Number(tier1.minSubtotal || 0) &&
    Number(tier1.discountPercentage || 0) > 0
  ) {
    result.push({
      message: String(tier1.message || 'Tier 1 discount unlocked'),
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds: [],
          },
        },
      ],
      value: {
        percentage: {
          value: Number(tier1.discountPercentage || 0),
        },
      },
    });
  }
  if (
    subtotal >= Number(tier2?.minSubtotal || 0) &&
    Number(tier2?.discountPercentage || 0) > 0
  ) {
    result.push({
      message: String(tier2.message || 'Tier 2 discount unlocked'),
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds: [],
          },
        },
      ],
      value: {
        percentage: {
          value: Number(tier2.discountPercentage || 0),
        },
      },
    });
  }
  return result;
}

function normalizePercentage(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}

function normalizeAmountOff(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function normalizeAmount(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function normalizeValueType(value, fallback) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'FIXED_AMOUNT') return 'FIXED_AMOUNT';
  if (normalized === 'PERCENTAGE') return 'PERCENTAGE';
  return fallback;
}

function mapOrderStrategy(strategy) {
  return strategy === 'MAXIMUM'
    ? OrderDiscountSelectionStrategy.Maximum
    : OrderDiscountSelectionStrategy.First;
}

function mapProductStrategy(strategy) {
  if (strategy === 'ALL') return ProductDiscountSelectionStrategy.All;
  if (strategy === 'MAXIMUM') return ProductDiscountSelectionStrategy.Maximum;
  return ProductDiscountSelectionStrategy.First;
}