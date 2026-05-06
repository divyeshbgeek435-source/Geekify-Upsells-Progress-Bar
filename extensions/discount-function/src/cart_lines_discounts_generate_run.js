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
    let orderCandidates = [];
    if (tierCandidates.length > 1) {
      // Shopify allows only one orderDiscountsAdd operation per run, and FIRST/MAXIMUM pick a
      // single candidate — so combine qualified tiers into one fixed order discount.
      orderCandidates = [mergeOrderTierCandidatesToSingleFixed(tierCandidates, subtotal)];
    } else if (tierCandidates.length === 1) {
      orderCandidates = tierCandidates;
    }

    if (orderCandidates.length) {
      operations.push({
        orderDiscountsAdd: {
          candidates: orderCandidates,
          selectionStrategy:
            tierCandidates.length > 0
              ? OrderDiscountSelectionStrategy.First
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
        valueType: 'PERCENTAGE',
        amountOff: 0,
        discountPercentage: 5,
        message: '5% off unlocked',
      },
      tier2: {
        minSubtotal: 1000,
        valueType: 'PERCENTAGE',
        amountOff: 0,
        discountPercentage: 10,
        message: '10% off unlocked',
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
      valueType: normalizeValueType(tier1.valueType, fallback.tier1.valueType),
      amountOff: normalizeAmount(tier1.amountOff, fallback.tier1.amountOff ?? 0),
      discountPercentage: normalizePercentage(
        tier1.discountPercentage,
        fallback.tier1.discountPercentage,
      ),
      message: String(tier1.message || fallback.tier1.message),
    },
    tier2: {
      minSubtotal: normalizeAmountOff(tier2.minSubtotal, fallback.tier2.minSubtotal),
      valueType: normalizeValueType(tier2.valueType, fallback.tier2.valueType),
      amountOff: normalizeAmount(tier2.amountOff, fallback.tier2.amountOff ?? 0),
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
    .map((tier) => {
      const rewardRaw = String(tier?.rewardType || '').trim().toUpperCase();
      const rewardType =
        rewardRaw === 'FREE_SHIPPING'
          ? 'FREE_SHIPPING'
          : rewardRaw === 'FIXED_AMOUNT'
            ? 'FIXED_AMOUNT'
            : 'PERCENTAGE';
      const valueTypeRaw = String(tier?.valueType || '').trim().toUpperCase();
      const valueType =
        valueTypeRaw === 'FIXED_AMOUNT' || rewardType === 'FIXED_AMOUNT'
          ? 'FIXED_AMOUNT'
          : 'PERCENTAGE';
      const pctRaw = tier?.discountPercentage ?? tier?.discountPercent;
      const pct = Number(pctRaw);
      const discountPercentage =
        Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 0;
      const amtRaw = tier?.amountOff ?? (rewardType === 'FIXED_AMOUNT' ? pctRaw : 0);
      const amountOff = normalizeAmount(amtRaw, 0);
      return {
        name: String(tier?.name || '').trim(),
        minSubtotal: normalizeAmount(tier?.minSubtotal, 0),
        rewardType,
        valueType,
        discountPercentage,
        amountOff,
        message: String(tier?.message || ''),
        active: tier?.active !== false,
      };
    })
    .filter((tier) => tier.active)
    .sort((a, b) => a.minSubtotal - b.minSubtotal);
}

function runtimeTierAppliesToOrderSubtotal(tier) {
  if (String(tier.rewardType || '').toUpperCase() === 'FREE_SHIPPING') return false;
  if (String(tier.valueType || '').toUpperCase() === 'FIXED_AMOUNT') {
    return Number(tier.amountOff || 0) > 0;
  }
  return Number(tier.discountPercentage || 0) > 0;
}

function roundMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Combine several tier order candidates into one fixed-amount discount so Shopify applies
 * the full benefit (see cartLinesDiscountsGenerateRun — single orderDiscountsAdd operation).
 */
function mergeOrderTierCandidatesToSingleFixed(candidates, subtotal) {
  let totalOff = 0;
  const labels = [];
  for (const c of candidates) {
    if (c.value?.percentage) {
      const p = Number(c.value.percentage.value || 0);
      if (p > 0) {
        totalOff += (Number(subtotal) * p) / 100;
        labels.push(String(c.message || `${p}%`).trim());
      }
    } else if (c.value?.fixedAmount) {
      const a = Number(c.value.fixedAmount.amount || 0);
      if (a > 0) {
        totalOff += a;
        labels.push(String(c.message || `${a}`).trim());
      }
    }
  }
  const capped = Math.min(roundMoney(totalOff), roundMoney(subtotal));
  return {
    message: labels.filter(Boolean).join(' + ') || 'Tier discounts',
    targets:
      candidates[0]?.targets || [
        {orderSubtotal: {excludedCartLineIds: []}},
      ],
    value: {
      fixedAmount: {
        amount: String(capped),
      },
    },
  };
}

function orderDiscountCandidateFromTierFields({
  displayMessage,
  valueType,
  discountPercentage,
  amountOff,
}) {
  const targets = [
    {
      orderSubtotal: {
        excludedCartLineIds: [],
      },
    },
  ];
  const isFixed = String(valueType || '').toUpperCase() === 'FIXED_AMOUNT';
  if (isFixed && Number(amountOff) > 0) {
    return {
      message: displayMessage,
      targets,
      value: {
        fixedAmount: {
          amount: String(amountOff),
        },
      },
    };
  }
  if (!isFixed && Number(discountPercentage) > 0) {
    return {
      message: displayMessage,
      targets,
      value: {
        percentage: {
          value: Number(discountPercentage),
        },
      },
    };
  }
  return null;
}

function resolveTierOrderCandidates(runtimeTiers, thresholdTiers, subtotal) {
  if (Array.isArray(runtimeTiers) && runtimeTiers.length) {
    const out = [];
    for (const tier of runtimeTiers) {
      const qualifies = subtotal >= Number(tier.minSubtotal || 0);
      if (!qualifies || !runtimeTierAppliesToOrderSubtotal(tier)) continue;
      const displayMessage =
        tier.name || tier.message || 'Tier discount unlocked';
      const candidate = orderDiscountCandidateFromTierFields({
        displayMessage: String(displayMessage),
        valueType: tier.valueType,
        discountPercentage: tier.discountPercentage,
        amountOff: tier.amountOff,
      });
      if (candidate) out.push(candidate);
    }
    return out;
  }

  if (!thresholdTiers || typeof thresholdTiers !== 'object') return [];
  const result = [];
  const tier1 = thresholdTiers.tier1;
  const tier2 = thresholdTiers.tier2;
  if (tier1?.type === 'DISCOUNT' && subtotal >= Number(tier1.minSubtotal || 0)) {
    const candidate = orderDiscountCandidateFromTierFields({
      displayMessage: String(tier1.message || 'Tier 1 discount unlocked'),
      valueType: tier1.valueType,
      discountPercentage: tier1.discountPercentage,
      amountOff: tier1.amountOff,
    });
    if (candidate) result.push(candidate);
  }
  if (subtotal >= Number(tier2?.minSubtotal || 0)) {
    const candidate = orderDiscountCandidateFromTierFields({
      displayMessage: String(tier2.message || 'Tier 2 discount unlocked'),
      valueType: tier2.valueType,
      discountPercentage: tier2.discountPercentage,
      amountOff: tier2.amountOff,
    });
    if (candidate) result.push(candidate);
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