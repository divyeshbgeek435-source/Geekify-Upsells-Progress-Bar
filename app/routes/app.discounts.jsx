import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useOutletContext,
  useRevalidator,
  useRouteError,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadShopBillingContext,
  rejectIfDeleteNotAllowed,
  rejectIfDiscountLimitReached,
} from "../lib/app-billing.server.js";
import { rejectIfPlanItemLocked } from "../lib/plan-limit-enforcement.server.js";
import {
  isDiscountEditableOnPlan,
  PLAN_LOCKED_ITEM_MESSAGE,
} from "../lib/plan-limit-access.shared.js";
import {
  planLockedRowClassName,
  PLAN_LOCKED_PANEL_CLASS,
} from "../components/plan-locked-visual.jsx";
import { PREMIUM_PLAN_PRICE_USD } from "../lib/app-plans.shared.js";
import { saveFreePlanWidgetSettings } from "../lib/widget-plan-access.server.js";
import prisma from "../db.server";
import {
  ChartVerticalIcon,
  DiscountIcon,
  StatusActiveIcon,
} from "@shopify/polaris-icons";
import {
  DiscAdvancedLiveWidget,
  DISC_LIVE_BADGE_SHAPE,
  mergeProgressBarDesign,
  PROGRESS_OVERLAY_KEYS,
  sanitizeProgressBarDesignForDb,
} from "../components/disc-advanced-live-widget.jsx";
import { ProgressBarStyleEditor } from "../components/disc-progress-bar-style-editor.jsx";
import {
  PlanGatedDeleteButton,
  useBillingUpgradeHref,
} from "../components/plan-gated-delete.jsx";
import { defaultBarStyle } from "../lib/progress-bar-design.js";
import {
  resolveEligibleActiveTiers,
  resolveLiveWidgetProgress,
  resolveTierCaptionLabels,
  resolveWidgetPreviewMins,
} from "../lib/tier-display.shared.js";
import { syncStorefrontConfigToShopMetafield } from "../lib/storefront-config-sync.server.js";

async function syncStorefrontForAdmin(admin, shop) {
  try {
    await syncStorefrontConfigToShopMetafield(admin, shop);
  } catch (error) {
    console.warn("[sce-storefront-sync] failed", {
      shop,
      message: error?.message || String(error),
    });
  }
}

const DISC_TIER_METRIC_ICON_BADGE_STYLE = {
  marginLeft: "auto",
  background: "rgb(0 123 96 / 10%)",
  color: "rgb(0 123 96)",
  borderRadius: "4px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const DISC_TIER_METRIC_ICON_COLOR = {
  color: "rgb(0 123 96)",
  fill: "rgb(0 123 96)",
};

const WIDGET_SETTINGS_TABS = [
  { id: "progress", label: "Progress bar and badges" },
  { id: "messages", label: "Messages and Labels" },
  { id: "visibility", label: "Visibility Controls" },
];

// ─── GraphQL ────────────────────────────────────────────────────────────────

const LIST_DISCOUNTS = `#graphql
  query ListDiscountNodes($first: Int!) {
    shop {
      currencyCode
    }
    discountNodes(first: $first, reverse: true) {
      nodes {
        id
        metafield(namespace: "default", key: "function-configuration") {
          jsonValue
          value
        }
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            status
            startsAt
            endsAt
            asyncUsageCount
            codes(first: 1) { nodes { code } }
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount {
                  amount { amount currencyCode }
                  appliesOnEachItem
                }
              }
            }
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
          ... on DiscountAutomaticApp {
            title
            status
            startsAt
            endsAt
            asyncUsageCount
            appliesOnOneTimePurchase
            appliesOnSubscription
            discountClasses
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            appDiscountType { functionId }
          }
        }
      }
    }
    appDiscountTypes {
      functionId
      title
    }
  }
`;

const LIST_APP_DISCOUNT_TYPES = `#graphql
  query ListAppDiscountTypes {
    appDiscountTypes { functionId }
  }
`;

const CREATE_CODE = `#graphql
  mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;
const UPDATE_CODE = `#graphql
  mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;
const CREATE_CUSTOM = `#graphql
  mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount { discountId title }
      userErrors { field message }
    }
  }
`;
const UPDATE_CUSTOM = `#graphql
  mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount { discountId title }
      userErrors { field message }
    }
  }
`;
const DELETE_CODE = `#graphql
  mutation DeleteCode($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`;
const DELETE_AUTOMATIC = `#graphql
  mutation DeleteAutomatic($id: ID!) {
    discountAutomaticDelete(id: $id) {
      deletedAutomaticDiscountId
      userErrors { field message }
    }
  }
`;

const GET_DISCOUNT_FUNCTION_CONFIG = `#graphql
  query DiscountFunctionConfig($id: ID!) {
    discountNode(id: $id) {
      id
      metafield(namespace: "default", key: "function-configuration") {
        jsonValue
        value
      }
    }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFunctionConfigMetafield(metafield) {
  if (!metafield) return null;
  if (metafield.jsonValue != null && typeof metafield.jsonValue === "object") {
    return metafield.jsonValue;
  }
  const raw = metafield.value;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function customFieldsFromFunctionConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return null;
  const tiers =
    cfg.thresholdTiers && typeof cfg.thresholdTiers === "object"
      ? cfg.thresholdTiers
      : null;
  const tier1 = tiers?.tier1 && typeof tiers.tier1 === "object" ? tiers.tier1 : {};
  const tier2 = tiers?.tier2 && typeof tiers.tier2 === "object" ? tiers.tier2 : {};
  const o = cfg.order && typeof cfg.order === "object" ? cfg.order : {};
  const p = cfg.product && typeof cfg.product === "object" ? cfg.product : {};
  const s = cfg.shipping && typeof cfg.shipping === "object" ? cfg.shipping : {};
  const widgetUi = cfg.widgetUi && typeof cfg.widgetUi === "object" ? cfg.widgetUi : {};
  const numToStr = (v) => {
    if (v == null || v === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : String(v);
  };
  const valueType =
    o.valueType === "FIXED_AMOUNT" || p.valueType === "FIXED_AMOUNT"
      ? "FIXED_AMOUNT"
      : "PERCENTAGE";
  const amountStr =
    o.amountOff != null && o.amountOff !== ""
      ? String(o.amountOff)
      : p.amountOff != null && p.amountOff !== ""
        ? String(p.amountOff)
        : "";
  return {
    tier1Type: String(tier1.type || "FREE_SHIPPING").toUpperCase() === "DISCOUNT" ? "DISCOUNT" : "FREE_SHIPPING",
    tier1MinSubtotal: numToStr(tier1.minSubtotal || 500),
    tier1DiscountPercentage: numToStr(tier1.discountPercentage || 10),
    tier1Message: String(tier1.message || "Tier 1 unlocked"),
    tier2MinSubtotal: numToStr(tier2.minSubtotal || 1000),
    tier2DiscountPercentage: numToStr(tier2.discountPercentage || 20),
    tier2Message: String(tier2.message || "Tier 2 unlocked"),
    discountValueType: valueType,
    amountOff: amountStr,
    percentage: numToStr(o.percentage),
    orderPercentage: numToStr(o.percentage),
    productPercentage: numToStr(p.percentage),
    shippingPercentage: numToStr(s.percentage),
    orderMessage: String(o.message || ""),
    productMessage: String(p.message || ""),
    shippingMessage: String(s.message || ""),
    orderSelectionStrategy: String(o.selectionStrategy || "FIRST").toUpperCase(),
    productSelectionStrategy: String(p.selectionStrategy || "FIRST").toUpperCase(),
    uiWidgetTitle: String(widgetUi.title || "Rewards progress"),
    uiWidgetSubtitle: String(
      widgetUi.subtitle ||
      "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
    ),
    uiTier1Label: String(widgetUi.tier1Label || "Discount"),
    uiTier2Label: String(widgetUi.tier2Label || "Free shipping"),
    uiTier1Icon: String(widgetUi.tier1Icon || "%"),
    uiTier2Icon: String(widgetUi.tier2Icon || "🚚"),
    uiPrimaryColor: String(widgetUi.primaryColor || "#166534"),
    uiTrackColor: String(widgetUi.trackColor || "#cbd5e1"),
    uiTextColor: String(widgetUi.textColor || "#0f172a"),
    uiMutedTextColor: String(widgetUi.mutedTextColor || "#64748b"),
    uiCardBackground: String(widgetUi.cardBackground || "#ffffff"),
    uiBorderColor: String(widgetUi.borderColor || "#d1d5db"),
    uiIconBackground: String(widgetUi.iconBackground || "#166534"),
    uiIconTextColor: String(widgetUi.iconTextColor || "#ffffff"),
    uiShowProgressBar:
      String(widgetUi.showProgressBar || "true").toLowerCase() === "false"
        ? "false"
        : "true",
  };
}

function makeFunctionConfig({
  existingConfig,
  tier1Type,
  tier1MinSubtotal,
  tier1DiscountPercentage,
  tier1Message,
  tier2MinSubtotal,
  tier2DiscountPercentage,
  tier2Message,
  discountValueType, amountOff,
  orderPercentage, productPercentage, shippingPercentage,
  orderMessage, productMessage, shippingMessage,
  orderSelectionStrategy, productSelectionStrategy,
  uiWidgetTitle,
  uiWidgetSubtitle,
  uiTier1Label,
  uiTier2Label,
  uiTier1Icon,
  uiTier2Icon,
  uiPrimaryColor,
  uiTrackColor,
  uiTextColor,
  uiMutedTextColor,
  uiCardBackground,
  uiBorderColor,
  uiIconBackground,
  uiIconTextColor,
  uiShowProgressBar,
}) {
  const normalizedType = discountValueType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
  const normalizedAmountOff = Number.isFinite(Number(amountOff)) ? Math.max(0, Number(amountOff)) : 0;
  const prev =
    existingConfig && typeof existingConfig === "object" && !Array.isArray(existingConfig)
      ? existingConfig
      : {};
  const shippingBase =
    prev.shipping && typeof prev.shipping === "object" && !Array.isArray(prev.shipping)
      ? prev.shipping
      : {};
  return JSON.stringify({
    ...prev,
    thresholdTiers: {
      tier1: {
        type: String(tier1Type || "FREE_SHIPPING").toUpperCase() === "DISCOUNT" ? "DISCOUNT" : "FREE_SHIPPING",
        minSubtotal: Number.isFinite(Number(tier1MinSubtotal)) ? Math.max(0, Number(tier1MinSubtotal)) : 500,
        discountPercentage: Number.isFinite(Number(tier1DiscountPercentage))
          ? Math.max(0, Math.min(100, Number(tier1DiscountPercentage)))
          : 10,
        message: String(tier1Message || "Tier 1 unlocked"),
      },
      tier2: {
        minSubtotal: Number.isFinite(Number(tier2MinSubtotal)) ? Math.max(0, Number(tier2MinSubtotal)) : 1000,
        discountPercentage: Number.isFinite(Number(tier2DiscountPercentage))
          ? Math.max(0, Math.min(100, Number(tier2DiscountPercentage)))
          : 20,
        message: String(tier2Message || "Tier 2 unlocked"),
      },
    },
    order: {
      valueType: normalizedType,
      amountOff: normalizedAmountOff,
      percentage: orderPercentage,
      message: orderMessage,
      selectionStrategy: orderSelectionStrategy,
    },
    product: {
      valueType: normalizedType,
      amountOff: normalizedAmountOff,
      percentage: productPercentage,
      message: productMessage,
      selectionStrategy: productSelectionStrategy,
    },
    shipping: {
      ...shippingBase,
      percentage: shippingPercentage,
      message: shippingMessage,
    },
    widgetUi: {
      title: String(uiWidgetTitle || "Rewards progress"),
      subtitle: String(
        uiWidgetSubtitle ||
        "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
      ),
      tier1Label: String(uiTier1Label || "Discount"),
      tier2Label: String(uiTier2Label || "Free shipping"),
      tier1Icon: String(uiTier1Icon || "%"),
      tier2Icon: String(uiTier2Icon || "🚚"),
      primaryColor: String(uiPrimaryColor || "#166534"),
      trackColor: String(uiTrackColor || "#cbd5e1"),
      textColor: String(uiTextColor || "#0f172a"),
      mutedTextColor: String(uiMutedTextColor || "#64748b"),
      cardBackground: String(uiCardBackground || "#ffffff"),
      borderColor: String(uiBorderColor || "#d1d5db"),
      iconBackground: String(uiIconBackground || "#166534"),
      iconTextColor: String(uiIconTextColor || "#ffffff"),
      showProgressBar:
        String(uiShowProgressBar || "true").toLowerCase() === "false"
          ? "false"
          : "true",
    },
  });
}

function isoToLocalDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDateTimeInputToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function toMutationId(nodeId, typename) {
  if (typename === "DiscountAutomaticApp") {
    return nodeId.replace("/DiscountNode/", "/DiscountAutomaticNode/");
  }
  if (typename === "DiscountCodeBasic") {
    return nodeId.replace("/DiscountNode/", "/DiscountCodeNode/");
  }
  return nodeId;
}

function formatCodeDiscountValue(discount) {
  const val = discount?.customerGets?.value;
  if (!val) return null;
  if (val.percentage != null) return `${(val.percentage * 100).toFixed(0)}% off`;
  if (val.amount?.amount != null)
    return `${val.amount.currencyCode} ${Number(val.amount.amount).toFixed(2)} off`;
  return null;
}

const AUTO_TIER_DISCOUNT_TITLE = "Do not remove this discount";
const AUTO_TIER_DISCOUNT_LEGACY_TITLES = new Set([
  "Do not remove this discount title",
]);
const TIER_DISCOUNT_TYPES = [
  { value: "FREE_SHIPPING", label: "Free Shipping" },
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
];
const MAX_ACTIVE_TIERS = 2;

function freePlanDiscountLimitMessage(limit) {
  return `Your Free plan allows up to ${limit} discounts. Upgrade to Premium for unlimited discounts.`;
}

function parseTierDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readInputText(e, fallback = "") {
  const raw = e?.target?.value ?? e?.currentTarget?.value ?? e?.detail?.value ?? fallback;
  return String(raw ?? "").replace(/[\u0000-\u001F\u007F]/g, "");
}

function readStrictNumber(e, fallback) {
  const raw = readInputText(e, "");
  if (raw.trim() === "") return fallback;
  if (!/^-?\d*(\.\d*)?$/.test(raw.trim())) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toNumericInputString(e, prev = "", { allowDecimal = true } = {}) {
  const raw = readInputText(e, prev);
  let next = String(raw ?? "");
  next = next.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (allowDecimal) {
    const firstDot = next.indexOf(".");
    if (firstDot !== -1) {
      next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  return next;
}

function isUnknownPrismaArgument(error, fieldName) {
  const message = String(error?.message || "");
  return message.includes(`Unknown argument \`${fieldName}\``);
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || "").toLowerCase();
  const t = String(tableName || "").toLowerCase();
  if (!t) return false;
  return (
    message.includes(`no such table`) && message.includes(t) ||
    message.includes(`relation`) && message.includes(t) && message.includes(`does not exist`)
  );
}

function isNotFoundOnDelete(error) {
  return (
    String(error?.code || "") === "P2025" ||
    String(error?.message || "").toLowerCase().includes("no record was found for a delete")
  );
}

async function deactivateExpiredThresholdTiers(shop) {
  try {
    await prisma.thresholdTier.updateMany({
      where: {
        shop,
        active: true,
        scheduleEndAt: { lt: new Date() },
      },
      data: { active: false },
    });
  } catch (error) {
    if (!isUnknownPrismaArgument(error, "scheduleEndAt")) throw error;
  }
}

async function deactivateExpiredTierDiscounts(shop) {
  if (typeof prisma.tierDiscount?.updateMany !== "function") return;
  try {
    await prisma.tierDiscount.updateMany({
      where: {
        shop,
        active: true,
        scheduleEndAt: { lt: new Date() },
      },
      data: { active: false },
    });
  } catch (error) {
    if (!isMissingTableError(error, "TierDiscount")) throw error;
  }
}

async function getPersistedDiscountScheduleLock(shop, candidateNames) {
  const names = [...new Set((candidateNames || []).map((n) => String(n || "").trim()).filter(Boolean))];
  for (const name of names) {
    if (typeof prisma.tierDiscount?.findUnique === "function") {
      try {
        const row = await prisma.tierDiscount.findUnique({
          where: { shop_name: { shop, name } },
        });
        if (row && (row.scheduleStartAt != null || row.scheduleEndAt != null)) {
          return {
            locked: true,
            scheduleStartAt: parseTierDate(row.scheduleStartAt),
            scheduleEndAt: parseTierDate(row.scheduleEndAt),
          };
        }
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }
    const tiers = await prisma.thresholdTier.findMany({
      where: { shop, discountName: name },
      select: { scheduleStartAt: true, scheduleEndAt: true },
    });
    const starts = tiers
      .map((t) => parseTierDate(t.scheduleStartAt))
      .filter(Boolean)
      .map((d) => d.getTime());
    const ends = tiers
      .map((t) => parseTierDate(t.scheduleEndAt))
      .filter(Boolean)
      .map((d) => d.getTime());
    if (starts.length || ends.length) {
      return {
        locked: true,
        scheduleStartAt: starts.length ? new Date(Math.min(...starts)) : null,
        scheduleEndAt: ends.length ? new Date(Math.max(...ends)) : null,
      };
    }
  }
  return { locked: false, scheduleStartAt: null, scheduleEndAt: null };
}

function resolveDiscountStatus(row, now = new Date()) {
  if (!row) return "INACTIVE";
  const scheduleStartAt = parseTierDate(row.scheduleStartAt);
  const scheduleEndAt = parseTierDate(row.scheduleEndAt);
  if (scheduleEndAt && now > scheduleEndAt) return "EXPIRED";
  if (scheduleStartAt && now < scheduleStartAt) return "SCHEDULED";
  if (row.active === false) return "INACTIVE";
  return "ACTIVE";
}

function resolveTierStatus(row, now = new Date()) {
  if (!row) return "INACTIVE";
  if (row.active === false) return "INACTIVE";
  const scheduleStartAt = parseTierDate(row.scheduleStartAt);
  const scheduleEndAt = parseTierDate(row.scheduleEndAt);
  if (scheduleStartAt && now < scheduleStartAt) return "SCHEDULED";
  if (scheduleEndAt && now > scheduleEndAt) return "EXPIRED";
  return "ACTIVE";
}

function normalizeTierRows(rows) {
  const now = new Date();
  return (rows || [])
    .map((row) => ({
      id: row.id,
      discountName: String(row.discountName || "Default Discount"),
      name: String(row.name || "Tier"),
      minSubtotal: Number(row.minSubtotal || 0),
      rewardType: (() => {
        const normalized = String(row.rewardType || "").toUpperCase();
        if (normalized === "FREE_SHIPPING") return "FREE_SHIPPING";
        if (normalized === "FIXED_AMOUNT") return "FIXED_AMOUNT";
        return "PERCENTAGE";
      })(),
      discountPercent:
        row.discountPercent == null ? null : Number(row.discountPercent),
      message: String(row.message || ""),
      position: Number(row.position || 0),
      active: row.active !== false,
      usageCount: Number(row.usageCount || 0),
      scheduleStartAt: parseTierDate(row.scheduleStartAt),
      scheduleEndAt: parseTierDate(row.scheduleEndAt),
      status: resolveTierStatus(row, now),
    }))
    .filter((row) => Number.isFinite(row.minSubtotal))
    .sort((a, b) => a.minSubtotal - b.minSubtotal);
}

function groupTiersByDiscount(tiers, discounts = []) {
  const map = new Map();
  for (const discount of discounts || []) {
    const name = String(discount.name || "Default Discount");
    const createdAt = parseTierDate(discount.createdAt);
    map.set(name, {
      hasExplicitDiscount: true,
      discountName: name,
      discountActive: discount.active !== false,
      discountScheduleStartAt: parseTierDate(discount.scheduleStartAt),
      discountScheduleEndAt: parseTierDate(discount.scheduleEndAt),
      discountStatus: resolveDiscountStatus(discount),
      discountCreatedAt: createdAt ? createdAt.getTime() : 0,
      tiers: [],
    });
  }
  for (const tier of normalizeTierRows(tiers)) {
    const key = String(tier.discountName || "Default Discount");
    if (!map.has(key)) {
      map.set(key, {
        hasExplicitDiscount: false,
        discountName: key,
        discountActive: false,
        discountScheduleStartAt: null,
        discountScheduleEndAt: null,
        discountStatus: "INACTIVE",
        discountCreatedAt: Number.POSITIVE_INFINITY,
        tiers: [],
      });
    }
    const bucket = map.get(key);
    bucket.tiers.push(tier);
    const tierCreated = parseTierDate(tier.createdAt);
    if (tierCreated) {
      const ts = tierCreated.getTime();
      bucket.discountCreatedAt = Math.min(bucket.discountCreatedAt ?? ts, ts);
    }
  }
  return Array.from(map.values()).map((entry) => {
    const tierList = entry.tiers.map((tier) => ({
      ...tier,
      effectiveStatus:
        entry.discountStatus === "ACTIVE" ? tier.status : "INACTIVE",
    }));
    const activeCount = tierList.filter((t) => t.effectiveStatus === "ACTIVE").length;
    const scheduledCount = tierList.filter((t) => t.effectiveStatus === "SCHEDULED").length;
    const expiredCount = tierList.filter((t) => t.effectiveStatus === "EXPIRED").length;
    const usageSum = tierList.reduce(
      (sum, t) => sum + (Number(t.usageCount) || 0),
      0,
    );
    const scheduleStartCandidates = tierList
      .map((t) => (t.scheduleStartAt ? new Date(t.scheduleStartAt).getTime() : null))
      .filter((v) => Number.isFinite(v));
    const scheduleEndCandidates = tierList
      .map((t) => (t.scheduleEndAt ? new Date(t.scheduleEndAt).getTime() : null))
      .filter((v) => Number.isFinite(v));
    const startsAt =
      scheduleStartCandidates.length > 0
        ? new Date(Math.min(...scheduleStartCandidates))
        : null;
    const endsAt =
      scheduleEndCandidates.length > 0 ? new Date(Math.max(...scheduleEndCandidates)) : null;
    let derivedDiscountStatus = entry.discountStatus;
    let derivedScheduleStartAt = entry.discountScheduleStartAt;
    let derivedScheduleEndAt = entry.discountScheduleEndAt;
    if (!entry.hasExplicitDiscount) {
      derivedScheduleStartAt = startsAt;
      derivedScheduleEndAt = endsAt;
      derivedDiscountStatus = "INACTIVE";
    }
    return {
      hasExplicitDiscount: entry.hasExplicitDiscount,
      discountName: entry.discountName,
      discountStatus: derivedDiscountStatus,
      discountActive: entry.discountActive,
      discountScheduleStartAt: derivedScheduleStartAt,
      discountScheduleEndAt: derivedScheduleEndAt,
      discountCreatedAt:
        Number.isFinite(entry.discountCreatedAt) && entry.discountCreatedAt !== Number.POSITIVE_INFINITY
          ? entry.discountCreatedAt
          : 0,
      tiers: tierList.sort((a, b) => a.minSubtotal - b.minSubtotal),
      activeCount,
      scheduledCount,
      expiredCount,
      usageSum,
      startsAt,
      endsAt,
    };
  }).sort((a, b) => (a.discountCreatedAt ?? 0) - (b.discountCreatedAt ?? 0));
}

function resolveApplicableTier(tiers, subtotal) {
  const sorted = normalizeTierRows(tiers);
  let matched = null;
  for (const tier of sorted) {
    if (tier.status !== "ACTIVE") continue;
    if (subtotal >= tier.minSubtotal) matched = tier;
  }
  return matched;
}

function tiersToFunctionConfig(tiers) {
  const sorted = normalizeTierRows(tiers).filter((t) => t.active);
  const tier1 = sorted[0] || {
    minSubtotal: 500,
    rewardType: "FREE_SHIPPING",
    discountPercent: 0,
    message: "Free shipping unlocked",
  };
  const tier2 = sorted[1] || {
    minSubtotal: 1000,
    rewardType: "PERCENTAGE",
    discountPercent: 20,
    message: "20% discount unlocked",
  };

  const highestOrderTier = [...sorted]
    .reverse()
    .find((tier) => tier.rewardType !== "FREE_SHIPPING");
  const highestOrderTierValue = Number(highestOrderTier?.discountPercent || 0);
  const orderUsesFixedAmount = highestOrderTier?.rewardType === "FIXED_AMOUNT";

  return JSON.stringify({
    tiers: sorted.map((tier, idx) => ({
      id: tier.id || `tier-${idx + 1}`,
      name: tier.name || `Tier ${idx + 1}`,
      minSubtotal: tier.minSubtotal,
      rewardType: tier.rewardType,
      valueType:
        tier.rewardType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
      discountPercentage:
        tier.rewardType === "PERCENTAGE"
          ? Number(tier.discountPercent || 0)
          : 0,
      amountOff:
        tier.rewardType === "FIXED_AMOUNT"
          ? Number(tier.discountPercent || 0)
          : 0,
      message: tier.message || "",
      position: idx + 1,
      active: tier.active !== false,
    })),
    thresholdTiers: {
      tier1: {
        type:
          tier1.rewardType === "FREE_SHIPPING" ? "FREE_SHIPPING" : "DISCOUNT",
        minSubtotal: tier1.minSubtotal,
        valueType:
          tier1.rewardType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
        discountPercentage:
          tier1.rewardType === "PERCENTAGE"
            ? Number(tier1.discountPercent || 0)
            : 0,
        amountOff:
          tier1.rewardType === "FIXED_AMOUNT"
            ? Number(tier1.discountPercent || 0)
            : 0,
        message: tier1.message || "",
      },
      tier2: {
        minSubtotal: tier2.minSubtotal,
        valueType:
          tier2.rewardType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
        discountPercentage:
          tier2.rewardType === "PERCENTAGE"
            ? Number(tier2.discountPercent || 0)
            : 0,
        amountOff:
          tier2.rewardType === "FIXED_AMOUNT"
            ? Number(tier2.discountPercent || 0)
            : 0,
        message: tier2.message || "",
      },
    },
    order: {
      valueType: orderUsesFixedAmount ? "FIXED_AMOUNT" : "PERCENTAGE",
      amountOff: orderUsesFixedAmount ? highestOrderTierValue : 0,
      percentage:
        !orderUsesFixedAmount && highestOrderTier?.rewardType === "PERCENTAGE"
          ? highestOrderTierValue
          : 0,
      message: highestOrderTier?.message || "Tier discount unlocked",
      selectionStrategy: "MAXIMUM",
    },
    product: {
      valueType: "PERCENTAGE",
      amountOff: 0,
      percentage: 0,
      message: "",
      selectionStrategy: "FIRST",
    },
    shipping: {
      percentage: tier1.rewardType === "FREE_SHIPPING" ? 100 : 0,
      message: tier1.message || "Free shipping unlocked",
    },
  });
}

async function syncAutoTierDiscount(admin, tiers) {
  const activeTiers = normalizeTierRows(tiers).filter((tier) => tier.active);

  const listResp = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
  const listJson = await listResp.json();
  const appFunctionIds = new Set(
    (listJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
  );
  const existing = (listJson?.data?.discountNodes?.nodes || []).find((node) => {
    const discount = node?.discount;
    return (
      discount?.__typename === "DiscountAutomaticApp" &&
      (discount?.title === AUTO_TIER_DISCOUNT_TITLE ||
        AUTO_TIER_DISCOUNT_LEGACY_TITLES.has(String(discount?.title || ""))) &&
      appFunctionIds.has(discount?.appDiscountType?.functionId)
    );
  });

  if (!activeTiers.length) {
    if (!existing?.id) return { ok: true, skipped: true };
    const mutationId = toMutationId(existing.id, "DiscountAutomaticApp");
    const deleteResp = await admin.graphql(DELETE_AUTOMATIC, { variables: { id: mutationId } });
    const deleteJson = await deleteResp.json();
    const errors = deleteJson?.data?.discountAutomaticDelete?.userErrors || [];
    if (errors.length) {
      return { ok: false, error: errors[0]?.message || "Automatic discount delete failed" };
    }
    return { ok: true, deleted: true };
  }

  const appDiscountTypesResp = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
  const appDiscountTypesJson = await appDiscountTypesResp.json();
  const functionId = appDiscountTypesJson?.data?.appDiscountTypes?.[0]?.functionId;
  if (!functionId) {
    return { ok: false, error: "No app discount function found to bind tiers." };
  }

  const hasFreeShippingTier = activeTiers.some(
    (tier) => tier.rewardType === "FREE_SHIPPING",
  );
  const automaticAppDiscount = {
    title: AUTO_TIER_DISCOUNT_TITLE,
    functionId,
    startsAt: new Date().toISOString(),
    discountClasses: hasFreeShippingTier ? ["ORDER", "SHIPPING"] : ["ORDER"],
    appliesOnOneTimePurchase: true,
    appliesOnSubscription: false,
    combinesWith: {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    metafields: [
      {
        namespace: "default",
        key: "function-configuration",
        type: "json",
        value: tiersToFunctionConfig(activeTiers),
      },
    ],
  };

  if (existing?.id) {
    const mutationId = toMutationId(existing.id, "DiscountAutomaticApp");
    const updateResp = await admin.graphql(UPDATE_CUSTOM, {
      variables: { id: mutationId, automaticAppDiscount },
    });
    const updateJson = await updateResp.json();
    const errors = updateJson?.data?.discountAutomaticAppUpdate?.userErrors || [];
    if (errors.length) return { ok: false, error: errors[0]?.message || "Update failed" };
    return { ok: true, updated: true };
  }

  const createResp = await admin.graphql(CREATE_CUSTOM, {
    variables: { automaticAppDiscount },
  });
  const createJson = await createResp.json();
  const errors = createJson?.data?.discountAutomaticAppCreate?.userErrors || [];
  if (errors.length) return { ok: false, error: errors[0]?.message || "Create failed" };
  return { ok: true, created: true };
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing, session.shop);
  const url = new URL(request.url);
  const editId = url.searchParams.get("editId");
  const previewSubtotal = Number(url.searchParams.get("previewSubtotal") || 0);

  const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
  const json = await response.json();
  const shopCurrencyCode = String(json?.data?.shop?.currencyCode || "USD").toUpperCase();
  const appDiscountTypes = json?.data?.appDiscountTypes || [];
  const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
  const allNodes = json?.data?.discountNodes?.nodes || [];

  const nodes = allNodes.filter((n) => {
    const d = n?.discount;
    if (!d) return false;
    if (d.__typename === "DiscountCodeBasic") return true;
    if (d.__typename === "DiscountAutomaticApp")
      return appFunctionIds.has(d?.appDiscountType?.functionId);
    return false;
  });
  const autoTierDiscountNode = nodes.find((node) => {
    const d = node?.discount;
    if (d?.__typename !== "DiscountAutomaticApp") return false;
    const title = String(d?.title || "");
    return (
      title === AUTO_TIER_DISCOUNT_TITLE ||
      AUTO_TIER_DISCOUNT_LEGACY_TITLES.has(title)
    );
  });
  const totalDiscountUsageCount = Number(
    autoTierDiscountNode?.discount?.asyncUsageCount ?? 0,
  );
  const found = editId ? nodes.find((n) => n.id === editId) : null;
  const discount = found?.discount;

  const existingValueType =
    discount?.__typename === "DiscountCodeBasic"
      ? discount?.customerGets?.value?.percentage != null ? "PERCENTAGE" : "FIXED_AMOUNT"
      : "PERCENTAGE";
  const existingPercentage =
    discount?.__typename === "DiscountCodeBasic" &&
      discount?.customerGets?.value?.percentage != null
      ? String((Number(discount.customerGets.value.percentage) * 100).toFixed(0))
      : "";
  const existingAmountOff =
    discount?.__typename === "DiscountCodeBasic" &&
      discount?.customerGets?.value?.amount?.amount != null
      ? String(Number(discount.customerGets.value.amount.amount).toFixed(2))
      : "";

  const functionConfig =
    discount?.__typename === "DiscountAutomaticApp"
      ? parseFunctionConfigMetafield(found?.metafield)
      : null;

  const editDiscount = found ? {
    id: found.id,
    typename: discount?.__typename || "",
    mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
    title: discount?.title || "",
    code: discount?.codes?.nodes?.[0]?.code || "",
    functionId: discount?.appDiscountType?.functionId || "",
    discountClasses: discount?.discountClasses || [],
    combinesWithOrder: Boolean(discount?.combinesWith?.orderDiscounts),
    combinesWithProduct: Boolean(discount?.combinesWith?.productDiscounts),
    combinesWithShipping: Boolean(discount?.combinesWith?.shippingDiscounts),
    appliesOnOneTimePurchase: discount?.appliesOnOneTimePurchase ?? true,
    appliesOnSubscription: discount?.appliesOnSubscription ?? false,
    discountValueType: existingValueType,
    percentage: existingPercentage,
    amountOff: existingAmountOff,
    startsAt: discount?.startsAt || "",
    endsAt: discount?.endsAt || "",
    functionConfig,
  } : null;

  await deactivateExpiredTierDiscounts(session.shop);
  await deactivateExpiredThresholdTiers(session.shop);
  let tierDiscounts = [];
  if (typeof prisma.tierDiscount?.findMany === "function") {
    try {
      tierDiscounts = await prisma.tierDiscount.findMany({
        where: { shop: session.shop },
        orderBy: [{ createdAt: "asc" }],
      });
    } catch (error) {
      if (!isMissingTableError(error, "TierDiscount")) throw error;
      tierDiscounts = [];
    }
  }
  const tierRules = await prisma.thresholdTier.findMany({
    where: { shop: session.shop },
    orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
  });
  const expiredDiscountNames = new Set(
    tierDiscounts
      .filter((row) => resolveDiscountStatus(row) === "EXPIRED")
      .map((row) => String(row.name || "").trim()),
  );
  if (expiredDiscountNames.size) {
    try {
      await prisma.thresholdTier.updateMany({
        where: {
          shop: session.shop,
          discountName: { in: Array.from(expiredDiscountNames) },
          active: true,
        },
        data: { active: false },
      });
    } catch (error) {
      if (!isUnknownPrismaArgument(error, "discountName")) throw error;
    }
  }
  let tierWidgetSettings =
    typeof prisma.tierWidgetSettings?.findUnique === "function"
      ? await prisma.tierWidgetSettings.findUnique({
        where: { shop: session.shop },
      })
      : null;
  const previewTier =
    Number.isFinite(previewSubtotal) && previewSubtotal > 0
      ? resolveApplicableTier(tierRules, previewSubtotal)
      : null;

  // Self-heal if the Shopify auto tier discount was deleted manually.
  // As long as active tiers exist, recreate/sync the required discount definition.
  try {
    const discountByName = new Map(
      (tierDiscounts || []).map((row) => [String(row.name || "").trim(), row]),
    );
    const syncableTiers = normalizeTierRows(tierRules).filter((tier) => {
      if (tier.status !== "ACTIVE") return false;
      const linked = discountByName.get(String(tier.discountName || "").trim());
      if (!linked) return false;
      return resolveDiscountStatus(linked) === "ACTIVE";
    });
    await syncAutoTierDiscount(admin, syncableTiers);
  } catch (error) {
    console.warn("[tier-discount] loader auto-recovery failed", error);
  }

  await syncStorefrontForAdmin(admin, session.shop);

  return {
    nodes,
    appDiscountTypes,
    editDiscount,
    tierRules,
    tierDiscounts,
    totalDiscountUsageCount,
    tierWidgetSettings,
    previewSubtotal: Number.isFinite(previewSubtotal) ? previewSubtotal : 0,
    previewTier,
    shopCurrencyCode,
    billingPlan,
    errors: json?.errors || null,
  };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing, session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");
  const planSlots = billingPlan.planSlots;
  const planMutableIntents = new Set([
    "discount-toggle-active",
    "discount-upsert",
    "tier-create",
    "tier-update",
  ]);
  if (planMutableIntents.has(intent)) {
    const names = [
      formData.get("discountName"),
      formData.get("originalDiscountName"),
      formData.get("tierDiscountName"),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    for (const name of names) {
      const lockErr = rejectIfPlanItemLocked(billingPlan.planId, planSlots, {
        discountName: name,
      });
      if (!lockErr) continue;
      if (intent === "discount-toggle-active" && !formData.has("discountActive")) {
        continue;
      }
      return lockErr;
    }
  }
  if (intent === "delete" || intent === "discount-delete" || intent === "tier-delete") {
    const deleteBlock = rejectIfDeleteNotAllowed(billingPlan.planId);
    if (deleteBlock) return deleteBlock;
  }
  const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
  const mode = modeRaw === "custom" ? "custom" : "code";
  const discountType = String(formData.get("discountType") || "");

  const getSyncableTiers = async () => {
    const tiers = await prisma.thresholdTier.findMany({
      where: { shop: session.shop },
      orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
    });
    let discounts = [];
    if (typeof prisma.tierDiscount?.findMany === "function") {
      try {
        discounts = await prisma.tierDiscount.findMany({ where: { shop: session.shop } });
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
        discounts = [];
      }
    }
    const normalized = normalizeTierRows(tiers);
    if (!discounts.length) return [];
    const discountByName = new Map(
      discounts.map((row) => [String(row.name || "").trim(), row]),
    );
    return normalized.filter((tier) => {
      if (tier.status !== "ACTIVE") return false;
      const linked = discountByName.get(String(tier.discountName || "").trim());
      if (!linked) return false;
      return resolveDiscountStatus(linked) === "ACTIVE";
    });
  };
  const rangesOverlap = (startA, endA, startB, endB) => {
    const aStart = startA ? startA.getTime() : Number.NEGATIVE_INFINITY;
    const aEnd = endA ? endA.getTime() : Number.POSITIVE_INFINITY;
    const bStart = startB ? startB.getTime() : Number.NEGATIVE_INFINITY;
    const bEnd = endB ? endB.getTime() : Number.POSITIVE_INFINITY;
    if ([aStart, aEnd, bStart, bEnd].some((v) => Number.isNaN(v))) return false;
    return aStart < bEnd && bStart < aEnd;
  };
  const listExistingDiscountWindows = async () => {
    if (typeof prisma.tierDiscount?.findMany === "function") {
      try {
        const rows = await prisma.tierDiscount.findMany({
          where: { shop: session.shop },
        });
        return rows.map((row) => ({
          name: String(row.name || "").trim(),
          active: Boolean(row.active),
          scheduleStartAt: parseTierDate(row.scheduleStartAt),
          scheduleEndAt: parseTierDate(row.scheduleEndAt),
        }));
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }
    const tiers = await prisma.thresholdTier.findMany({
      where: { shop: session.shop },
      orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
    });
    const grouped = groupTiersByDiscount(tiers, []);
    return grouped.map((group) => ({
      name: String(group.discountName || "").trim(),
      active: String(group.discountStatus || "").toUpperCase() !== "INACTIVE",
      scheduleStartAt: parseTierDate(group.discountScheduleStartAt),
      scheduleEndAt: parseTierDate(group.discountScheduleEndAt),
    }));
  };

  if (intent === "discount-toggle-active") {
    const discountName = String(formData.get("discountName") || "").trim();
    if (!discountName) {
      return { ok: false, errors: { discountName: "Discount name is required" } };
    }
    const discountActive = formData.has("discountActive");
    let existingRow = null;
    if (typeof prisma.tierDiscount?.findUnique === "function") {
      try {
        existingRow = await prisma.tierDiscount.findUnique({
          where: { shop_name: { shop: session.shop, name: discountName } },
        });
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }
    const scheduleStartAt = parseTierDate(existingRow?.scheduleStartAt);
    const scheduleEndAt = parseTierDate(existingRow?.scheduleEndAt);
    if (discountActive) {
      const existingWindows = await listExistingDiscountWindows();
      const hasConflict = existingWindows.some((row) => {
        const rowName = String(row.name || "").trim();
        if (!row.active) return false;
        if (rowName === discountName) return false;
        return rangesOverlap(
          scheduleStartAt,
          scheduleEndAt,
          row.scheduleStartAt,
          row.scheduleEndAt,
        );
      });
      if (hasConflict) {
        return {
          ok: false,
          errors: {
            discountActive:
              "Only one discount can be active at a time. Please change the schedule.",
          },
        };
      }
    }
    if (typeof prisma.tierDiscount?.upsert === "function") {
      try {
        await prisma.tierDiscount.upsert({
          where: { shop_name: { shop: session.shop, name: discountName } },
          create: {
            shop: session.shop,
            name: discountName,
            active: discountActive,
            scheduleStartAt,
            scheduleEndAt,
          },
          update: { active: discountActive },
        });
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }
    try {
      await prisma.thresholdTier.updateMany({
        where: { shop: session.shop, discountName },
        data: { active: discountActive },
      });
    } catch (error) {
      if (!isUnknownPrismaArgument(error, "discountName")) throw error;
    }
    const syncableTiers = await getSyncableTiers();
    const syncResult = await syncAutoTierDiscount(admin, syncableTiers);
    if (!syncResult.ok) return { ok: false, errors: { tier: syncResult.error } };
    await syncStorefrontForAdmin(admin, session.shop);
    return { ok: true, tierIntent: intent };
  }

  if (intent === "discount-upsert") {
    const discountName = String(formData.get("discountName") || "").trim();
    const originalDiscountName = String(formData.get("originalDiscountName") || "").trim();
    const scheduleLock = await getPersistedDiscountScheduleLock(session.shop, [
      originalDiscountName,
      discountName,
    ]);
    let discountScheduleStartAtRaw = String(formData.get("discountScheduleStartAt") || "").trim();
    let discountScheduleEndAtRaw = String(formData.get("discountScheduleEndAt") || "").trim();
    let discountScheduleStartAt = discountScheduleStartAtRaw
      ? new Date(discountScheduleStartAtRaw)
      : null;
    let discountScheduleEndAt = discountScheduleEndAtRaw
      ? new Date(discountScheduleEndAtRaw)
      : null;
    if (scheduleLock.locked) {
      discountScheduleStartAt = scheduleLock.scheduleStartAt;
      discountScheduleEndAt = scheduleLock.scheduleEndAt;
      discountScheduleStartAtRaw = discountScheduleStartAt
        ? discountScheduleStartAt.toISOString()
        : "";
      discountScheduleEndAtRaw = discountScheduleEndAt
        ? discountScheduleEndAt.toISOString()
        : "";
    }
    const discountErrors = {};
    if (!discountName) discountErrors.discountName = "Discount name is required";
    if (!scheduleLock.locked) {
      if (
        discountScheduleStartAtRaw &&
        (!discountScheduleStartAt || Number.isNaN(discountScheduleStartAt.getTime()))
      ) {
        discountErrors.discountScheduleStartAt = "Discount schedule start is invalid";
      }
      if (
        discountScheduleEndAtRaw &&
        (!discountScheduleEndAt || Number.isNaN(discountScheduleEndAt.getTime()))
      ) {
        discountErrors.discountScheduleEndAt = "Discount schedule end is invalid";
      }
      if (
        discountScheduleStartAt &&
        discountScheduleEndAt &&
        discountScheduleEndAt.getTime() <= discountScheduleStartAt.getTime()
      ) {
        discountErrors.discountScheduleEndAt =
          "Discount schedule end must be after schedule start";
      }
    }
    if (Object.keys(discountErrors).length) return { ok: false, errors: discountErrors };

    const startScheduleValid =
      Boolean(discountScheduleStartAtRaw) &&
      discountScheduleStartAt &&
      !Number.isNaN(discountScheduleStartAt.getTime());
    const endScheduleValid =
      Boolean(discountScheduleEndAtRaw) &&
      discountScheduleEndAt &&
      !Number.isNaN(discountScheduleEndAt.getTime());
    const hasDiscountSchedule = startScheduleValid || endScheduleValid;
    const discountActive = hasDiscountSchedule ? true : formData.has("discountActive");
    if (discountActive) {
      const candidateName = String(originalDiscountName || discountName || "").trim();
      const existingWindows = await listExistingDiscountWindows();
      const hasConflict = existingWindows.some((row) => {
        const rowName = String(row.name || "").trim();
        if (!row.active) return false;
        if (
          rowName &&
          (rowName === candidateName ||
            rowName === String(discountName || "").trim() ||
            rowName === String(originalDiscountName || "").trim())
        ) {
          return false;
        }
        return rangesOverlap(
          discountScheduleStartAt,
          discountScheduleEndAt,
          row.scheduleStartAt,
          row.scheduleEndAt,
        );
      });
      if (hasConflict) {
        return {
          ok: false,
          errors: {
            discountScheduleConflict:
              "Only one discount can be active at a time. Please change the schedule.",
          },
        };
      }
    }

    let persistedToTierDiscount = false;
    const upsertLookupName = String(originalDiscountName || discountName || "").trim();
    if (typeof prisma.tierDiscount?.upsert === "function") {
      try {
        await prisma.tierDiscount.upsert({
          where: { shop_name: { shop: session.shop, name: upsertLookupName || discountName } },
          create: {
            shop: session.shop,
            name: discountName,
            active: discountActive,
            scheduleStartAt: discountScheduleStartAt,
            scheduleEndAt: discountScheduleEndAt,
          },
          update: {
            name: discountName,
            active: discountActive,
            ...(scheduleLock.locked
              ? {}
              : {
                scheduleStartAt: discountScheduleStartAt,
                scheduleEndAt: discountScheduleEndAt,
              }),
          },
        });
        persistedToTierDiscount = true;
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }
    if (!persistedToTierDiscount) {
      const targetName = originalDiscountName || discountName;
      try {
        await prisma.thresholdTier.updateMany({
          where: { shop: session.shop, discountName: targetName },
          data: {
            discountName,
            active: discountActive,
            ...(scheduleLock.locked
              ? {}
              : {
                scheduleStartAt: discountScheduleStartAt,
                scheduleEndAt: discountScheduleEndAt,
              }),
          },
        });
      } catch (error) {
        if (!isUnknownPrismaArgument(error, "discountName")) throw error;
        await prisma.thresholdTier.updateMany({
          where: { shop: session.shop },
          data: {
            active: discountActive,
            ...(scheduleLock.locked
              ? {}
              : {
                scheduleStartAt: discountScheduleStartAt,
                scheduleEndAt: discountScheduleEndAt,
              }),
          },
        });
      }
    }
    const syncableTiers = await getSyncableTiers();
    const syncResult = await syncAutoTierDiscount(admin, syncableTiers);
    if (!syncResult.ok) return { ok: false, errors: { tier: syncResult.error } };
    await syncStorefrontForAdmin(admin, session.shop);
    return { ok: true, tierIntent: intent };
  }

  if (intent === "discount-delete") {
    const discountName = String(formData.get("discountName") || "").trim();
    if (!discountName) {
      return { ok: false, errors: { discountName: "Discount name is required" } };
    }
    try {
      await prisma.thresholdTier.deleteMany({
        where: { shop: session.shop, discountName },
      });
    } catch (error) {
      if (!isUnknownPrismaArgument(error, "discountName")) throw error;
      return {
        ok: false,
        errors: {
          discountName: "Cannot delete this discount in the current database version.",
        },
      };
    }
    if (typeof prisma.tierDiscount?.delete === "function") {
      try {
        await prisma.tierDiscount.delete({
          where: { shop_name: { shop: session.shop, name: discountName } },
        });
      } catch (error) {
        if (isNotFoundOnDelete(error)) {
          // idempotent delete: already removed by prior action or stale UI state
        } else if (!isMissingTableError(error, "TierDiscount")) {
          throw error;
        }
      }
    }
    const syncableTiers = await getSyncableTiers();
    const syncResult = await syncAutoTierDiscount(admin, syncableTiers);
    if (!syncResult.ok) return { ok: false, errors: { tier: syncResult.error } };
    await syncStorefrontForAdmin(admin, session.shop);
    return { ok: true, tierIntent: intent };
  }

  if (
    intent === "tier-create" ||
    intent === "tier-update" ||
    intent === "tier-delete"
  ) {
    await deactivateExpiredThresholdTiers(session.shop);
    if (intent === "tier-delete") {
      if (!id) return { ok: false, errors: { tier: "Tier id is required" } };
      await prisma.thresholdTier.deleteMany({ where: { id, shop: session.shop } });
      const syncableTiers = await getSyncableTiers();
      const syncResult = await syncAutoTierDiscount(admin, syncableTiers);
      if (!syncResult.ok) return { ok: false, errors: { tier: syncResult.error } };
      await syncStorefrontForAdmin(admin, session.shop);
      return { ok: true, tierIntent: intent };
    }

    const tierName = String(formData.get("tierName") || "").trim();
    const tierDiscountName = String(formData.get("tierDiscountName") || "").trim();
    const minSubtotal = Number(String(formData.get("tierMinSubtotal") || "").trim());
    const rewardTypeRaw = String(formData.get("tierRewardType") || "FREE_SHIPPING")
      .trim()
      .toUpperCase();
    const rewardType =
      rewardTypeRaw === "FREE_SHIPPING"
        ? "FREE_SHIPPING"
        : rewardTypeRaw === "FIXED_AMOUNT"
          ? "FIXED_AMOUNT"
          : "PERCENTAGE";
    const discountPercentRaw = String(formData.get("tierDiscountPercent") || "").trim();
    const discountPercent =
      discountPercentRaw === "" ? null : Number(discountPercentRaw);
    const message = String(formData.get("tierMessage") || "").trim();
    const tierActive = true;
    const scheduleStartAt = null;
    const scheduleEndAt = null;

    const tierErrors = {};
    if (!tierDiscountName) tierErrors.tierDiscountName = "Discount name is required";
    if (!tierName) tierErrors.tierName = "Tier name is required";
    if (!Number.isFinite(minSubtotal) || minSubtotal < 0) {
      tierErrors.tierMinSubtotal = "Minimum cart value must be 0 or more";
    }
    if (
      rewardType === "PERCENTAGE" &&
      (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100)
    ) {
      tierErrors.tierDiscountPercent = "Discount % must be between 1 and 100";
    }
    if (
      rewardType === "FIXED_AMOUNT" &&
      (!Number.isFinite(discountPercent) || discountPercent <= 0)
    ) {
      tierErrors.tierDiscountPercent = "Fixed amount must be greater than 0";
    }

    let existingTiers = [];
    try {
      existingTiers = await prisma.thresholdTier.findMany({
        where: { shop: session.shop, discountName: tierDiscountName },
        orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
      });
    } catch (error) {
      if (!isUnknownPrismaArgument(error, "discountName")) throw error;
      existingTiers = await prisma.thresholdTier.findMany({
        where: { shop: session.shop },
        orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
      });
    }
    const duplicateType = existingTiers.some(
      (tier) =>
        tier.id !== id &&
        String(tier.rewardType || "").trim().toUpperCase() === rewardType,
    );
    if (duplicateType) {
      tierErrors.tierRewardType = "This discount type is already used by another tier";
    }

    if (Object.keys(tierErrors).length) return { ok: false, errors: tierErrors };

    let limitTiers = await prisma.thresholdTier.findMany({
      where: { shop: session.shop },
      orderBy: [{ minSubtotal: "asc" }, { position: "asc" }],
    });
    let limitDiscounts = [];
    if (typeof prisma.tierDiscount?.findMany === "function") {
      try {
        limitDiscounts = await prisma.tierDiscount.findMany({ where: { shop: session.shop } });
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
        limitDiscounts = [];
      }
    }
    const limitGroups = groupTiersByDiscount(limitTiers, limitDiscounts);
    const normalizedTierDiscountName = String(tierDiscountName || "").trim();
    const groupExistsForName = limitGroups.some(
      (g) => String(g.discountName || "").trim() === normalizedTierDiscountName,
    );
    if (!groupExistsForName && intent === "tier-create") {
      const discountLimitErr = await rejectIfDiscountLimitReached(
        session.shop,
        billingPlan.planId,
      );
      if (discountLimitErr) return discountLimitErr;
    }

    if (typeof prisma.tierDiscount?.upsert === "function") {
      try {
        await prisma.tierDiscount.upsert({
          where: { shop_name: { shop: session.shop, name: tierDiscountName } },
          create: { shop: session.shop, name: tierDiscountName, active: true },
          update: { active: true },
        });
      } catch (error) {
        if (!isMissingTableError(error, "TierDiscount")) throw error;
      }
    }

    if (intent === "tier-update") {
      if (!id) return { ok: false, errors: { tier: "Tier id is required for update" } };
      try {
        await prisma.thresholdTier.updateMany({
          where: { id, shop: session.shop },
          data: {
            discountName: tierDiscountName,
            name: tierName,
            minSubtotal,
            rewardType,
            discountPercent: rewardType === "FREE_SHIPPING" ? null : discountPercent,
            message,
            active: tierActive,
            scheduleStartAt,
            scheduleEndAt,
          },
        });
      } catch (error) {
        if (
          !isUnknownPrismaArgument(error, "discountName") &&
          !isUnknownPrismaArgument(error, "scheduleStartAt") &&
          !isUnknownPrismaArgument(error, "scheduleEndAt")
        ) {
          throw error;
        }
        await prisma.thresholdTier.updateMany({
          where: { id, shop: session.shop },
          data: {
            name: tierName,
            minSubtotal,
            rewardType,
            discountPercent: rewardType === "FREE_SHIPPING" ? null : discountPercent,
            message,
            active: tierActive,
          },
        });
      }
    } else {
      const currentCount = existingTiers.length;
      if (currentCount >= MAX_ACTIVE_TIERS) {
        return {
          ok: false,
          errors: {
            tier: `Only ${MAX_ACTIVE_TIERS} tiers are allowed per discount. Delete one tier before adding another.`,
          },
        };
      }
      try {
        await prisma.thresholdTier.create({
          data: {
            shop: session.shop,
            discountName: tierDiscountName,
            name: tierName,
            minSubtotal,
            rewardType,
            discountPercent: rewardType === "FREE_SHIPPING" ? null : discountPercent,
            message,
            position: currentCount + 1,
            active: tierActive,
            scheduleStartAt,
            scheduleEndAt,
          },
        });
      } catch (error) {
        if (
          !isUnknownPrismaArgument(error, "discountName") &&
          !isUnknownPrismaArgument(error, "scheduleStartAt") &&
          !isUnknownPrismaArgument(error, "scheduleEndAt")
        ) {
          throw error;
        }
        await prisma.thresholdTier.create({
          data: {
            shop: session.shop,
            name: tierName,
            minSubtotal,
            rewardType,
            discountPercent: rewardType === "FREE_SHIPPING" ? null : discountPercent,
            message,
            position: currentCount + 1,
            active: tierActive,
          },
        });
      }
    }

    const syncableTiers = await getSyncableTiers();
    const syncResult = await syncAutoTierDiscount(admin, syncableTiers);
    if (!syncResult.ok) return { ok: false, errors: { tier: syncResult.error } };
    await syncStorefrontForAdmin(admin, session.shop);
    return { ok: true, tierIntent: intent };
  }

  if (intent === "tier-widget-settings-save") {
    if (!billingPlan.isPremium) {
      return saveFreePlanWidgetSettings(session.shop, formData);
    }

    const sequentialMsg0 = String(formData.get("sequentialMsg0") ?? "").trim();
    const sequentialMsg1 = String(formData.get("sequentialMsg1") ?? "").trim();
    const sequentialMsg2 = String(formData.get("sequentialMsg2") ?? "").trim();
    const sequentialHintZero = String(formData.get("sequentialHintZero") ?? "").trim();
    const sequentialHintMid = String(formData.get("sequentialHintMid") ?? "").trim();
    const tier1Icon = String(formData.get("tier1Icon") ?? "").trim();
    const tier2Icon = String(formData.get("tier2Icon") ?? "").trim();
    const subtotalLabel = String(formData.get("subtotalLabel") ?? "").trim();
    const estimatedShippingLabel = String(formData.get("estimatedShippingLabel") ?? "").trim();
    const widgetBackgroundColor = String(formData.get("widgetBackgroundColor") ?? "").trim();
    const widgetTextColor = String(formData.get("widgetTextColor") ?? "").trim();
    const widgetBorderColor = String(formData.get("widgetBorderColor") ?? "").trim();
    const widgetUseCustomColors = String(formData.get("widgetUseCustomColors") ?? "") === "on";
    const minAmountPrefixText = String(formData.get("minAmountPrefixText") ?? "").trim();
    const showTierIcons = String(formData.get("showTierIcons") ?? "") === "on";
    const showTierLabels = String(formData.get("showTierLabels") ?? "") === "on";
    const showTierMinimums = String(formData.get("showTierMinimums") ?? "") === "on";
    const showHeading = String(formData.get("showHeading") ?? "") === "on";
    const showSubheading = String(formData.get("showSubheading") ?? "") === "on";
    const showTier1Heading = String(formData.get("showTier1Heading") ?? "") === "on";
    const showTier1Subheading = String(formData.get("showTier1Subheading") ?? "") === "on";
    const showTier2Heading = String(formData.get("showTier2Heading") ?? "") === "on";
    const showTier2Subheading = String(formData.get("showTier2Subheading") ?? "") === "on";
    const showHint = String(formData.get("showHint") ?? "") === "on";
    const barFillColor = String(formData.get("barFillColor") ?? "").trim();
    const barTrackColor = String(formData.get("barTrackColor") ?? "").trim();
    const iconBackgroundColor = String(formData.get("iconBackgroundColor") ?? "").trim();
    const iconTextColor = String(formData.get("iconTextColor") ?? "").trim();
    const headingColor = String(formData.get("headingColor") ?? "").trim();
    const subheadingColor = String(formData.get("subheadingColor") ?? "").trim();
    const tierHeadingColor = String(formData.get("tierHeadingColor") ?? "").trim();
    const tierSubheadingColor = String(formData.get("tierSubheadingColor") ?? "").trim();
    const hintColor = String(formData.get("hintColor") ?? "").trim();
    const selectorTargets = String(formData.get("selectorTargets") ?? "").trim();
    const nameTargetSelectors = String(formData.get("nameTargetSelectors") ?? "").trim();
    const sequentialTitle = String(formData.get("sequentialTitle") ?? "").trim();
    const progressBarDesignJsonRaw = String(formData.get("progressBarDesignJson") ?? "").trim();
    let progressBarDesignJson = "{}";
    try {
      const rawDesign = progressBarDesignJsonRaw ? JSON.parse(progressBarDesignJsonRaw) : {};
      progressBarDesignJson = JSON.stringify(sanitizeProgressBarDesignForDb(rawDesign));
    } catch {
      progressBarDesignJson = JSON.stringify(sanitizeProgressBarDesignForDb({}));
    }
    const widgetErrors = {};
    if (!sequentialMsg0) widgetErrors.sequentialMsg0 = "Default frontend message is required";
    if (!sequentialMsg1) widgetErrors.sequentialMsg1 = "Tier 1 frontend message is required";
    if (!sequentialMsg2) widgetErrors.sequentialMsg2 = "Tier 2 frontend message is required";
    if (!sequentialHintZero) widgetErrors.sequentialHintZero = "Initial progress hint is required";
    if (!sequentialHintMid) widgetErrors.sequentialHintMid = "Tier 1 progress hint is required";
    if (!tier1Icon) widgetErrors.tier1Icon = "Tier 1 icon is required";
    if (!tier2Icon) widgetErrors.tier2Icon = "Tier 2 icon is required";
    if (!subtotalLabel) widgetErrors.subtotalLabel = "Subtotal label is required";
    if (!estimatedShippingLabel)
      widgetErrors.estimatedShippingLabel = "Estimated shipping label is required";
    if (widgetUseCustomColors) {
      if (!/^#[0-9a-fA-F]{6}$/.test(widgetBackgroundColor))
        widgetErrors.widgetBackgroundColor = "Background color must be a valid hex color";
      if (!/^#[0-9a-fA-F]{6}$/.test(widgetTextColor))
        widgetErrors.widgetTextColor = "Text color must be a valid hex color";
      if (!/^#[0-9a-fA-F]{6}$/.test(widgetBorderColor))
        widgetErrors.widgetBorderColor = "Border color must be a valid hex color";
    }
    const normalizedWidgetBackgroundColor = /^#[0-9a-fA-F]{6}$/.test(widgetBackgroundColor)
      ? widgetBackgroundColor
      : "#ffffff";
    const normalizedWidgetTextColor = /^#[0-9a-fA-F]{6}$/.test(widgetTextColor)
      ? widgetTextColor
      : "#111827";
    const normalizedWidgetBorderColor = /^#[0-9a-fA-F]{6}$/.test(widgetBorderColor)
      ? widgetBorderColor
      : "#000000";
    const normalizeColor = (value, fallback) =>
      /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim()) ? String(value).trim() : fallback;
    const widgetDynamicConfigJson = JSON.stringify({
      showHeading,
      showSubheading,
      showTier1Heading,
      showTier1Subheading,
      showTier2Heading,
      showTier2Subheading,
      showHint,
      barFillColor: normalizeColor(barFillColor, "#166534"),
      barTrackColor: normalizeColor(barTrackColor, "#cbd5e1"),
      iconBackgroundColor: normalizeColor(iconBackgroundColor, "#166534"),
      iconTextColor: normalizeColor(iconTextColor, "#ffffff"),
      headingColor: normalizeColor(headingColor, "#0f172a"),
      subheadingColor: normalizeColor(subheadingColor, "#334155"),
      tierHeadingColor: normalizeColor(tierHeadingColor, "#0f172a"),
      tierSubheadingColor: normalizeColor(tierSubheadingColor, "#334155"),
      hintColor: normalizeColor(hintColor, "#64748b"),
    });
    if (!minAmountPrefixText) widgetErrors.minAmountPrefixText = "Min amount prefix is required";
    if (!selectorTargets) widgetErrors.selectorTargets = "Target selectors are required";
    if (!nameTargetSelectors) widgetErrors.nameTargetSelectors = "Name target selectors are required";
    if (!sequentialTitle) widgetErrors.sequentialTitle = "Sequential widget title is required";
    if (Object.keys(widgetErrors).length) return { ok: false, errors: widgetErrors };
    if (typeof prisma.tierWidgetSettings?.upsert !== "function") {
      return {
        ok: false,
        errors: {
          sequentialMsg1: "Tier widget settings are unavailable in current runtime. Restart dev server and try again.",
        },
      };
    }
    try {
      await prisma.tierWidgetSettings.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          sequentialMsg0,
          sequentialMsg1,
          sequentialMsg2,
          sequentialHintZero,
          sequentialHintMid,
          tier1Icon,
          tier2Icon,
          subtotalLabel,
          estimatedShippingLabel,
          widgetBackgroundColor: normalizedWidgetBackgroundColor,
          widgetTextColor: normalizedWidgetTextColor,
          widgetBorderColor: normalizedWidgetBorderColor,
          widgetUseCustomColors,
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
          sequentialMsg0,
          sequentialMsg1,
          sequentialMsg2,
          sequentialHintZero,
          sequentialHintMid,
          tier1Icon,
          tier2Icon,
          subtotalLabel,
          estimatedShippingLabel,
          widgetBackgroundColor: normalizedWidgetBackgroundColor,
          widgetTextColor: normalizedWidgetTextColor,
          widgetBorderColor: normalizedWidgetBorderColor,
          widgetUseCustomColors,
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
      });
    } catch (error) {
      const message = String(error?.message || "");
      if (!message.includes("Unknown argument")) throw error;
      await prisma.tierWidgetSettings.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          sequentialMsg1,
          sequentialMsg2,
          selectorTargets,
          nameTargetSelectors,
          sequentialTitle,
        },
        update: {
          sequentialMsg1,
          sequentialMsg2,
          selectorTargets,
          nameTargetSelectors,
          sequentialTitle,
        },
      });
    }
    await syncStorefrontForAdmin(admin, session.shop);
    return { ok: true, tierIntent: intent };
  }

  if (intent === "delete") {
    const isAutomatic = discountType === "DiscountAutomaticApp";
    const mutationId = toMutationId(id, discountType);
    const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, { variables: { id: mutationId } });
    const json = await response.json();
    const payload = isAutomatic ? json?.data?.discountAutomaticDelete : json?.data?.discountCodeDelete;
    if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
    if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
    return { ok: true };
  }

  const title = String(formData.get("title") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const functionId = String(formData.get("functionId") || "").trim();
  const functionHandle = String(formData.get("functionHandle") || "").trim();
  const startsAtRaw = String(formData.get("startsAt") || "").trim();
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const segmentId = String(formData.get("segmentId") || "").trim();
  const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
  const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
  const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
  const appliesOnOneTimePurchase = String(formData.get("appliesOnOneTimePurchase") || "") === "on";
  const appliesOnSubscription = String(formData.get("appliesOnSubscription") || "") === "on";
  const discountClassProduct = String(formData.get("discountClassProduct") || "") === "on";
  const discountClassOrder = String(formData.get("discountClassOrder") || "") === "on";
  const discountClassShipping = String(formData.get("discountClassShipping") || "") === "on";
  const orderPercentageRaw = String(formData.get("orderPercentage") ?? "").trim();
  const productPercentageRaw = String(formData.get("productPercentage") ?? "").trim();
  const shippingPercentageRaw = String(formData.get("shippingPercentage") ?? "").trim();
  const orderPercentage = Number(orderPercentageRaw);
  const productPercentage = Number(productPercentageRaw);
  const shippingPercentage = Number(shippingPercentageRaw);
  const tier1Type = String(formData.get("tier1Type") || "FREE_SHIPPING").trim().toUpperCase();
  const tier1MinSubtotal = Number(String(formData.get("tier1MinSubtotal") ?? "").trim());
  const tier1DiscountPercentage = Number(String(formData.get("tier1DiscountPercentage") ?? "").trim());
  const tier1Message = String(formData.get("tier1Message") ?? "").trim();
  const tier2MinSubtotal = Number(String(formData.get("tier2MinSubtotal") ?? "").trim());
  const tier2DiscountPercentage = Number(String(formData.get("tier2DiscountPercentage") ?? "").trim());
  const tier2Message = String(formData.get("tier2Message") ?? "").trim();
  const sequentialMsg1 = String(formData.get("sequentialMsg1") ?? "").trim();
  const sequentialMsg2 = String(formData.get("sequentialMsg2") ?? "").trim();
  const autoDiscountClasses = ["ORDER", ...(tier1Type === "FREE_SHIPPING" ? ["SHIPPING"] : [])];
  const discountClasses = autoDiscountClasses;
  const orderMessage = String(formData.get("orderMessage") ?? "").trim();
  const productMessage = String(formData.get("productMessage") ?? "").trim();
  const shippingMessage = String(formData.get("shippingMessage") ?? "").trim();
  const resolvedOrderPercentage = tier2DiscountPercentage;
  const resolvedProductPercentage = 0;
  const resolvedShippingPercentage = tier1Type === "FREE_SHIPPING" ? 100 : 0;
  const resolvedOrderMessage = orderMessage || tier2Message || "Tier 2 discount unlocked";
  const resolvedProductMessage = productMessage || "Tier discount";
  const resolvedShippingMessage = shippingMessage || tier1Message || "Free shipping unlocked";
  const orderSelectionStrategy = String(formData.get("orderSelectionStrategy") || "FIRST").trim().toUpperCase();
  const productSelectionStrategy = String(formData.get("productSelectionStrategy") || "FIRST").trim().toUpperCase();
  const uiWidgetTitle = String(formData.get("uiWidgetTitle") ?? "").trim();
  const uiWidgetSubtitle = String(formData.get("uiWidgetSubtitle") ?? "").trim();
  const uiTier1Label = String(formData.get("uiTier1Label") ?? "").trim();
  const uiTier2Label = String(formData.get("uiTier2Label") ?? "").trim();
  const uiTier1Icon = String(formData.get("uiTier1Icon") ?? "").trim();
  const uiTier2Icon = String(formData.get("uiTier2Icon") ?? "").trim();
  const uiPrimaryColor = String(formData.get("uiPrimaryColor") ?? "").trim();
  const uiTrackColor = String(formData.get("uiTrackColor") ?? "").trim();
  const uiTextColor = String(formData.get("uiTextColor") ?? "").trim();
  const uiMutedTextColor = String(formData.get("uiMutedTextColor") ?? "").trim();
  const uiCardBackground = String(formData.get("uiCardBackground") ?? "").trim();
  const uiBorderColor = String(formData.get("uiBorderColor") ?? "").trim();
  const uiIconBackground = String(formData.get("uiIconBackground") ?? "").trim();
  const uiIconTextColor = String(formData.get("uiIconTextColor") ?? "").trim();
  const uiShowProgressBar = String(formData.get("uiShowProgressBar") ?? "true").trim().toLowerCase();
  const discountValueType = String(formData.get("discountValueType") || "PERCENTAGE").trim().toUpperCase();
  const percentage = Number(String(formData.get("percentage") || "").trim());
  const amountOff = Number(String(formData.get("amountOff") || "").trim());
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  const errors = {};
  if (!["code", "custom"].includes(modeRaw)) errors.mode = 'Mode must be "code" or "custom"';
  if (!title) errors.title = "Title is required";
  if (mode === "code" && !["PERCENTAGE", "FIXED_AMOUNT"].includes(discountValueType))
    errors.discountValueType = "Discount type must be Percentage or Fixed Amount";
  if (mode === "code" && discountValueType === "PERCENTAGE" && (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100))
    errors.percentage = "Percentage must be between 1 and 100";
  if (mode === "code" && discountValueType === "FIXED_AMOUNT" && (!Number.isFinite(amountOff) || amountOff <= 0))
    errors.amountOff = "Price off must be greater than 0";
  if (mode === "code" && !code) errors.code = "Code is required";
  if (mode === "custom" && !functionId && !functionHandle)
    errors.functionId = "Function ID or Function Handle is required";
  if (mode === "custom" && !["FREE_SHIPPING", "DISCOUNT"].includes(tier1Type))
    errors.tier1Type = "Tier 1 type must be Free shipping or Discount";
  if (mode === "custom" && (!Number.isFinite(tier1MinSubtotal) || tier1MinSubtotal < 0))
    errors.tier1MinSubtotal = "Tier 1 minimum cart value must be 0 or more";
  if (
    mode === "custom" &&
    tier1Type === "DISCOUNT" &&
    (!Number.isFinite(tier1DiscountPercentage) || tier1DiscountPercentage <= 0 || tier1DiscountPercentage > 100)
  ) {
    errors.tier1DiscountPercentage = "Tier 1 discount percentage must be between 1 and 100";
  }
  if (mode === "custom" && (!Number.isFinite(tier2MinSubtotal) || tier2MinSubtotal < 0))
    errors.tier2MinSubtotal = "Tier 2 minimum cart value must be 0 or more";
  if (
    mode === "custom" &&
    (!Number.isFinite(tier2DiscountPercentage) || tier2DiscountPercentage <= 0 || tier2DiscountPercentage > 100)
  ) {
    errors.tier2DiscountPercentage = "Tier 2 discount percentage must be between 1 and 100";
  }
  if (
    mode === "custom" &&
    Number.isFinite(tier1MinSubtotal) &&
    Number.isFinite(tier2MinSubtotal) &&
    tier2MinSubtotal <= tier1MinSubtotal
  ) {
    errors.tier2MinSubtotal = "Tier 2 minimum must be greater than Tier 1 minimum";
  }
  if (mode === "custom" && (!Number.isFinite(resolvedOrderPercentage) || resolvedOrderPercentage < 0 || resolvedOrderPercentage > 100))
    errors.orderPercentage = "Order percentage must be between 0 and 100";
  if (mode === "custom" && (!Number.isFinite(resolvedShippingPercentage) || resolvedShippingPercentage < 0 || resolvedShippingPercentage > 100))
    errors.shippingPercentage = "Shipping percentage must be between 0 and 100";
  if (mode === "custom" && !["FIRST", "MAXIMUM"].includes(orderSelectionStrategy))
    errors.orderSelectionStrategy = "Order selection strategy must be FIRST or MAXIMUM";
  if (mode === "custom" && !["ALL", "FIRST", "MAXIMUM"].includes(productSelectionStrategy))
    errors.productSelectionStrategy = "Product selection strategy must be ALL, FIRST, or MAXIMUM";
  if (mode === "custom" && !sequentialMsg1)
    errors.sequentialMsg1 = "Tier 1 complete message is required";
  if (mode === "custom" && !sequentialMsg2)
    errors.sequentialMsg2 = "Tier 2 complete message is required";
  if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
  if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) errors.endsAt = "Invalid end date";
  if (!Number.isNaN(startsAt.getTime())) {
    const y = startsAt.getUTCFullYear();
    if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
  }
  if (endsAt && !Number.isNaN(endsAt.getTime())) {
    const y = endsAt.getUTCFullYear();
    if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
  }
  if (endsAt && endsAt.getTime() <= startsAt.getTime())
    errors.endsAt = "End date must be after start date";

  if (mode === "custom" && !functionHandle && functionId) {
    try {
      const typesResponse = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
      const typesJson = await typesResponse.json();
      const availableFunctionIds = new Set(
        (typesJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
      );
      if (!availableFunctionIds.has(functionId))
        errors.functionId = "Selected Function ID is no longer available. Pick a current one or use Function Handle.";
    } catch {
      errors.functionId = "Unable to validate Function ID right now. Try using Function Handle or refresh and submit again.";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  if (mode === "custom") {
    let existingFunctionConfig = null;
    if (intent === "update" && id) {
      try {
        const cfgRes = await admin.graphql(GET_DISCOUNT_FUNCTION_CONFIG, { variables: { id } });
        const cfgJson = await cfgRes.json();
        const mf = cfgJson?.data?.discountNode?.metafield;
        existingFunctionConfig = parseFunctionConfigMetafield(mf);
      } catch {
        existingFunctionConfig = null;
      }
    }

    const functionRef = functionHandle ? { functionHandle } : functionId ? { functionId } : {};
    const automaticAppDiscount = {
      title,
      ...functionRef,
      startsAt: startsAt.toISOString(),
      ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
      discountClasses,
      appliesOnOneTimePurchase,
      appliesOnSubscription,
      combinesWith: {
        orderDiscounts: combinesWithOrder,
        productDiscounts: combinesWithProduct,
        shippingDiscounts: combinesWithShipping,
      },
      metafields: [{
        namespace: "default",
        key: "function-configuration",
        type: "json",
        value: makeFunctionConfig({
          existingConfig: existingFunctionConfig,
          tier1Type, tier1MinSubtotal, tier1DiscountPercentage, tier1Message,
          tier2MinSubtotal, tier2DiscountPercentage, tier2Message,
          discountValueType, amountOff,
          orderPercentage: resolvedOrderPercentage,
          productPercentage: resolvedProductPercentage,
          shippingPercentage: resolvedShippingPercentage,
          orderMessage: resolvedOrderMessage, productMessage: resolvedProductMessage,
          shippingMessage: resolvedShippingMessage,
          orderSelectionStrategy, productSelectionStrategy,
          uiWidgetTitle, uiWidgetSubtitle, uiTier1Label, uiTier2Label,
          uiTier1Icon, uiTier2Icon, uiPrimaryColor, uiTrackColor, uiTextColor,
          uiMutedTextColor, uiCardBackground, uiBorderColor, uiIconBackground,
          uiIconTextColor, uiShowProgressBar,
        }),
      }],
    };
    const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
    const mutationId = toMutationId(id, discountType || "DiscountAutomaticApp");
    const variables = intent === "update" ? { id: mutationId, automaticAppDiscount } : { automaticAppDiscount };
    let json;
    try {
      const response = await admin.graphql(mutation, { variables });
      json = await response.json();
    } catch (error) {
      return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] } };
    }
    const payload = intent === "update" ? json?.data?.discountAutomaticAppUpdate : json?.data?.discountAutomaticAppCreate;
    if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
    if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
    if (typeof prisma.tierWidgetSettings?.upsert === "function") {
      await prisma.tierWidgetSettings.upsert({
        where: { shop: session.shop },
        create: { shop: session.shop, sequentialMsg1, sequentialMsg2 },
        update: { sequentialMsg1, sequentialMsg2 },
      });
    }
    return { ok: true };
  }

  const basicCodeDiscount = {
    title, code,
    startsAt: startsAt.toISOString(),
    ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
    customerSelection: segmentId ? { customerSegments: { add: [segmentId] } } : { all: true },
    combinesWith: {
      orderDiscounts: combinesWithOrder,
      productDiscounts: combinesWithProduct,
      shippingDiscounts: combinesWithShipping,
    },
    customerGets: {
      items: { all: true },
      value: discountValueType === "FIXED_AMOUNT"
        ? { discountAmount: { amount: String(amountOff), appliesOnEachItem: false } }
        : { percentage: percentage / 100 },
    },
  };
  const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
  const mutationId = toMutationId(id, discountType || "DiscountCodeBasic");
  const variables = intent === "update" ? { id: mutationId, basicCodeDiscount } : { basicCodeDiscount };
  let json;
  try {
    const response = await admin.graphql(mutation, { variables });
    json = await response.json();
  } catch (error) {
    return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] } };
  }
  const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
  if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
  if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
  return { ok: true };
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

/** Returns inline style object for a status badge */
function statusBadgeStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    lineHeight: "20px",
    whiteSpace: "nowrap",
  };
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return { ...base, background: "#d1fae5", color: "#065f46" };
    case "SCHEDULED":
      return { ...base, background: "#dbeafe", color: "#1e40af" };
    case "EXPIRED":
      return { ...base, background: "#fee2e2", color: "#991b1b" };
    default:
      return { ...base, background: "#f3f4f6", color: "#6b7280" };
  }
}

function discountScheduleDisplay(group) {
  const hasSchedule = Boolean(group?.discountScheduleStartAt || group?.discountScheduleEndAt);
  if (hasSchedule) {
    return `${group.discountScheduleStartAt ? group.discountScheduleStartAt.toLocaleString() : "Now"} - ${group.discountScheduleEndAt ? group.discountScheduleEndAt.toLocaleString() : "No end"}`;
  }
  return group?.discountActive === false ? "-" : "Always On";
}

function statusDot(status) {
  const colors = {
    ACTIVE: "#10b981",
    SCHEDULED: "#3b82f6",
    EXPIRED: "#ef4444",
    INACTIVE: "#9ca3af",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: colors[String(status || "").toUpperCase()] || "#9ca3af",
        marginRight: 5,
        flexShrink: 0,
      }}
    />
  );
}

const REWARD_ICONS = {
  FREE_SHIPPING: "🚚",
  PERCENTAGE: "%",
  FIXED_AMOUNT: "",
};

const REWARD_LABELS = {
  FREE_SHIPPING: "Free Shipping",
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
};

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step, total = 3, labels = [] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: 8,
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone = num < step;
        return (
          <div key={num} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: isDone ? "#166534" : isActive ? "#1a7340" : "#e5e7eb",
                  color: isDone || isActive ? "#fff" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: isActive ? "0 0 0 3px #bbf7d0" : "none",
                  transition: "all 0.2s",
                }}
              >
                {isDone ? "✓" : num}
              </div>
              {labels[i] ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#166534" : isDone ? "#374151" : "#9ca3af",
                    whiteSpace: "nowrap",
                  }}
                >
                  {labels[i]}
                </span>
              ) : null}
            </div>
            {num < total && (
              <div
                style={{
                  width: 64,
                  height: 2,
                  background: isDone ? "#166534" : "#e5e7eb",
                  marginBottom: labels[i] ? 16 : 0,
                  transition: "background 0.2s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Setup Status Card ───────────────────────────────────────────────────────

function SetupStatusCard({ step1Label, step2Label, step3Label }) {
  const items = [
    { label: "Discount details", status: step1Label },
    { label: "Tiers", status: step2Label },
    { label: "Schedule & save", status: step3Label },
  ];
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, i) => {
        const ready = item.status === "Ready";
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 6,
              background: ready ? "#f0fdf4" : "#fff",
              border: `1px solid ${ready ? "#bbf7d0" : "#e5e7eb"}`,
              flex: "1 1 160px",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: ready ? "#166534" : "#e5e7eb",
                color: ready ? "#fff" : "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {ready ? "✓" : i + 1}
            </span>
            <div>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: ready ? "#166534" : "#9ca3af", fontWeight: 600 }}>
                {item.status}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tier Card ───────────────────────────────────────────────────────────────

function TierCard({ tier, position, onEdit, onDelete, canDelete, upgradeHref }) {
  const rewardType = String(tier.rewardType || "").toUpperCase();
  const icon = REWARD_ICONS[rewardType] || "🎁";
  const label = REWARD_LABELS[rewardType] || rewardType;
  const value =
    rewardType === "FREE_SHIPPING"
      ? "Free"
      : rewardType === "FIXED_AMOUNT"
        ? `${tier.discountPercent || 0}`
        : `${tier.discountPercent || 0}%`;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "box-shadow 0.15s",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{tier.name}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 10,
              background: "#dbeafe",
              color: "#1e40af",
            }}
          >
            Tier {position}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Min cart: <strong style={{ color: "#374151" }}>{tier.minSubtotal}</strong>
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {label}: <strong style={{ color: "#374151" }}>{value}</strong>
          </span>
          {tier.message && (
            <span style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
              "{tier.message}"
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Edit
        </button>
        <PlanGatedDeleteButton
          canDelete={canDelete}
          upgradeHref={upgradeHref}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}

function OverviewCreateButton({ onClick, children, disabled, disabledTitle }) {
  return (
    <button
      type="button"
      className="disc-btn disc-btn-primary disc-create-btn"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
    >
      <span style={{  color: "rgb(0 123 96)"}} aria-hidden="true">+</span>
      <span style={{ color: "rgb(0 123 96)" }}>{children}</span>
    </button>
  );
}

function DiscountStorefrontToggle({ active, onChange, disabled }) {
  return (
    <label
      className={`disc-storefront-toggle${active ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
      title={active ? "Visible on storefront" : "Hidden on storefront"}
    >
      <input
        type="checkbox"
        checked={active}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={active ? "Storefront visibility on" : "Storefront visibility off"}
      />
      <span className="disc-storefront-toggle-track" aria-hidden="true">
        <span className="disc-storefront-toggle-thumb" />
      </span>
      <span className="disc-storefront-toggle-text">{active ? "On" : "Off"}</span>
    </label>
  );
}

function DiscountOverviewRow({
  group,
  totalDiscountUsageCount,
  onConfigure,
  onDelete,
  onToggleActive,
  suppressStorefrontActive,
  canDelete,
  upgradeHref,
  isPlanLocked = false,
  planLockedMessage = PLAN_LOCKED_ITEM_MESSAGE,
}) {
  const storefrontActive =
    suppressStorefrontActive ? false : group.discountActive !== false;
  return (
    <tr
      key={group.discountName}
      className={planLockedRowClassName(isPlanLocked)}
      title={isPlanLocked ? planLockedMessage : undefined}
      aria-disabled={isPlanLocked || undefined}
    >
      <td>
        <div className="disc-overview-discount-name">{group.discountName}</div>
        {group.tiers.length > 0 && (
          <div className="disc-overview-tier-tags">
            {group.tiers.slice(0, MAX_ACTIVE_TIERS).map((tier) => (
              <span key={tier.id} className="disc-overview-tier-tag">
                {tier.minSubtotal}+
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="disc-overview-storefront-active">
        <DiscountStorefrontToggle
          active={storefrontActive}
          disabled={!onToggleActive || isPlanLocked}
          onChange={(next) => onToggleActive?.(next)}
        />
      </td>
      <td>
        <span style={statusBadgeStyle(group.discountStatus)}>
          {statusDot(group.discountStatus)}
          {group.discountStatus}
        </span>
      </td>
      <td>
        <span className="disc-overview-active-count">{group.activeCount}</span>
      </td>
      {/* <td className="disc-overview-tracked">
        {Math.max(Number(group.usageSum ?? 0), Number(totalDiscountUsageCount ?? 0))}
      </td> */}
      <td className="disc-overview-schedule">
        <span className={discountScheduleDisplay(group) === "Always On" ? "disc-overview-always-on" : undefined}>
          {discountScheduleDisplay(group)}
        </span>
      </td>
      <td>
        <div className="disc-overview-actions">
          <s-button
            type="button"
            variant="secondary"
            icon="edit"
            disabled={isPlanLocked}
            title={isPlanLocked ? planLockedMessage : undefined}
            onClick={isPlanLocked ? undefined : onConfigure}>

          </s-button>
          <PlanGatedDeleteButton
            canDelete={canDelete}
            upgradeHref={upgradeHref}
            onClick={onDelete}
          />
        </div>
      </td>
    </tr>
  );
}


// ─── Component ───────────────────────────────────────────────────────────────

export default function DiscountsIndex() {
  const {
    nodes = [],
    appDiscountTypes = [],
    errors = null,
    editDiscount = null,
    tierRules = [],
    tierDiscounts = [],
    totalDiscountUsageCount = 0,
    tierWidgetSettings = null,
    previewTier = null,
    previewSubtotal = 0,
    shopCurrencyCode = "USD",
    billingPlan: loaderBillingPlan = null,
  } = useLoaderData() ?? {};
  const { onboarding, billingPlan: outletBillingPlan } = useOutletContext() || {};
  const billingPlan = loaderBillingPlan ?? outletBillingPlan;
  const isPremium = Boolean(billingPlan?.isPremium);
  const canDeleteRecords = isPremium;
  const billingUpgradeHref = useBillingUpgradeHref();
  const maxTierDiscounts = billingPlan?.limits?.maxDiscounts ?? null;
  const tierDiscountLimitMessage =
    maxTierDiscounts != null ? freePlanDiscountLimitMessage(maxTierDiscounts) : "";
  const isDiscountPlanLocked = useCallback(
    (discountName) =>
      !isDiscountEditableOnPlan(
        billingPlan?.planId,
        discountName,
        billingPlan?.planSlots,
      ),
    [billingPlan?.planId, billingPlan?.planSlots],
  );
  const actionData = useActionData();
  const revalidator = useRevalidator();
  const location = useLocation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const visibleActionErrors = useMemo(() => {
    const src = actionData?.errors;
    if (!src || typeof src !== "object" || Array.isArray(src)) return src || null;
    const next = { ...src };
    delete next.discountScheduleConflict;
    return Object.keys(next).length ? next : null;
  }, [actionData?.errors]);

  const [tierName, setTierName] = useState("");
  const [tierDiscountName, setTierDiscountName] = useState("Default Discount");
  const [tierMinSubtotal, setTierMinSubtotal] = useState("");
  const [tierRewardType, setTierRewardType] = useState("FREE_SHIPPING");
  const [tierDiscountPercent, setTierDiscountPercent] = useState("");
  const [tierMessage, setTierMessage] = useState("");
  const [tierEditId, setTierEditId] = useState("");
  const [tierFormInModalOpen, setTierFormInModalOpen] = useState(false);
  const [tierDiscountModalStep, setTierDiscountModalStep] = useState(1);
  const [pendingTierDiscountStep, setPendingTierDiscountStep] = useState(null);
  const [selectedTierDetails, setSelectedTierDetails] = useState(null);
  const [discountEditName, setDiscountEditName] = useState("");
  const [discountEditOriginalName, setDiscountEditOriginalName] = useState("");
  const [discountEditActive, setDiscountEditActive] = useState(false);
  const [discountEditStartAt, setDiscountEditStartAt] = useState("");
  const [discountEditEndAt, setDiscountEditEndAt] = useState("");
  const [showTierDiscountModal, setShowTierDiscountModal] = useState(false);
  const [previewCartTotal, setPreviewCartTotal] = useState(
    previewSubtotal > 0 ? String(previewSubtotal) : "",
  );
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState(editDiscount?.mode || "custom");
  const [title, setTitle] = useState(editDiscount?.title || "");
  const [code, setCode] = useState(editDiscount?.code || "");
  const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [combinesWithOrder, setCombinesWithOrder] = useState(editDiscount?.combinesWithOrder ?? false);
  const [combinesWithProduct, setCombinesWithProduct] = useState(editDiscount?.combinesWithProduct ?? false);
  const [combinesWithShipping, setCombinesWithShipping] = useState(editDiscount?.combinesWithShipping ?? false);
  const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(editDiscount?.appliesOnOneTimePurchase ?? true);
  const [appliesOnSubscription, setAppliesOnSubscription] = useState(editDiscount?.appliesOnSubscription ?? false);
  const [discountClassProduct, setDiscountClassProduct] = useState(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
  const [discountClassOrder, setDiscountClassOrder] = useState(editDiscount?.discountClasses?.includes("ORDER") ?? false);
  const [discountClassShipping, setDiscountClassShipping] = useState(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
  const [discountValueType, setDiscountValueType] = useState(editDiscount?.discountValueType || "PERCENTAGE");
  const [percentage, setPercentage] = useState(editDiscount?.percentage || "");
  const [amountOff, setAmountOff] = useState(editDiscount?.amountOff || "");
  const [orderPercentage, setOrderPercentage] = useState("");
  const [productPercentage, setProductPercentage] = useState("");
  const [shippingPercentage, setShippingPercentage] = useState("");
  const [tier1Type, setTier1Type] = useState("FREE_SHIPPING");
  const [tier1MinSubtotal, setTier1MinSubtotal] = useState("500");
  const [tier1DiscountPercentage, setTier1DiscountPercentage] = useState("10");
  const [tier1Message, setTier1Message] = useState("Tier 1 unlocked");
  const [tier2MinSubtotal, setTier2MinSubtotal] = useState("1000");
  const [tier2DiscountPercentage, setTier2DiscountPercentage] = useState("20");
  const [tier2Message, setTier2Message] = useState("Tier 2 unlocked");
  const [orderMessage, setOrderMessage] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [orderSelectionStrategy, setOrderSelectionStrategy] = useState("FIRST");
  const [productSelectionStrategy, setProductSelectionStrategy] = useState("FIRST");
  const [uiWidgetTitle, setUiWidgetTitle] = useState("Rewards progress");
  const [uiWidgetSubtitle, setUiWidgetSubtitle] = useState("Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.");
  const [uiTier1Label, setUiTier1Label] = useState("Discount");
  const [uiTier2Label, setUiTier2Label] = useState("Free shipping");
  const [uiTier1Icon, setUiTier1Icon] = useState("%");
  const [uiTier2Icon, setUiTier2Icon] = useState("🚚");
  const [uiPrimaryColor, setUiPrimaryColor] = useState("#166534");
  const [uiTrackColor, setUiTrackColor] = useState("#cbd5e1");
  const [uiTextColor, setUiTextColor] = useState("#0f172a");
  const [uiMutedTextColor, setUiMutedTextColor] = useState("#64748b");
  const [uiCardBackground, setUiCardBackground] = useState("#ffffff");
  const [uiBorderColor, setUiBorderColor] = useState("#d1d5db");
  const [uiIconBackground, setUiIconBackground] = useState("#166534");
  const [uiIconTextColor, setUiIconTextColor] = useState("#ffffff");
  const [uiShowProgressBar, setUiShowProgressBar] = useState("true");
  const [sequentialMsg1, setSequentialMsg1] = useState(tierWidgetSettings?.sequentialMsg1 || "Apply discount to unlock free shipping");
  const [sequentialMsg2, setSequentialMsg2] = useState(tierWidgetSettings?.sequentialMsg2 || "Free shipping unlocked");
  const [sequentialMsg0, setSequentialMsg0] = useState(
    tierWidgetSettings?.sequentialMsg0 || "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
  );
  const [sequentialHintZero, setSequentialHintZero] = useState(
    tierWidgetSettings?.sequentialHintZero || "Progress: 0% - unlock Tier 1 to start.",
  );
  const [sequentialHintMid, setSequentialHintMid] = useState(
    tierWidgetSettings?.sequentialHintMid || "Progress: 50% - unlock Tier 2 for free shipping.",
  );
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewPageSize, setOverviewPageSize] = useState(5);
  const [overviewQuery, setOverviewQuery] = useState("");
  const [overviewSort, setOverviewSort] = useState("created_asc");
  const [showDeleteDiscountModal, setShowDeleteDiscountModal] = useState(false);
  const [pendingDeleteDiscountName, setPendingDeleteDiscountName] = useState("");
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [showScheduleConfirmModal, setShowScheduleConfirmModal] = useState(false);
  const [suppressStorefrontActiveName, setSuppressStorefrontActiveName] = useState("");
  const [tier1Icon, setTier1Icon] = useState(tierWidgetSettings?.tier1Icon || "%");
  const [tier2Icon, setTier2Icon] = useState(tierWidgetSettings?.tier2Icon || "🚚");
  const [subtotalLabel, setSubtotalLabel] = useState(
    tierWidgetSettings?.subtotalLabel || "Current subtotal",
  );
  const [estimatedShippingLabel, setEstimatedShippingLabel] = useState(
    tierWidgetSettings?.estimatedShippingLabel || "Estimated shipping",
  );
  const [widgetBackgroundColor, setWidgetBackgroundColor] = useState(
    tierWidgetSettings?.widgetBackgroundColor || "#ffffff",
  );
  const [widgetTextColor, setWidgetTextColor] = useState(
    tierWidgetSettings?.widgetTextColor || "#111827",
  );
  const [widgetBorderColor, setWidgetBorderColor] = useState(
    tierWidgetSettings?.widgetBorderColor || "#000000",
  );
  const [widgetUseCustomColors, setWidgetUseCustomColors] = useState(
    Boolean(tierWidgetSettings?.widgetUseCustomColors),
  );
  const [minAmountPrefixText, setMinAmountPrefixText] = useState(
    tierWidgetSettings?.minAmountPrefixText || "Min.",
  );
  const [showTierIcons, setShowTierIcons] = useState(
    Boolean(tierWidgetSettings?.showTierIcons ?? true),
  );
  const [showTierLabels, setShowTierLabels] = useState(
    Boolean(tierWidgetSettings?.showTierLabels ?? true),
  );
  const [showTierMinimums, setShowTierMinimums] = useState(
    Boolean(tierWidgetSettings?.showTierMinimums ?? true),
  );
  const parsedDynamicConfig = useMemo(() => {
    try {
      const parsed = JSON.parse(String(tierWidgetSettings?.widgetDynamicConfigJson || "{}"));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [tierWidgetSettings?.widgetDynamicConfigJson]);
  const [showHeading, setShowHeading] = useState(
    Boolean(parsedDynamicConfig.showHeading ?? true),
  );
  const [showSubheading, setShowSubheading] = useState(
    Boolean(parsedDynamicConfig.showSubheading ?? true),
  );
  const [showTier1Heading, setShowTier1Heading] = useState(
    Boolean(parsedDynamicConfig.showTier1Heading ?? true),
  );
  const [showTier1Subheading, setShowTier1Subheading] = useState(
    Boolean(parsedDynamicConfig.showTier1Subheading ?? true),
  );
  const [showTier2Heading, setShowTier2Heading] = useState(
    Boolean(parsedDynamicConfig.showTier2Heading ?? true),
  );
  const [showTier2Subheading, setShowTier2Subheading] = useState(
    Boolean(parsedDynamicConfig.showTier2Subheading ?? true),
  );
  const [showHint, setShowHint] = useState(Boolean(parsedDynamicConfig.showHint ?? true));
  const [widgetSettingsTab, setWidgetSettingsTab] = useState("progress");
  const [barFillColor, setBarFillColor] = useState(parsedDynamicConfig.barFillColor || "#166534");
  const [barTrackColor, setBarTrackColor] = useState(parsedDynamicConfig.barTrackColor || "#cbd5e1");
  const [iconBackgroundColor, setIconBackgroundColor] = useState(
    parsedDynamicConfig.iconBackgroundColor || "#166534",
  );
  const [iconTextColor, setIconTextColor] = useState(parsedDynamicConfig.iconTextColor || "#ffffff");
  const [headingColor, setHeadingColor] = useState(parsedDynamicConfig.headingColor || "#0f172a");
  const [subheadingColor, setSubheadingColor] = useState(
    parsedDynamicConfig.subheadingColor || "#334155",
  );
  const [tierHeadingColor, setTierHeadingColor] = useState(
    parsedDynamicConfig.tierHeadingColor || "#0f172a",
  );
  const [tierSubheadingColor, setTierSubheadingColor] = useState(
    parsedDynamicConfig.tierSubheadingColor || "#334155",
  );
  const [hintColor, setHintColor] = useState(parsedDynamicConfig.hintColor || "#64748b");
  const [selectorTargets, setSelectorTargets] = useState(
    tierWidgetSettings?.selectorTargets || ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
  );
  const [nameTargetSelectors, setNameTargetSelectors] = useState(
    tierWidgetSettings?.nameTargetSelectors || ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
  );
  const [sequentialTitle, setSequentialTitle] = useState(tierWidgetSettings?.sequentialTitle || "Rewards progress");
  const [progressBarDesign, setProgressBarDesign] = useState(() =>
    mergeProgressBarDesign(tierWidgetSettings?.progressBarDesignJson),
  );
  const [overlayEditKey, setOverlayEditKey] = useState("tierBefore");

  const patchProgressBarDesign = useCallback((key, partial) => {
    setProgressBarDesign((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  }, []);

  const patchBarStyleRoot = useCallback((partial) => {
    setProgressBarDesign((prev) => ({
      ...prev,
      barStyle: { ...prev.barStyle, ...partial },
    }));
  }, []);

  const patchBarStylePhase = useCallback((tier, phase, partial) => {
    const t = tier === "tier2" ? "tier2" : "tier1";
    const ph = phase === "after" ? "after" : "before";
    setProgressBarDesign((prev) => ({
      ...prev,
      barStyle: {
        ...prev.barStyle,
        [t]: {
          ...prev.barStyle[t],
          [ph]: { ...prev.barStyle[t][ph], ...partial },
        },
      },
    }));
  }, []);

  const resetBarStyleDefaults = useCallback(() => {
    setProgressBarDesign((prev) => ({
      ...prev,
      barStyle: defaultBarStyle(),
    }));
  }, []);

  const resetBadgeBackgroundDefaults = useCallback(() => {
    const def = defaultBarStyle();
    setProgressBarDesign((prev) => ({
      ...prev,
      barStyle: {
        ...prev.barStyle,
        tier1: {
          before: {
            ...prev.barStyle.tier1.before,
            badgeBackgroundColor: def.tier1.before.badgeBackgroundColor,
            iconColor: def.tier1.before.iconColor,
          },
          after: {
            ...prev.barStyle.tier1.after,
            badgeBackgroundColor: def.tier1.after.badgeBackgroundColor,
            iconColor: def.tier1.after.iconColor,
          },
        },
        tier2: {
          before: {
            ...prev.barStyle.tier2.before,
            badgeBackgroundColor: def.tier2.before.badgeBackgroundColor,
            iconColor: def.tier2.before.iconColor,
          },
          after: {
            ...prev.barStyle.tier2.after,
            badgeBackgroundColor: def.tier2.after.badgeBackgroundColor,
            iconColor: def.tier2.after.iconColor,
          },
        },
      },
    }));
  }, []);

  const progressBarDesignJsonSubmit = useMemo(
    () => JSON.stringify(sanitizeProgressBarDesignForDb(progressBarDesign)),
    [progressBarDesign],
  );

  const readOverlayAssetFile = useCallback((key, file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (url.length > 450000) return;
      patchProgressBarDesign(key, { imageDataUrl: url });
    };
    reader.readAsDataURL(file);
  }, [patchProgressBarDesign]);

  const editDiscountId = editDiscount?.id || "__new__";
  const normalizedTierRules = useMemo(() => normalizeTierRows(tierRules), [tierRules]);
  const groupedTierDiscounts = useMemo(() => groupTiersByDiscount(tierRules, tierDiscounts), [tierRules, tierDiscounts]);
  const discountNameOptions = useMemo(() => {
    const names = groupedTierDiscounts.map((g) => g.discountName).filter(Boolean);
    if (!names.length) return ["Default Discount"];
    return names;
  }, [groupedTierDiscounts]);
  const hasCreatedDiscount = groupedTierDiscounts.length > 0;
  const openDeleteDiscountModal = useCallback((discountName) => {
    if (!canDeleteRecords) return;
    setPendingDeleteDiscountName(String(discountName || "").trim());
    setShowDeleteDiscountModal(true);
  }, [canDeleteRecords]);
  const closeDeleteDiscountModal = useCallback(() => {
    setShowDeleteDiscountModal(false);
    setPendingDeleteDiscountName("");
  }, []);
  const confirmDeleteDiscount = useCallback(() => {
    const discountName = String(pendingDeleteDiscountName || "").trim();
    if (!discountName) return;
    const fd = new FormData();
    fd.set("intent", "discount-delete");
    fd.set("discountName", discountName);
    submit(fd, { method: "post" });
    closeDeleteDiscountModal();
  }, [closeDeleteDiscountModal, pendingDeleteDiscountName, submit]);

  const tierModalDiscountKey = useMemo(
    () => String(discountEditOriginalName || discountEditName || "").trim(),
    [discountEditOriginalName, discountEditName],
  );
  const tierModalPlanLocked = useMemo(
    () => isDiscountPlanLocked(tierModalDiscountKey),
    [isDiscountPlanLocked, tierModalDiscountKey],
  );
  const modalDiscountHasPersisted = useMemo(() => {
    if (!tierModalDiscountKey) return false;
    return groupedTierDiscounts.some((g) => g.discountName === tierModalDiscountKey);
  }, [groupedTierDiscounts, tierModalDiscountKey]);
  const discountNameIsDuplicate = useMemo(() => {
    const trimmed = String(discountEditName || "").trim();
    if (!trimmed) return false;
    if (trimmed === String(discountEditOriginalName || "").trim()) return false;
    return groupedTierDiscounts.some(
      (g) => String(g.discountName || "").trim().toLowerCase() === trimmed.toLowerCase(),
    );
  }, [discountEditName, discountEditOriginalName, groupedTierDiscounts]);
  const sectionsUnlocked = modalDiscountHasPersisted && !discountNameIsDuplicate;
  const setupHasDiscountSchedule = useMemo(
    () => Boolean(String(discountEditStartAt || "").trim()) || Boolean(String(discountEditEndAt || "").trim()),
    [discountEditStartAt, discountEditEndAt],
  );
  const persistedScheduleLocked = useMemo(() => {
    if (!tierModalDiscountKey) return false;
    const g = groupedTierDiscounts.find((x) => String(x.discountName || "").trim() === tierModalDiscountKey);
    if (!g) return false;
    return Boolean(g.discountScheduleStartAt || g.discountScheduleEndAt);
  }, [groupedTierDiscounts, tierModalDiscountKey]);
  const activeTierDiscountFilterKey = showTierDiscountModal ? tierModalDiscountKey : tierDiscountName;

  useEffect(() => {
    if (showTierDiscountModal) return;
    if (!discountNameOptions.length) { setTierDiscountName(""); return; }
    if (!discountNameOptions.includes(tierDiscountName)) setTierDiscountName(discountNameOptions[0]);
  }, [showTierDiscountModal, discountNameOptions, tierDiscountName]);

  useEffect(() => {
    if (!actionData?.ok || actionData?.tierIntent !== "discount-upsert") return;
    const next = String(discountEditName || "").trim();
    if (next) { setDiscountEditOriginalName(next); setTierDiscountName(next); }
    if (!showTierDiscountModal) return;
    if (pendingTierDiscountStep === "done") {
      setShowTierDiscountModal(false); setTierFormInModalOpen(false);
      setTierDiscountModalStep(1); setPendingTierDiscountStep(null); setTierEditId("");
      return;
    }
    if (typeof pendingTierDiscountStep === "number") {
      setTierDiscountModalStep(pendingTierDiscountStep); setPendingTierDiscountStep(null);
    }
  }, [actionData, showTierDiscountModal, pendingTierDiscountStep, discountEditName]);

  useEffect(() => {
    if (!actionData?.ok || actionData?.tierIntent !== "discount-delete") return;
    setShowTierDiscountModal(false); setTierFormInModalOpen(false);
    setTierDiscountModalStep(1); setPendingTierDiscountStep(null);
    setDiscountEditOriginalName(""); setDiscountEditName(""); setTierEditId("");
  }, [actionData]);

  const selectedDiscountTierRules = useMemo(
    () => normalizedTierRules.filter(
      (tier) => String(tier.discountName || "").trim() === String(activeTierDiscountFilterKey || "").trim(),
    ),
    [normalizedTierRules, activeTierDiscountFilterKey],
  );
  const selectedDiscountUsageCount = useMemo(() => {
    const group = groupedTierDiscounts.find((g) => g.discountName === String(tierModalDiscountKey || "").trim());
    if (!group) return Number(totalDiscountUsageCount || 0);
    return Math.max(Number(group.usageSum ?? 0), Number(totalDiscountUsageCount || 0));
  }, [groupedTierDiscounts, tierModalDiscountKey, totalDiscountUsageCount]);
  const activeDiscountGroups = useMemo(
    () =>
      groupedTierDiscounts.filter(
        (group) => String(group.discountStatus || "").toUpperCase() === "ACTIVE",
      ),
    [groupedTierDiscounts],
  );
  const primaryActiveDiscount = activeDiscountGroups[0] || null;
  const hasMultipleActiveDiscounts = activeDiscountGroups.length > 1;
  const usedTierRewardTypes = useMemo(() => {
    const used = new Set();
    for (const tier of selectedDiscountTierRules) {
      if (tierEditId && tier.id === tierEditId) continue;
      used.add(String(tier.rewardType || "").toUpperCase());
    }
    return used;
  }, [selectedDiscountTierRules, tierEditId]);
  const availableTierRewardTypes = useMemo(
    () => TIER_DISCOUNT_TYPES.filter((opt) => !usedTierRewardTypes.has(opt.value)),
    [usedTierRewardTypes],
  );
  const hasAnyAvailableTierType = availableTierRewardTypes.length > 0;
  const maxTierLimitReached =
    !tierEditId && (selectedDiscountTierRules.length >= MAX_ACTIVE_TIERS || !hasAnyAvailableTierType);
  const showAddTierButton =
    !tierFormInModalOpen &&
    selectedDiscountTierRules.length < MAX_ACTIVE_TIERS &&
    hasAnyAvailableTierType;
  const canProceedToScheduleStep = selectedDiscountTierRules.length > 0;
  const tierDiscountLimitReached =
    maxTierDiscounts != null && groupedTierDiscounts.length >= maxTierDiscounts;
  const openCreateTierDiscountModal = useCallback(() => {
    if (tierDiscountLimitReached) return;
    setDiscountEditName(""); setDiscountEditOriginalName("");
    setDiscountEditActive(false); setDiscountEditStartAt(""); setDiscountEditEndAt("");
    setTierEditId(""); setTierFormInModalOpen(false); setTierDiscountModalStep(1);
    setTierName(""); setTierMinSubtotal(""); setTierRewardType("FREE_SHIPPING");
    setTierDiscountPercent(""); setTierMessage(""); setShowTierDiscountModal(true);
  }, [tierDiscountLimitReached]);

  const submitDiscountActiveToggle = useCallback(
    (discountName, nextActive) => {
      const name = String(discountName || "").trim();
      if (!name) return;
      if (nextActive) setSuppressStorefrontActiveName(name);
      else setSuppressStorefrontActiveName((prev) => (prev === name ? "" : prev));
      const fd = new FormData();
      fd.set("intent", "discount-toggle-active");
      fd.set("discountName", name);
      if (nextActive) fd.set("discountActive", "on");
      submit(fd, { method: "post" });
    },
    [submit],
  );

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("fromSetup") !== "1") return;

    const el = document.getElementById("setup-guide-discount-overview");
    requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (!hasCreatedDiscount) {
      openCreateTierDiscountModal();
    }

    sp.delete("fromSetup");
    const nextSearch = sp.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  }, [
    location.pathname,
    location.search,
    hasCreatedDiscount,
    navigate,
    openCreateTierDiscountModal,
  ]);

  const processedOverviewDiscounts = useMemo(() => {
    const query = overviewQuery.trim().toLowerCase();
    const filtered = groupedTierDiscounts.filter((group) => {
      if (!query) return true;
      const status = String(group.discountStatus || "").toLowerCase();
      const tiers = (group.tiers || []).map((t) => String(t.minSubtotal || "")).join(" ");
      return `${group.discountName || ""} ${status} ${tiers}`.toLowerCase().includes(query);
    });
    const sorted = [...filtered].sort((a, b) => {
      if (overviewSort === "name_asc") return String(a.discountName || "").localeCompare(String(b.discountName || ""));
      if (overviewSort === "name_desc") return String(b.discountName || "").localeCompare(String(a.discountName || ""));
      if (overviewSort === "usage_desc") return Number(b.usageSum || 0) - Number(a.usageSum || 0);
      if (overviewSort === "updated_desc") {
        const aTs = new Date(a.discountScheduleStartAt || 0).getTime();
        const bTs = new Date(b.discountScheduleStartAt || 0).getTime();
        return bTs - aTs;
      }
      return (a.discountCreatedAt ?? 0) - (b.discountCreatedAt ?? 0);
    });
    return sorted;
  }, [groupedTierDiscounts, overviewQuery, overviewSort]);
  const overviewTotalItems = processedOverviewDiscounts.length;
  const overviewPageSizeSafe = Math.max(1, Math.floor(Number(overviewPageSize)) || 5);
  const overviewPaginationNeeded = overviewTotalItems > overviewPageSizeSafe;
  const overviewTotalPages =
    overviewTotalItems === 0 ? 1 : Math.ceil(overviewTotalItems / overviewPageSizeSafe);
  const overviewCurrentPage = Math.min(Math.max(1, overviewPage), overviewTotalPages);
  const paginatedOverviewDiscounts = useMemo(() => {
    const start = (overviewCurrentPage - 1) * overviewPageSizeSafe;
    return processedOverviewDiscounts.slice(start, start + overviewPageSizeSafe);
  }, [processedOverviewDiscounts, overviewCurrentPage, overviewPageSizeSafe]);

  useEffect(() => {
    setOverviewPage(1);
  }, [overviewQuery, overviewPageSize]);

  useEffect(() => {
    const total = processedOverviewDiscounts.length;
    const ps = Math.max(1, Math.floor(Number(overviewPageSize)) || 5);
    const totalPages = total === 0 ? 1 : Math.ceil(total / ps);
    setOverviewPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [processedOverviewDiscounts.length, overviewPageSize]);

  useEffect(() => {
    const timer = setInterval(() => { revalidator.revalidate(); }, 15000);
    return () => clearInterval(timer);
  }, [revalidator]);

  useEffect(() => {
    setMode(editDiscount?.mode || "custom");
    setTitle(editDiscount?.title || "");
    setCode(editDiscount?.code || "");
    setFunctionId(editDiscount?.functionId || "");
    setDiscountClassProduct(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
    setDiscountClassOrder(editDiscount?.discountClasses?.includes("ORDER") ?? false);
    setDiscountClassShipping(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
    setCombinesWithOrder(editDiscount?.combinesWithOrder ?? false);
    setCombinesWithProduct(editDiscount?.combinesWithProduct ?? false);
    setCombinesWithShipping(editDiscount?.combinesWithShipping ?? false);
    setAppliesOnOneTimePurchase(editDiscount?.appliesOnOneTimePurchase ?? true);
    setAppliesOnSubscription(editDiscount?.appliesOnSubscription ?? false);
    const cf = customFieldsFromFunctionConfig(editDiscount?.functionConfig || null);
    if (editDiscount?.mode === "custom" && cf) {
      setDiscountValueType(cf.discountValueType); setAmountOff(cf.amountOff);
      setPercentage(cf.percentage || ""); setOrderPercentage(cf.orderPercentage);
      setProductPercentage(cf.productPercentage); setShippingPercentage(cf.shippingPercentage);
      setTier1Type(cf.tier1Type); setTier1MinSubtotal(cf.tier1MinSubtotal);
      setTier1DiscountPercentage(cf.tier1DiscountPercentage); setTier1Message(cf.tier1Message);
      setTier2MinSubtotal(cf.tier2MinSubtotal); setTier2DiscountPercentage(cf.tier2DiscountPercentage);
      setTier2Message(cf.tier2Message); setOrderMessage(cf.orderMessage);
      setProductMessage(cf.productMessage); setShippingMessage(cf.shippingMessage);
      setOrderSelectionStrategy(cf.orderSelectionStrategy); setProductSelectionStrategy(cf.productSelectionStrategy);
      setUiWidgetTitle(cf.uiWidgetTitle); setUiWidgetSubtitle(cf.uiWidgetSubtitle);
      setUiTier1Label(cf.uiTier1Label); setUiTier2Label(cf.uiTier2Label);
      setUiTier1Icon(cf.uiTier1Icon); setUiTier2Icon(cf.uiTier2Icon);
      setUiPrimaryColor(cf.uiPrimaryColor); setUiTrackColor(cf.uiTrackColor);
      setUiTextColor(cf.uiTextColor); setUiMutedTextColor(cf.uiMutedTextColor);
      setUiCardBackground(cf.uiCardBackground); setUiBorderColor(cf.uiBorderColor);
      setUiIconBackground(cf.uiIconBackground); setUiIconTextColor(cf.uiIconTextColor);
      setUiShowProgressBar(cf.uiShowProgressBar);
    } else {
      setDiscountValueType(editDiscount?.discountValueType || "PERCENTAGE");
      setPercentage(editDiscount?.percentage || ""); setAmountOff(editDiscount?.amountOff || "");
      setOrderPercentage(""); setProductPercentage(""); setShippingPercentage("");
      setTier1Type("FREE_SHIPPING"); setTier1MinSubtotal("500"); setTier1DiscountPercentage("10");
      setTier1Message("Tier 1 unlocked"); setTier2MinSubtotal("1000"); setTier2DiscountPercentage("20");
      setTier2Message("Tier 2 unlocked"); setOrderMessage(""); setProductMessage(""); setShippingMessage("");
      setOrderSelectionStrategy("FIRST"); setProductSelectionStrategy("FIRST");
      setUiWidgetTitle("Rewards progress");
      setUiWidgetSubtitle("Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.");
      setUiTier1Label("Discount"); setUiTier2Label("Free shipping"); setUiTier1Icon("%"); setUiTier2Icon("🚚");
      setUiPrimaryColor("#166534"); setUiTrackColor("#cbd5e1"); setUiTextColor("#0f172a");
      setUiMutedTextColor("#64748b"); setUiCardBackground("#ffffff"); setUiBorderColor("#d1d5db");
      setUiIconBackground("#166534"); setUiIconTextColor("#ffffff"); setUiShowProgressBar("true");
    }
    setSequentialMsg1(tierWidgetSettings?.sequentialMsg1 || "Apply discount to unlock free shipping");
    setSequentialMsg2(tierWidgetSettings?.sequentialMsg2 || "Free shipping unlocked");
    setSequentialMsg0(
      tierWidgetSettings?.sequentialMsg0 ||
      "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
    );
    setSequentialHintZero(
      tierWidgetSettings?.sequentialHintZero || "Progress: 0% - unlock Tier 1 to start.",
    );
    setSequentialHintMid(
      tierWidgetSettings?.sequentialHintMid || "Progress: 50% - unlock Tier 2 for free shipping.",
    );
    setTier1Icon(tierWidgetSettings?.tier1Icon || "%");
    setTier2Icon(tierWidgetSettings?.tier2Icon || "🚚");
    setSubtotalLabel(tierWidgetSettings?.subtotalLabel || "Current subtotal");
    setEstimatedShippingLabel(
      tierWidgetSettings?.estimatedShippingLabel || "Estimated shipping",
    );
    setWidgetBackgroundColor(tierWidgetSettings?.widgetBackgroundColor || "#ffffff");
    setWidgetTextColor(tierWidgetSettings?.widgetTextColor || "#111827");
    setWidgetBorderColor(tierWidgetSettings?.widgetBorderColor || "#000000");
    setWidgetUseCustomColors(Boolean(tierWidgetSettings?.widgetUseCustomColors));
    setMinAmountPrefixText(tierWidgetSettings?.minAmountPrefixText || "Min.");
    setShowTierIcons(Boolean(tierWidgetSettings?.showTierIcons ?? true));
    setShowTierLabels(Boolean(tierWidgetSettings?.showTierLabels ?? true));
    setShowTierMinimums(Boolean(tierWidgetSettings?.showTierMinimums ?? true));
    setShowHeading(Boolean(parsedDynamicConfig.showHeading ?? true));
    setShowSubheading(Boolean(parsedDynamicConfig.showSubheading ?? true));
    setShowTier1Heading(Boolean(parsedDynamicConfig.showTier1Heading ?? true));
    setShowTier1Subheading(Boolean(parsedDynamicConfig.showTier1Subheading ?? true));
    setShowTier2Heading(Boolean(parsedDynamicConfig.showTier2Heading ?? true));
    setShowTier2Subheading(Boolean(parsedDynamicConfig.showTier2Subheading ?? true));
    setShowHint(Boolean(parsedDynamicConfig.showHint ?? true));
    setBarFillColor(parsedDynamicConfig.barFillColor || "#166534");
    setBarTrackColor(parsedDynamicConfig.barTrackColor || "#cbd5e1");
    setIconBackgroundColor(parsedDynamicConfig.iconBackgroundColor || "#166534");
    setIconTextColor(parsedDynamicConfig.iconTextColor || "#ffffff");
    setHeadingColor(parsedDynamicConfig.headingColor || "#0f172a");
    setSubheadingColor(parsedDynamicConfig.subheadingColor || "#334155");
    setTierHeadingColor(parsedDynamicConfig.tierHeadingColor || "#0f172a");
    setTierSubheadingColor(parsedDynamicConfig.tierSubheadingColor || "#334155");
    setHintColor(parsedDynamicConfig.hintColor || "#64748b");
    setSelectorTargets(tierWidgetSettings?.selectorTargets || ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks");
    setNameTargetSelectors(tierWidgetSettings?.nameTargetSelectors || ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks");
    setSequentialTitle(tierWidgetSettings?.sequentialTitle || "Rewards progress");
    setProgressBarDesign(mergeProgressBarDesign(tierWidgetSettings?.progressBarDesignJson));
    setStartsAt(isoToLocalDateTimeInput(editDiscount?.startsAt || ""));
    setEndsAt(isoToLocalDateTimeInput(editDiscount?.endsAt || ""));
  }, [
    editDiscountId,
    tierWidgetSettings?.sequentialMsg1,
    tierWidgetSettings?.sequentialMsg2,
    tierWidgetSettings?.sequentialMsg0,
    tierWidgetSettings?.sequentialHintZero,
    tierWidgetSettings?.sequentialHintMid,
    tierWidgetSettings?.tier1Icon,
    tierWidgetSettings?.tier2Icon,
    tierWidgetSettings?.subtotalLabel,
    tierWidgetSettings?.estimatedShippingLabel,
    tierWidgetSettings?.widgetBackgroundColor,
    tierWidgetSettings?.widgetTextColor,
    tierWidgetSettings?.widgetBorderColor,
    tierWidgetSettings?.widgetUseCustomColors,
    tierWidgetSettings?.minAmountPrefixText,
    tierWidgetSettings?.showTierIcons,
    tierWidgetSettings?.showTierLabels,
    tierWidgetSettings?.showTierMinimums,
    parsedDynamicConfig.showHeading,
    parsedDynamicConfig.showSubheading,
    parsedDynamicConfig.showTier1Heading,
    parsedDynamicConfig.showTier1Subheading,
    parsedDynamicConfig.showTier2Heading,
    parsedDynamicConfig.showTier2Subheading,
    parsedDynamicConfig.showHint,
    parsedDynamicConfig.barFillColor,
    parsedDynamicConfig.barTrackColor,
    parsedDynamicConfig.iconBackgroundColor,
    parsedDynamicConfig.iconTextColor,
    parsedDynamicConfig.headingColor,
    parsedDynamicConfig.subheadingColor,
    parsedDynamicConfig.tierHeadingColor,
    parsedDynamicConfig.tierSubheadingColor,
    parsedDynamicConfig.hintColor,
    tierWidgetSettings?.selectorTargets,
    tierWidgetSettings?.nameTargetSelectors,
    tierWidgetSettings?.sequentialTitle,
    tierWidgetSettings?.progressBarDesignJson,
  ]);

  useEffect(() => {
    if (actionData?.ok && !editDiscount) {
      setTitle(""); setCode(""); setSegmentId(""); setStartsAt(""); setEndsAt("");
      setDiscountValueType("PERCENTAGE"); setPercentage(""); setAmountOff("");
      setCombinesWithOrder(false); setCombinesWithProduct(false); setCombinesWithShipping(false);
      setAppliesOnOneTimePurchase(true); setAppliesOnSubscription(false);
      setDiscountClassProduct(true); setDiscountClassOrder(false); setDiscountClassShipping(true);
      setOrderPercentage(""); setProductPercentage(""); setShippingPercentage("");
      setTier1Type("FREE_SHIPPING"); setTier1MinSubtotal("500"); setTier1DiscountPercentage("10");
      setTier1Message("Tier 1 unlocked"); setTier2MinSubtotal("1000"); setTier2DiscountPercentage("20");
      setTier2Message("Tier 2 unlocked"); setOrderMessage(""); setProductMessage(""); setShippingMessage("");
      setOrderSelectionStrategy("FIRST"); setProductSelectionStrategy("FIRST");
      setUiWidgetTitle("Rewards progress");
      setUiWidgetSubtitle("Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.");
      setUiTier1Label("Discount"); setUiTier2Label("Free shipping"); setUiTier1Icon("%"); setUiTier2Icon("🚚");
      setUiPrimaryColor("#166534"); setUiTrackColor("#cbd5e1"); setUiTextColor("#0f172a");
      setUiMutedTextColor("#64748b"); setUiCardBackground("#ffffff"); setUiBorderColor("#d1d5db");
      setUiIconBackground("#166534"); setUiIconTextColor("#ffffff"); setUiShowProgressBar("true");
      setSequentialMsg1(tierWidgetSettings?.sequentialMsg1 || "Apply discount to unlock free shipping");
      setSequentialMsg2(tierWidgetSettings?.sequentialMsg2 || "Free shipping unlocked");
      setSequentialMsg0(
        tierWidgetSettings?.sequentialMsg0 ||
        "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
      );
      setSequentialHintZero(
        tierWidgetSettings?.sequentialHintZero || "Progress: 0% - unlock Tier 1 to start.",
      );
      setSequentialHintMid(
        tierWidgetSettings?.sequentialHintMid || "Progress: 50% - unlock Tier 2 for free shipping.",
      );
      setTier1Icon(tierWidgetSettings?.tier1Icon || "%");
      setTier2Icon(tierWidgetSettings?.tier2Icon || "🚚");
      setSubtotalLabel(tierWidgetSettings?.subtotalLabel || "Current subtotal");
      setEstimatedShippingLabel(
        tierWidgetSettings?.estimatedShippingLabel || "Estimated shipping",
      );
      setWidgetBackgroundColor(tierWidgetSettings?.widgetBackgroundColor || "#ffffff");
      setWidgetTextColor(tierWidgetSettings?.widgetTextColor || "#111827");
      setWidgetBorderColor(tierWidgetSettings?.widgetBorderColor || "#000000");
      setWidgetUseCustomColors(Boolean(tierWidgetSettings?.widgetUseCustomColors));
      setMinAmountPrefixText(tierWidgetSettings?.minAmountPrefixText || "Min.");
      setShowTierIcons(Boolean(tierWidgetSettings?.showTierIcons ?? true));
      setShowTierLabels(Boolean(tierWidgetSettings?.showTierLabels ?? true));
      setShowTierMinimums(Boolean(tierWidgetSettings?.showTierMinimums ?? true));
      setShowHeading(Boolean(parsedDynamicConfig.showHeading ?? true));
      setShowSubheading(Boolean(parsedDynamicConfig.showSubheading ?? true));
      setShowTier1Heading(Boolean(parsedDynamicConfig.showTier1Heading ?? true));
      setShowTier1Subheading(Boolean(parsedDynamicConfig.showTier1Subheading ?? true));
      setShowTier2Heading(Boolean(parsedDynamicConfig.showTier2Heading ?? true));
      setShowTier2Subheading(Boolean(parsedDynamicConfig.showTier2Subheading ?? true));
      setShowHint(Boolean(parsedDynamicConfig.showHint ?? true));
      setBarFillColor(parsedDynamicConfig.barFillColor || "#166534");
      setBarTrackColor(parsedDynamicConfig.barTrackColor || "#cbd5e1");
      setIconBackgroundColor(parsedDynamicConfig.iconBackgroundColor || "#166534");
      setIconTextColor(parsedDynamicConfig.iconTextColor || "#ffffff");
      setHeadingColor(parsedDynamicConfig.headingColor || "#0f172a");
      setSubheadingColor(parsedDynamicConfig.subheadingColor || "#334155");
      setTierHeadingColor(parsedDynamicConfig.tierHeadingColor || "#0f172a");
      setTierSubheadingColor(parsedDynamicConfig.tierSubheadingColor || "#334155");
      setHintColor(parsedDynamicConfig.hintColor || "#64748b");
      setSelectorTargets(tierWidgetSettings?.selectorTargets || ".product__info-container, .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks");
      setNameTargetSelectors(tierWidgetSettings?.nameTargetSelectors || ".cart-drawer__content, .drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks");
      setSequentialTitle(tierWidgetSettings?.sequentialTitle || "Rewards progress");
      setProgressBarDesign(mergeProgressBarDesign(tierWidgetSettings?.progressBarDesignJson));
    }
  }, [
    actionData,
    tierWidgetSettings?.sequentialMsg0,
    tierWidgetSettings?.sequentialMsg1,
    tierWidgetSettings?.sequentialMsg2,
    tierWidgetSettings?.sequentialHintZero,
    tierWidgetSettings?.sequentialHintMid,
    tierWidgetSettings?.tier1Icon,
    tierWidgetSettings?.tier2Icon,
    tierWidgetSettings?.subtotalLabel,
    tierWidgetSettings?.estimatedShippingLabel,
    tierWidgetSettings?.widgetBackgroundColor,
    tierWidgetSettings?.widgetTextColor,
    tierWidgetSettings?.widgetBorderColor,
    tierWidgetSettings?.widgetUseCustomColors,
    tierWidgetSettings?.minAmountPrefixText,
    tierWidgetSettings?.showTierIcons,
    tierWidgetSettings?.showTierLabels,
    tierWidgetSettings?.showTierMinimums,
    parsedDynamicConfig.showHeading,
    parsedDynamicConfig.showSubheading,
    parsedDynamicConfig.showTier1Heading,
    parsedDynamicConfig.showTier1Subheading,
    parsedDynamicConfig.showTier2Heading,
    parsedDynamicConfig.showTier2Subheading,
    parsedDynamicConfig.showHint,
    parsedDynamicConfig.barFillColor,
    parsedDynamicConfig.barTrackColor,
    parsedDynamicConfig.iconBackgroundColor,
    parsedDynamicConfig.iconTextColor,
    parsedDynamicConfig.headingColor,
    parsedDynamicConfig.subheadingColor,
    parsedDynamicConfig.tierHeadingColor,
    parsedDynamicConfig.tierSubheadingColor,
    parsedDynamicConfig.hintColor,
    tierWidgetSettings?.selectorTargets,
    tierWidgetSettings?.nameTargetSelectors,
    tierWidgetSettings?.sequentialTitle,
    tierWidgetSettings?.progressBarDesignJson,
  ]);

  useEffect(() => {
    if (!actionData?.ok || actionData?.tierIntent !== "tier-widget-settings-save") return;
    revalidator.revalidate();
  }, [actionData?.ok, actionData?.tierIntent, revalidator]);

  const withShopifyParams = (path) => {
    const [pathname, existingQuery = ""] = path.split("?");
    const current = new URLSearchParams(location.search);
    const keep = new URLSearchParams(existingQuery);
    for (const key of ["host", "shop"]) {
      const val = current.get(key);
      if (val && !keep.has(key)) keep.set(key, val);
    }
    const qs = keep.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => {
      const d = n.discount || {};
      const codeVal = d?.codes?.nodes?.[0]?.code || "";
      return `${d.title || ""} ${codeVal} ${d.__typename || ""}`.toLowerCase().includes(q);
    });
  }, [filter, nodes]);

  const functionOptions = useMemo(() => {
    const byId = new Map();
    for (const t of appDiscountTypes || []) {
      const id = t?.functionId;
      if (!id) continue;
      byId.set(id, t?.title ? `${t.title} - ${id}` : id);
    }
    return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
  }, [appDiscountTypes]);

  useEffect(() => {
    if (mode === "custom" && !editDiscount && !functionId && functionOptions.length)
      setFunctionId(functionOptions[0].id || "");
  }, [editDiscount, functionId, functionOptions, mode]);

  useEffect(() => {
    if (!hasAnyAvailableTierType) return;
    const currentSelectedIsAllowed = availableTierRewardTypes.some((opt) => opt.value === tierRewardType);
    if (!currentSelectedIsAllowed) { setTierRewardType(availableTierRewardTypes[0].value); setTierDiscountPercent(""); }
  }, [availableTierRewardTypes, hasAnyAvailableTierType, tierRewardType]);

  useEffect(() => {
    if (!actionData?.ok || actionData?.tierIntent !== "tier-create") return;
    if (showTierDiscountModal && tierModalDiscountKey) setTierDiscountName(tierModalDiscountKey);
    else setTierDiscountName(discountNameOptions[0] || "");
    setTierName(""); setTierMinSubtotal("");
    const nextType = availableTierRewardTypes[0]?.value || "FREE_SHIPPING";
    setTierRewardType(nextType); setTierDiscountPercent(""); setTierMessage("");
    setTierFormInModalOpen(false);
  }, [actionData, availableTierRewardTypes, discountNameOptions, showTierDiscountModal, tierModalDiscountKey]);

  useEffect(() => {
    if (!actionData?.ok) return;
    const ti = actionData?.tierIntent;
    if (ti === "tier-update" || ti === "tier-delete") { setTierFormInModalOpen(false); setTierEditId(""); }
  }, [actionData]);
  useEffect(() => {
    if (!showTierDiscountModal) return;
    const conflictMessage = actionData?.errors?.discountScheduleConflict;
    if (!conflictMessage) return;
    setShowScheduleConfirmModal(false);
    setDiscountEditActive(false);
    if (!persistedScheduleLocked) {
      setDiscountEditStartAt("");
      setDiscountEditEndAt("");
    }
    setNoticeTitle("Schedule conflict");
    setNoticeMessage(String(conflictMessage));
    setShowNoticeModal(true);
  }, [actionData, persistedScheduleLocked, showTierDiscountModal]);

  useEffect(() => {
    if (!actionData?.ok || actionData.tierIntent !== "discount-toggle-active") return;
    setSuppressStorefrontActiveName("");
  }, [actionData]);

  useEffect(() => {
    if (!actionData || actionData.ok) return;
    const toggleError =
      actionData?.errors?.discountActive || actionData?.errors?.discountName;
    if (!toggleError) return;
    if (showTierDiscountModal) setDiscountEditActive(false);
    setNoticeTitle("Could not update discount");
    setNoticeMessage(String(toggleError));
    setShowNoticeModal(true);
  }, [actionData, showTierDiscountModal]);

  useEffect(() => {
    if (!functionOptions.length) return;
    const validIds = new Set(functionOptions.map((o) => o.id));
    if (mode === "custom" && (!functionId || !validIds.has(functionId)))
      setFunctionId(functionOptions[0].id || "");
  }, [functionId, functionOptions, mode]);

  const handleDiscountFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      formData.set("intent", editDiscount ? "update" : "create");
      if (editDiscount?.id) formData.set("id", editDiscount.id);
      if (editDiscount?.typename) formData.set("discountType", editDiscount.typename);
      if (mode === "custom") { formData.set("functionId", functionId); formData.set("functionHandle", ""); }
      formData.set("startsAt", localDateTimeInputToIso(startsAt));
      formData.set("endsAt", localDateTimeInputToIso(endsAt));
      if (mode === "code") {
        if (discountValueType === "PERCENTAGE") formData.set("amountOff", "");
        else formData.set("percentage", "");
      }
      submit(formData, { method: "post" });
    },
    [editDiscount, mode, functionId, startsAt, endsAt, discountValueType, submit],
  );

  const scheduleRangeInvalid = useMemo(() => {
    if (!discountEditStartAt || !discountEditEndAt) return false;
    return new Date(discountEditEndAt).getTime() <= new Date(discountEditStartAt).getTime();
  }, [discountEditStartAt, discountEditEndAt]);

  const setupStatusStep1Label = useMemo(
    () => (String(discountEditName || "").trim() ? "Ready" : "Not ready yet"),
    [discountEditName],
  );
  const setupStatusStep2Label = useMemo(
    () => (selectedDiscountTierRules.length > 0 ? "Ready" : "Not ready yet"),
    [selectedDiscountTierRules.length],
  );
  const setupStatusStep3Label = useMemo(() => {
    if (persistedScheduleLocked) return "Ready";
    if (scheduleRangeInvalid) return "Not ready yet";
    return "Ready";
  }, [persistedScheduleLocked, scheduleRangeInvalid]);

  const submitDiscountSetup = useCallback(
    (nextStep) => {
      const fd = new FormData();
      fd.set("intent", "discount-upsert");
      fd.set("originalDiscountName", discountEditOriginalName);
      fd.set("discountName", discountEditName);
      if (!setupHasDiscountSchedule && discountEditActive) fd.set("discountActive", "on");
      fd.set("discountScheduleStartAt", discountEditStartAt);
      fd.set("discountScheduleEndAt", discountEditEndAt);
      setPendingTierDiscountStep(nextStep);
      submit(fd, { method: "post" });
    },
    [discountEditOriginalName, discountEditName, setupHasDiscountSchedule, discountEditActive, discountEditStartAt, discountEditEndAt, submit],
  );

  const handleFinalDiscountSetupSave = useCallback(() => {
    if (scheduleRangeInvalid) return;
    const settingNewSchedule =
      !persistedScheduleLocked &&
      (Boolean(String(discountEditStartAt || "").trim()) || Boolean(String(discountEditEndAt || "").trim()));
    if (settingNewSchedule) {
      setShowScheduleConfirmModal(true);
      return;
    }
    submitDiscountSetup("done");
  }, [scheduleRangeInvalid, persistedScheduleLocked, discountEditStartAt, discountEditEndAt, submitDiscountSetup]);
  const confirmFinalDiscountSetupSave = useCallback(() => {
    setShowScheduleConfirmModal(false);
    submitDiscountSetup("done");
  }, [submitDiscountSetup]);

  const widgetPreviewTiers = useMemo(
    () => resolveEligibleActiveTiers(tierRules, tierDiscounts),
    [tierRules, tierDiscounts],
  );
  const dynamicTierLabels = useMemo(
    () => resolveTierCaptionLabels(widgetPreviewTiers),
    [widgetPreviewTiers],
  );
  const widgetPreviewMins = useMemo(
    () => resolveWidgetPreviewMins(widgetPreviewTiers),
    [widgetPreviewTiers],
  );

  const livePreviewSubtotal = Number(previewCartTotal || 0);
  const liveTier1Min = widgetPreviewMins.liveTier1Min;
  const liveTier2Min = widgetPreviewMins.liveTier2Min;
  const liveProgress = resolveLiveWidgetProgress(livePreviewSubtotal, liveTier1Min, liveTier2Min);
  const liveHintText =
    liveProgress === 0 ? sequentialHintZero : liveProgress === 50 ? sequentialHintMid : sequentialMsg2;
  const liveWidgetBg = widgetBackgroundColor || "#ffffff";
  const liveWidgetText = widgetUseCustomColors ? widgetTextColor : "#111827";
  const liveWidgetBorder = widgetUseCustomColors ? widgetBorderColor : "#000000";

  // ── Inline CSS ──────────────────────────────────────────────────────────────
  const css = `
    .disc-page { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .disc-modal-overlay {
      position: fixed; inset: 0; background: rgba(32,34,35,0.45);
      z-index: 2100; display: grid; place-items: center; padding: 16px;
      backdrop-filter: blur(2px);
    }
    .disc-modal {
      width: min(920px,100%); max-height: 92vh; overflow: auto;
      background: #fff; border-radius: 14px; border: 1px solid #e5e7eb;
      box-shadow: 0 16px 44px rgba(15, 23, 42, 0.16); padding: 28px;
    }
    .disc-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; margin-bottom: 24px;
    }
    .disc-modal-title { font-size: 17px; font-weight: 700; color: #111827; }
    .disc-close-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e5e7eb;
       background: rgb(0 123 96 / 10%); color: rgb(0 123 96); font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .disc-close-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
    .disc-hero {
      background: linear-gradient(135deg, #f6f6f7 0%, #f1f5fe 100%);
      border: 1px solid #dfe3e8; border-radius: 12px; padding: 24px 28px;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    .disc-tier-metrics {
      display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 12px;
    }
    .disc-tier-metric {
      background: #fff; border: 1px solid #dfe3e8; border-radius: 12px; padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }
    .disc-tier-metric-label {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; font-weight: 700;
      margin-bottom: 6px;
    }
    .disc-tier-metric-value {
      font-size: 24px; line-height: 1.1; font-weight: 800; color: #111827;
    }
    .disc-tier-metric-sub {
      margin-top: 4px; font-size: 12px; color: #6b7280;
    }
    .disc-tier-metric-icon-badge svg,
    .disc-tier-metric-icon-badge svg path {
      fill: rgb(0 123 96) !important;
    }

    .disc-tier-metric--warning {
      border-color: #fdba74; background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%);
    }
    .disc-hero-icon {
      width: 52px; height: 52px; border-radius: 12px; background: #005bd3;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0,91,211,0.25);
    }
    .disc-table-wrapper { overflow: hidden; border: 1px solid #e5e7eb; border-radius: 10px; }
    .disc-table { width: 100%; border-collapse: collapse; }
    .disc-table th {
      background: #f8fafc; padding: 10px 16px; text-align: left;
      font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.08em;
      text-transform: uppercase; border-bottom: 1px solid #e5e7eb;
    }
    .disc-table td { padding: 14px 16px; font-size: 13px; color: #374151; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .disc-table tr:last-child td { border-bottom: none; }
    .disc-table tr:hover td { background: #f9fafb; }
    .disc-table-toolbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      margin-bottom: 10px; flex-wrap: wrap;
    }
    .disc-table-tools {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .disc-table-tools input,
    .disc-table-tools select {
      height: 34px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 10px; font-size: 13px;
      background: #fff; color: #1f2937;
    }
    .disc-table-pagination {
      display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 10px; flex-wrap: wrap;
    }
    .disc-table-page-meta { font-size: 12px; color: #6b7280; }
    .disc-table-page-actions { display: flex; align-items: center; gap: 8px; }
    .disc-create-btn { min-height: 36px; }
    .disc-overview-discount-name { font-weight: 700; color: #111827; font-size: 14px; }
    .disc-overview-tier-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .disc-overview-tier-tag {
      font-size: 11px; padding: 1px 8px; border-radius: 10px;
      background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb;
    }
    .disc-overview-active-count { font-weight: 500;  }
    .disc-overview-tracked { font-weight: 600; }
    .disc-overview-schedule { font-size: 12px; color: #6b7280; }
    .disc-overview-always-on {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; padding: 2px 8px; border-radius: 10px;
      background: #f1f8ff; color: #003f8c; border: 1px solid #b6d8ff; font-weight: 600;
    }
    .disc-overview-actions { display: flex; gap: 8px; }
    .disc-overview-storefront-active { white-space: nowrap; }
    .disc-storefront-toggle {
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
    }
    .disc-storefront-toggle.is-disabled { opacity: 0.55; cursor: not-allowed; }
    .disc-storefront-toggle input {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .disc-storefront-toggle-track {
      position: relative; width: 40px; height: 22px; border-radius: 999px;
      background: #d1d5db; transition: background 0.2s;
    }
    .disc-storefront-toggle.is-on .disc-storefront-toggle-track { background: #007b60; }
    .disc-storefront-toggle-thumb {
      position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform 0.2s;
    }
    .disc-storefront-toggle.is-on .disc-storefront-toggle-thumb { transform: translateX(18px); }
    .disc-storefront-toggle-text {
      font-size: 12px; font-weight: 600; color: #374151; min-width: 22px;
    }
    .disc-configure-btn, .disc-delete-btn { padding: 5px 12px; font-size: 12px; }
    .disc-delete-icon { color: #dc2626; }
    .disc-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.15s; border: none; text-decoration: none;
    }
   .disc-btn-primary {
  background: rgb(0 123 96 / 10%);
    color: rgb(0 123 96); 
}

.disc-btn-primary:hover {
  background: rgb(0 123 96 / 20%); /* optional: slightly darker on hover */
   color: rgb(0 123 96); 
  transform: translateY(-1px);
}

.disc-btn-primary:disabled {
  background: rgb(0 123 96 / 10%);
  color: rgb(0 123 96); 
  cursor: not-allowed;
  transform: none;
}
    .disc-btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
    .disc-btn-secondary:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }
    .disc-btn-secondary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .disc-btn-tertiary { background: transparent; color: #374151; border: 1px solid #e5e7eb; }
    .disc-btn-tertiary:hover:not(:disabled) { background: #f9fafb; }
    .disc-btn-tertiary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .disc-btn:disabled {
      cursor: not-allowed;
    }
    .disc-btn-danger { background: #fff; color: #dc2626; border: 1px solid #fca5a5; }
    .disc-btn-danger:hover { background: #fee2e2; border-color: #ef4444; }
    .disc-btn-back { background: transparent; color: #6b7280; border: none; padding: 6px 0; font-size: 13px; }
    .disc-btn-back:hover { color: #374151; }
    .disc-field { display: flex; flex-direction: column; gap: 5px; }
    .disc-field label { font-size: 13px; font-weight: 600; color: #374151; }
    .disc-field input, .disc-field select {
      padding: 8px 12px; border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 14px; color: #111827; background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s; outline: none; width: 100%; box-sizing: border-box;
    }
    .disc-field input:focus, .disc-field select:focus {
      border-color: #005bd3; box-shadow: 0 0 0 3px rgba(0,91,211,0.12);
    }
    .disc-field-error { font-size: 11px; color: #dc2626; font-weight: 500; }
    .disc-field input.has-error, .disc-field select.has-error { border-color: #ef4444; }
    .disc-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .disc-section-divider { height: 1px; background: #f1f5f9; margin: 20px 0; }
    .disc-empty-state {
      text-align: center; padding: 48px 24px;
      background: #fafafa; border-radius: 10px; border: 2px dashed #dfe3e8;
    }
    .disc-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .disc-empty-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .disc-empty-desc { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
    .disc-warning-box {
      background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
      padding: 10px 14px; font-size: 13px; color: #9a3412; display: flex; gap: 8px; align-items: flex-start;
    }
    .disc-info-box {
      background: #f1f8ff; border: 1px solid #b6d8ff; border-radius: 8px;
      padding: 10px 14px; font-size: 13px; color: #003f8c; display: flex; gap: 8px; align-items: flex-start;
    }
    .disc-summary-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px;
    }
    .disc-tier-form-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;
    }
    .disc-checkbox-row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .disc-checkbox-row input[type=checkbox] { width: 16px; height: 16px; accent-color: #005bd3; cursor: pointer; }
    .disc-checkbox-row span { font-size: 13px; color: #374151; }
    .disc-onboarding-card {
      background: linear-gradient(135deg, #f6f6f7, #f1f5fe);
      border: 1px solid #dfe3e8; border-radius: 12px; padding: 20px 24px;
    }
    .disc-error-card {
      background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 16px 20px;
    }
    .disc-advanced-card {
      background: var(--p-color-bg-surface, #fff);
      border: 1px solid var(--p-color-border, #e3e3e3);
      border-radius: 12px;
      overflow: visible;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    }
    .disc-advanced-card > details {
      overflow: visible;
    }
    .disc-advanced-summary::-webkit-details-marker {
      display: none;
    }
    .disc-advanced-summary {
      padding: 14px 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      list-style: none; 
      border-bottom: 1px solid var(--p-color-border, #e3e3e3);
    }
    .disc-advanced-summary::after {
      content: "";
      width: 7px;
      height: 7px;
      margin-left: 8px;
      border-right: 2px solid #616161;
      border-bottom: 2px solid #616161;
      transform: rotate(45deg);
      transition: transform 0.15s ease;
      flex-shrink: 0;
    }
    details[open] > .disc-advanced-summary::after {
      transform: rotate(-135deg);
      margin-top: 2px;
    }
     
    .disc-advanced-summary-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--p-color-bg-fill-info-secondary, #e0e9ff);
      color: var(--p-color-text-info, #005bd3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .disc-advanced-summary-sub {
      margin-left: auto;
      color: var(--p-color-text-secondary, #616161);
      font-size: 12px;
      font-weight: 400;
      text-align: right;
    //   max-width: min(42%, 280px);
      line-height: 1.35;
    }
    .disc-advanced-body {
      padding: 16px;
    //   background: var(--p-color-bg-surface-secondary, #f6f6f7);
      overflow: visible;
    }
    @media (min-width: 600px) {
      .disc-advanced-body { padding: 20px 24px 24px; }
    }
    .disc-advanced-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
      max-width: 1280px;
      margin: 0 auto;
    }
    @media (min-width: 820px) {
      .disc-advanced-layout {
        grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
        gap: 28px;
        align-items: start;
      }
    }
    .disc-advanced-settings-wrap {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .disc-advanced-preview-wrap {
      position: sticky;
      top: 12px;
      z-index: 12;
      align-self: start;
      min-width: 0;
    }
    @media (min-width: 820px) {
      .disc-advanced-preview-wrap {
        top: 16px;
      }
    }
    .disc-advanced-settings-intro {
      margin: 0;
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--p-color-bg-surface, #fff);
      border: 1px solid var(--p-color-border, #e3e3e3);
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    }
    .disc-advanced-settings-intro-title {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
      letter-spacing: -0.01em;
    }
    .disc-advanced-settings-intro-text {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--p-color-text-secondary, #616161);
    }
    .disc-advanced-preview {
      background: var(--p-color-bg-surface, #fff);
      border: 1px solid var(--p-color-border, #e3e3e3);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    }
    @media (min-width: 820px) {
      .disc-advanced-preview {
        padding: 18px;
        min-height: 200px;
      }
    }
    .disc-advanced-preview-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    //   padding-bottom: 14px;
    //   border-bottom: 1px solid var(--p-color-border-secondary, #ebebeb);
    }
    .disc-advanced-preview-head-text {
      min-width: 0;
      flex: 1;
    }
    .disc-advanced-preview-help {
      margin: 6px 0 0;
      font-size: 12px;
      line-height: 1.45;
      color: var(--p-color-text-secondary, #616161);
      font-weight: 400;
    }
    .disc-advanced-preview-title {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
      letter-spacing: -0.01em;
    }
    .disc-advanced-preview-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--p-color-text-success, #007f5f);
      background: #e3fcf7;
      border: 1px solid #96f7e4;
      border-radius: 8px;
      padding: 4px 10px;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .disc-live-widget {
      transition: all 0.15s ease;
    }
    .disc-live-widget-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; line-height: 1.3; }
    .disc-live-widget-subtitle { font-size: 12px; margin-bottom: 12px; line-height: 1.4; }
    .disc-live-bar-zone {
      position: relative;
    }
    .disc-live-front-canvas {
      position: relative;
      min-height: 72px;
      overflow: visible;
    }
    .disc-live-progress-rail {
      width: 100%;
    }
    .disc-live-tier-captions-rail {
      position: relative;
    }
    .disc-live-tier-cap {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: none;
      font-size: 11px;
      line-height: 1.35;
    }
    .disc-live-overlay-chip {
      position: absolute;
      z-index: 5;
      min-width: 56px;
      max-width: 120px;
      min-height: 44px;
      padding: 4px 8px;
      border-radius: 10px;
      border: 2px solid rgba(59, 130, 246, 0.55);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      cursor: grab;
      user-select: none;
      touch-action: none;
      overflow: hidden;
      pointer-events: auto;
    }
    .disc-live-overlay-chip:active { cursor: grabbing; }
    .disc-live-overlay-chip-active {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25), 0 6px 18px rgba(15, 23, 42, 0.22);
    }
    .disc-live-overlay-chip-img {
      max-width: 100%;
      max-height: 36px;
      object-fit: contain;
      border-radius: 4px;
    }
    .disc-live-overlay-chip-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.1;
      text-align: center;
    }
    .disc-live-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      z-index: 8;
      box-sizing: border-box;
      clip-path: ${DISC_LIVE_BADGE_SHAPE};
      -webkit-clip-path: ${DISC_LIVE_BADGE_SHAPE};
    }
    .disc-advanced-group--style-editor .disc-bar-style-editor {
    background: white;
      padding: 16px 18px 18px;
    }
    .disc-advanced-group--style-editor .disc-bar-style-editor-head {
      margin-bottom: 8px;
    }
    .disc-advanced-group--style-editor .disc-bar-style-editor-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: normal;
      text-transform: none;
      color: var(--p-color-text, #303030);
    }
    .disc-advanced-group--style-editor .disc-bar-style-editor-help {
      font-size: 13px;
      color: var(--p-color-text-secondary, #616161);
      line-height: 1.5;
      margin: 0 0 14px;
    }
    .disc-advanced-group--style-editor .disc-bar-style-phase-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
      margin-bottom: 10px;
    }
    .disc-advanced-group--style-editor .disc-bar-style-global {
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--p-color-border-secondary, #ebebeb);
      padding: 12px 14px;
    border-radius: 8px;
    background: #fafbfb;
    border: 1px solid var(--p-color-border-secondary, #e3e3e3);
    }
    .disc-advanced-group--style-editor .disc-tier-table-wrap {
      margin-top: 4px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .disc-advanced-group--style-editor .disc-tier-table-wrap + .disc-tier-table-wrap {
      margin-top: 14px;
    }
    .disc-bar-style-editor-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }
    .disc-bar-style-editor-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
    }
    .disc-bar-style-reset { font-size: 11px; padding: 4px 10px; width: auto; height: auto; }
    .disc-bar-style-editor-help {
      font-size: 11px;
      color: #64748b;
      line-height: 1.45;
      margin: 0 0 10px;
    }
    .disc-bar-style-global { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    .disc-bar-style-phase-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    /* Layout and motion - 2-column grid; each row is label | pill input | unit (aligned tracks) */
    .disc-layout-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 8px;
      row-gap: 14px;
      align-items: center;
    }
    .disc-layout-field {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 84px 1.5rem;
      column-gap: 10px;
      align-items: center;
      min-width: 0;
      font-size: 12px;
      font-weight: 600;
      color: #303030;
    }
    .disc-layout-field span:first-child {
      grid-column: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .disc-layout-input {
      grid-column: 2;
      width: 86px;
      max-width: 100%;
      height: 23px;
      margin: 0;
      box-sizing: border-box;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      padding: 0 8px;
      border: 1px solid #c9cccf;
      border-radius: 5px;
      text-align: center;
      background: #fff;
      color: #202223;
    }
    .disc-layout-input:hover {
      border-color: #8c9196;
    }
    .disc-layout-input:focus {
      outline: none;
      border-color: #005bd3;
      box-shadow: 0 0 0 1px #005bd3;
    }
    .disc-layout-unit {
      grid-column: 3;
      font-size: 11px;
      font-weight: 500;
      color: #8c9196;
      min-width: 1.25rem;
      justify-self: start;
    }
    /* Tier comparison table - compact Polaris-style columns */
    .disc-tier-table-wrap {
      margin-top: 10px;
      background: #fafbfb;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 12px 10px;
    }
    .disc-tier-table-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      gap: 8px;
    }
    .disc-tier-table-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .disc-copy-tier1-btn {
      font-size: 11px;
      font-weight: 600;
      background: rgb(0 123 96 / 10%);
    color: rgb(0 123 96);
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 3px 10px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    .disc-copy-tier1-btn:hover {
      background: #047b5d;
      color: #fff;
    }
    .disc-tier-table {
      display: grid;
      grid-template-columns: minmax(76px, max-content) minmax(88px, 112px) minmax(88px, 112px);
      column-gap: 12px;
      row-gap: 0;
      font-size: 11px;
      width: max-content;
      max-width: 100%;
    }
    .disc-tier-table-header {
      display: contents;
    }
    .disc-tier-table-th {
      padding: 6px 0 8px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .disc-tier-table-th:nth-child(2),
    .disc-tier-table-th:nth-child(3) {
      text-align: left;
    }
    .disc-tier-table-th--label { color: #475569; }
    .disc-tier-table-row {
      display: contents;
    }
    .disc-tier-table-td {
      padding: 7px 0;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
    //   min-height: 32px;
    }
    .disc-tier-table-td--label {
      font-weight: 600;
      color: #475569;
      font-size: 14px;
      padding-right: 4px;
    }
    .disc-tier-table-td:not(.disc-tier-table-td--label) {
      justify-content: flex-start;
    }
    .disc-tier-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: auto;
      max-width: 100%;
    }
    .disc-tier-cell--wide { width: 100%; }
    .disc-tier-swatch {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      background: #fff;
      flex-shrink: 0;
    }
    .disc-tier-hex {
      flex: 0 0 auto;
      width: 82px;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      font-size: 11px;
      padding: 4px 6px;
      border: 1px solid #c9cccf;
      border-radius: 6px;
    }
    .disc-tier-num {
      width: 48px;
      flex: 0 0 auto;
      font-size: 11px;
      padding: 4px 4px;
      border: 1px solid #c9cccf;
      border-radius: 6px;
      text-align: center;
    }
    .disc-tier-shadow {
      width: 100%;
      font-size: 11px;
      padding: 3px 5px;
      border: 1px solid #c9cccf;
      border-radius: 5px;
    }
    @media (max-width: 700px) {
      .disc-tier-table {
        grid-template-columns: minmax(64px, 28vw) minmax(80px, 1fr) minmax(80px, 1fr);
        column-gap: 8px;
        width: 100%;
      }
      .disc-tier-hex {
        width: 100%;
        max-width: 90px;
      }
    }
    /* Sticky save bar - keep below global nav; z-index above preview strip */
    .disc-save-bar {
      position: sticky;
      top: 0;
      z-index: 25;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px 16px;
      padding: 12px 16px; 
      background: var(--p-color-bg-surface, #fff);
      border: 1px solid var(--p-color-border, #e3e3e3);
      border-radius: 10px;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05), 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    .disc-save-bar-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .disc-save-bar-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
    }
    .disc-save-bar-hint {
      font-size: 12px;
      color: var(--p-color-text-secondary, #616161);
      line-height: 1.4;
    }
    .disc-save-bar .disc-btn-primary {
      font-size: 13px;
      font-weight: 600;
      min-height: 36px;
      padding: 8px 18px;
      border-radius: 8px;
      box-shadow: 0 1px 0 rgba(0, 91, 211, 0.2);
    }
    .disc-live-divider {
      border: 0;
      border-top: 1px solid rgba(148, 163, 184, 0.35);
      margin: 12px 0;
    }
    .disc-live-hint {
      font-size: 12px;
      line-height: 1.45;
    }
    .disc-live-preview-input { margin-top: 16px; }
    .disc-front-overlay-panel {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid #dfe3e8;
      background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%);
    }
    .disc-front-overlay-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .disc-front-overlay-panel-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #475569;
    }
    .disc-front-overlay-panel-badge {
      font-size: 10px;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      border: 1px solid #7dd3fc;
      border-radius: 999px;
      padding: 2px 8px;
    }
    .disc-front-overlay-panel-help {
      font-size: 11px;
      color: #64748b;
      line-height: 1.45;
      margin: 0 0 12px;
    }
    .disc-front-overlay-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 900px) {
      .disc-front-overlay-grid { grid-template-columns: 1fr; }
    }
    .disc-front-overlay-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .disc-front-overlay-card.is-active {
      border-color: #93c5fd;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
    }
    .disc-front-overlay-select {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 8px;
      cursor: pointer;
      text-align: left;
      width: 100%;
    }
    .disc-front-overlay-select:hover { background: #e2e8f0; }
    .disc-front-overlay-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .disc-front-overlay-row label {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      min-width: 72px;
    }
    .disc-front-overlay-color {
      width: 36px;
      height: 28px;
      padding: 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      background: #fff;
    }
    .disc-front-overlay-scale {
      flex: 1;
      min-width: 120px;
      accent-color: #2563eb;
    }
    .disc-front-overlay-file {
      font-size: 11px;
      max-width: 100%;
    }
    .disc-advanced-intro {
      background: #f1f8ff; border: 1px solid #b6d8ff; border-radius: 10px;
      padding: 12px 14px; font-size: 12px; color: #003f8c;
    }
    .disc-advanced-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-top: 0;
    }
    .disc-advanced-form .disc-grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
      row-gap: 16px;
      column-gap: 0;
      width: 100%;
    }
    .disc-advanced-form .disc-field {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .disc-advanced-form .disc-field label {
      font-size: 13px;
      font-weight: 500;
      color: var(--p-color-text, #303030);
      line-height: 1.4;
    }
    .disc-advanced-form s-text-field {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .disc-advanced-form .disc-field-color-row {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      width: 93%;
      max-width: 100%;
      padding: 12px 14px;
    border-radius: 8px;
    background: #fafbfb;
    border: 1px solid var(--p-color-border-secondary, #e3e3e3);
    }
    .disc-advanced-form .disc-field-color-row .disc-field {
      flex: none;
      width: 100%;
      max-width: 100%;
    }
    .disc-advanced-form .disc-field-color-row .disc-inline-swatch {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid var(--p-color-border, #c9cccf);
      margin: 0;
      flex-shrink: 0;
      align-self: flex-start;
    }
    .disc-advanced-form .disc-color-group-row {
    //   display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      column-gap: 12px;
      row-gap: 10px;
      width: 93%;
      max-width: 100%;
      margin-top: 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fafbfb;
      border: 1px solid var(--p-color-border-secondary, #e3e3e3);
    }
    .disc-advanced-form .disc-color-group-row label {
      grid-column: 1 / -1;
      grid-row: 1;
      font-size: 13px;
      font-weight: 500;
      color: var(--p-color-text, #303030);
      margin: 0;
      line-height: 1.4;
    }
    .disc-advanced-form .disc-color-group-row .disc-inline-swatch {
      grid-column: 1;
      grid-row: 2;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--p-color-border, #c9cccf);
      flex-shrink: 0;
      align-self: center;
    }
    .disc-advanced-form .disc-color-group-row .disc-color-hex {
      grid-column: 2;
      grid-row: 2;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--p-color-border, #c9cccf);
      background: var(--p-color-bg-surface, #fff);
    }
    .disc-advanced-group {
      background: white;
      border: 1px solid var(--p-color-border, #e3e3e3);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    }
    @media (min-width: 600px) {
      .disc-advanced-group {
        padding: 18px 20px 20px;
        gap: 18px;
      }
    }
    .disc-advanced-group.disc-advanced-group--style-editor {
      padding: 0;
      overflow: hidden;
    }
    .disc-widget-settings-panel {
      background: white;
      border: 1px solid var(--p-color-border, #e3e3e3);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    }
    .disc-widget-settings-tabs {
      display: flex;
      border-bottom: 1px solid var(--p-color-border, #e3e3e3);
      background: var(--p-color-bg-surface-secondary, #f7f7f7);
      overflow-x: auto;
    }
    .disc-widget-settings-tab {
      flex: 1 1 0;
      min-width: 0;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 12px 10px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
      color: var(--p-color-text-secondary, #616161);
      cursor: pointer;
      background: transparent;
      text-align: center;
      transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }
    .disc-widget-settings-tab:hover {
      color: var(--p-color-text, #303030);
      background: rgba(255, 255, 255, 0.6);
    }
    .disc-widget-settings-tab--active {
      color: #005bd3;
      background: #fff;
      border-bottom-color: #005bd3;
    }
    .disc-widget-settings-tab-body {
      padding: 0;
      max-height: min(72vh, 720px);
      overflow-y: auto;
    }
    .disc-widget-settings-tab-panel {
      display: none;
      padding: 0;
    }
    .disc-widget-settings-tab-panel--active {
      display: block;
    }
    .disc-widget-settings-tab-panel .disc-advanced-group {
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
    .disc-bar-style-editor-head--compact {
      justify-content: flex-end;
    }
    .disc-advanced-group-head {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    //   padding-bottom: 14px;
    //   margin: 0 0 2px;
    //   border-bottom: 1px solid var(--p-color-border-secondary, #ebebeb);
    }
    .disc-advanced-group-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
      letter-spacing: -0.01em;
    }
    .disc-advanced-group-help {
      font-size: 13px;
      font-weight: 400;
      color: var(--p-color-text-secondary, #616161);
      line-height: 1.5;
    }
    .disc-advanced-check-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    @media (min-width: 520px) {
      .disc-advanced-check-grid {
        grid-template-columns: repeat(2, minmax(0, min(100%, 340px)));
        justify-content: start;
        gap: 8px 12px;
      }
    }
    .disc-advanced-form .disc-toggle {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      font-weight: 500;
      color: var(--p-color-text, #303030);
      min-height: 0;
      margin: 0;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #e3e3e3;
      background: #fff;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .disc-advanced-form .disc-toggle:hover {
      background: #f7f7f7;
      border-color: #d4d4d4;
    }
    .disc-advanced-form .disc-toggle:has(input:focus-visible) {
      outline: 2px solid #005bd3;
      outline-offset: 1px;
    }
    .disc-advanced-form .disc-toggle input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      flex-shrink: 0;
      accent-color: #005bd3;
      cursor: pointer;
    }
    .disc-advanced-form .disc-toggle span {
      line-height: 1.45;
      padding-top: 1px;
    }
    .disc-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 500;
      color: var(--p-color-text, #303030);
      min-height: 32px;
      padding: 4px 0;
    }
    .disc-toggle input[type=checkbox] {
      width: 16px; height: 16px; accent-color: #005bd3;
    }
     
      display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px 16px;
    }
    .disc-color-input-wrap {
      display: flex; gap: 8px; align-items: center;
    }
    .disc-field-color-row {
      display: flex; align-items: flex-end; gap: 8px;
    }
    .disc-field-color-row .disc-field { flex: 1; min-width: 0; }
    .disc-field-color-row .disc-inline-swatch {
      width: 34px; height: 34px; padding: 0; border: 1px solid #c9cccf;
      border-radius: 7px; cursor: pointer; background: #fff; flex-shrink: 0;
      margin-bottom: 2px;
    }
    .disc-color-group-row {
    //   display: flex; 
      align-items: flex-end; gap: 8px; margin-top: 4px;
    }
    .disc-color-group-row label {
      font-size: 11px; font-weight: 600; color: #475569; white-space: nowrap;
    }
    .disc-color-group-row .disc-inline-swatch {
      width: 28px; height: 28px; padding: 0; border: 1px solid #c9cccf;
      border-radius: 6px; cursor: pointer; background: #fff; flex-shrink: 0;
    }
    .disc-color-group-row .disc-color-hex {
      width: 76px; font-size: 11px; padding: 4px 6px;
      border: 1px solid #c9cccf; border-radius: 6px;
    }
    .disc-advanced-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    //   gap: 12px;
    //   padding: 16px 18px;
    //   margin: 4px 0 0;
    //   border-radius: 10px;
    //   border: 1px solid var(--p-color-border, #e3e3e3);
    //   background: var(--p-color-bg-surface, #fff);
    //   box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    }
    .disc-advanced-actions .disc-btn-primary {
      min-height: 36px;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
    }
    .disc-color-input {
      width: 44px; height: 32px; padding: 0; border: none; background: transparent;
    }
    @media (max-width: 900px) {
      .disc-grid-2 { grid-template-columns: 1fr; }
      .disc-tier-metrics { grid-template-columns: 1fr; }
      .disc-modal { padding: 20px; }
      .disc-hero { padding: 18px; }
      .disc-color-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .disc-advanced-summary-sub { display: none; }
    }
    .disc-basic-widget-body {
      padding: 16px;
    }
    @media (min-width: 600px) {
      .disc-basic-widget-body { padding: 20px 24px 24px; }
    }
    .disc-basic-upgrade {
      margin-top: 20px;
      padding: 14px 16px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%);
      border: 1px solid #c7d7fe;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
    }
    .disc-basic-upgrade-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #e0e9ff;
      color: #005bd3;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .disc-basic-upgrade-content {
      flex: 1;
      min-width: min(100%, 220px);
    }
    .disc-basic-upgrade-title {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: var(--p-color-text, #303030);
    }
    .disc-basic-upgrade-text {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--p-color-text-secondary, #616161);
    }
    .disc-basic-upgrade-actions {
      flex-shrink: 0;
    }
    .disc-basic-upgrade-actions .disc-btn {
      white-space: nowrap;
    }
  `;

  return (
    <s-page heading="Discounts">
      <style>{css}</style>

      {!isPremium ? (
        <s-banner tone="info" heading={`${billingPlan?.planName ?? "Free"} plan`}>
          Up to {maxTierDiscounts ?? 2} discounts, tier label customization only.{" "}
          <s-link href={billingUpgradeHref}>Upgrade to Premium</s-link> for unlimited discounts and
          advanced widget settings.
        </s-banner>
      ) : null}

      {actionData?.ok === false && actionData?.error && typeof actionData.error === "string" ? (
        <s-banner tone="critical" heading="Action failed">
          {actionData.error}
          {actionData.planUpgradeRequired ? (
            <>
              {" "}
              <s-link href={billingUpgradeHref}>Upgrade Plan</s-link>
            </>
          ) : null}
        </s-banner>
      ) : null}

      {/* ── Onboarding ────────────────────────────────────────────────────── */}
      {/* {onboarding && (
        <s-section heading="Activate on your theme">
          <div className="disc-onboarding-card">
            {!onboarding.clientIdConfigured && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#991b1b",
                }}
              >
                ⚠️ App client ID is missing. Set <code>SHOPIFY_API_KEY</code> in <code>.env</code>{" "}
                and restart <code>shopify app dev</code>.
              </div>
            )}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px" }}>
                  Toggle the <strong>app embed ON</strong> so the progress bar and cart logging run on your storefront,
                  then optionally add the <strong>cart page block</strong>.
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  Links open with <code>target="_top"</code> so the theme editor leaves the embedded iframe.
                </p>
              </div>
              <a
                href={onboarding.appEmbedEditorUrl}
                target="_top"
                rel="noopener noreferrer"
                className="disc-btn disc-btn-primary"
              >
                🎨 Open theme editor
              </a>
            </div>
          </div>
        </s-section>
      )} */}

      <s-section heading="Tier system status">
        <div className="disc-tier-metrics">
          <div className="disc-tier-metric">
            <div className="disc-tier-metric-label">Tracked usage</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{Number(totalDiscountUsageCount || 0)}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Tracked usage"
                aria-label="Tracked usage"
              >
                <ChartVerticalIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">
              How many times your tier discounts have been used at checkout.
            </div>
          </div>
          <div className="disc-tier-metric">
            <div className="disc-tier-metric-label">Discounts created</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{groupedTierDiscounts.length}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Discounts created"
                aria-label="Discounts created"
              >
                <DiscountIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">
              Total number of discount groups configured in this shop.
            </div>
          </div>
          <div
            className={`disc-tier-metric disc-tier-metric--active${hasMultipleActiveDiscounts ? " disc-tier-metric--warning" : ""}`}
          >
            <div className="disc-tier-metric-label">Active discounts</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{activeDiscountGroups.length}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Active discounts"
                aria-label="Active discounts"
              >
                <StatusActiveIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">
              {hasMultipleActiveDiscounts
                ? `More than one active (${activeDiscountGroups.length}). Keep only one active discount at a time.`
                : primaryActiveDiscount
                  ? `${String(primaryActiveDiscount.discountName || "Discount").trim()} is active.`
                  : "No active discount right now."}
            </div>
          </div>
        </div>
      </s-section>

      {/* ── Hero: Tier Cart Discounts ─────────────────────────────────────── */}
      {/* <s-section heading="Tier cart discounts">
        <div className="disc-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="disc-hero-icon">🏷️</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                Cart threshold rewards
              </div>
              <div style={{ fontSize: 13, color: "#52606d", maxWidth: 440 }}>
                Set up to {MAX_ACTIVE_TIERS} tiers per discount - free shipping, percentage, or fixed
                amount. Customers unlock rewards as their cart value grows.
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            Manage discounts from the table below
          </div>
        </div>
      </s-section> */}

      {/* ── Tier Details Modal (read-only) ────────────────────────────────── */}
      {selectedTierDetails && (
        <div className="disc-modal-overlay">
          <div className="disc-modal" style={{ maxWidth: 560 }}>
            <div className="disc-modal-header">
              <span className="disc-modal-title">📊 Tier details</span>
              <button className="disc-close-btn" onClick={() => setSelectedTierDetails(null)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Discount", selectedTierDetails.discountName],
                ["Tier name", selectedTierDetails.name],
                ["Status", <span style={statusBadgeStyle(selectedTierDetails.effectiveStatus || selectedTierDetails.status)}>{statusDot(selectedTierDetails.effectiveStatus || selectedTierDetails.status)}{selectedTierDetails.effectiveStatus || selectedTierDetails.status}</span>],
                ["Minimum cart", `$${selectedTierDetails.minSubtotal}`],
                ["Reward type", REWARD_LABELS[selectedTierDetails.rewardType] || selectedTierDetails.rewardType],
                ["Reward value",
                  selectedTierDetails.rewardType === "PERCENTAGE"
                    ? `${selectedTierDetails.discountPercent || 0}%`
                    : selectedTierDetails.rewardType === "FIXED_AMOUNT"
                      ? `$${selectedTierDetails.discountPercent || 0}`
                      : "Free shipping"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{v}</div>
                </div>
              ))}
            </div>
            {selectedTierDetails.message && (
              <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Message</div>
                <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>"{selectedTierDetails.message}"</div>
              </div>
            )}
            <div style={{ marginTop: 12 }} className="disc-info-box">
              ℹ️ Timing follows the discount-level schedule configured in the "Schedule & save" section of the setup modal.
            </div>
          </div>
        </div>
      )}

      {showDeleteDiscountModal && (
        <div className="disc-modal-overlay">
          <div className="disc-modal" style={{ maxWidth: 480 }}>
            <div className="disc-modal-header">
              <span className="disc-modal-title">Delete discount?</span>
              <button className="disc-close-btn" onClick={closeDeleteDiscountModal}>✕</button>
            </div>
            <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>
              {`Are you sure you want to delete "${pendingDeleteDiscountName}" and all of its tiers?`}
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="disc-btn disc-btn-tertiary" onClick={closeDeleteDiscountModal}>
                Cancel
              </button>
              <button type="button" className="disc-btn disc-btn-danger" onClick={confirmDeleteDiscount}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoticeModal && (
        <div className="disc-modal-overlay" style={{ zIndex: 2600 }}>
          <div className="disc-modal" style={{ maxWidth: 520 }}>
            <div className="disc-modal-header">
              <span className="disc-modal-title">{noticeTitle || "Notice"}</span>
              <button className="disc-close-btn" onClick={() => setShowNoticeModal(false)}>✕</button>
            </div>
            <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>
              {noticeMessage}
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="disc-btn disc-btn-primary" onClick={() => setShowNoticeModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduleConfirmModal && (
        <div className="disc-modal-overlay" style={{ zIndex: 2500 }}>
          <div className="disc-modal" style={{ maxWidth: 560 }}>
            <div className="disc-modal-header">
              <span className="disc-modal-title">Confirm schedule lock</span>
              <button className="disc-close-btn" onClick={() => setShowScheduleConfirmModal(false)}>✕</button>
            </div>
            <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>
              Schedule can only be set once and cannot be modified later.
              <br />
              <br />
              Do you want to continue?
            </div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="disc-btn disc-btn-tertiary" onClick={() => setShowScheduleConfirmModal(false)}>
                Cancel
              </button>
              <button type="button" className="disc-btn disc-btn-primary" onClick={confirmFinalDiscountSetupSave}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tier Discount Setup Modal ─────────────────────────────────────── */}
      {showTierDiscountModal && (
        <div className="disc-modal-overlay">
          <div className={`disc-modal${tierModalPlanLocked ? " sce-plan-locked-modal" : ""}`}>
            {/* Header */}
            <div className="disc-modal-header">
              <div>
                <div className="disc-modal-title">
                  🏷️ {discountEditOriginalName ? `Edit discount - ${tierModalDiscountKey}` : "New tier discount"}
                </div>
              </div>
              <button
                className="disc-close-btn"
                onClick={() => {
                  setShowTierDiscountModal(false); setTierFormInModalOpen(false);
                  setTierEditId(""); setTierDiscountModalStep(1); setPendingTierDiscountStep(null);
                }}
              >✕</button>
            </div>

            {tierModalPlanLocked ? (
              <div className={PLAN_LOCKED_PANEL_CLASS}>
                {PLAN_LOCKED_ITEM_MESSAGE}{" "}
                <s-link href={billingUpgradeHref}>Upgrade to Premium</s-link> to edit this discount.
              </div>
            ) : null}

            {/* ── Section 1: Discount Details ── */}
            <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#166534", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>1</span>
                Discount details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="disc-field">
                  <label htmlFor="discountEditNameField">Discount name *</label>
                  <input
                    id="discountEditNameField"
                    type="text"
                    value={discountEditName}
                    disabled={tierModalPlanLocked}
                    onChange={(e) => setDiscountEditName(readInputText(e, discountEditName))}
                    placeholder="e.g. Summer Sale, VIP Rewards…"
                    className={(actionData?.errors?.discountName || discountNameIsDuplicate) ? "has-error" : ""}
                    autoComplete="off"
                  />
                  {discountNameIsDuplicate && (
                    <span className="disc-field-error">⚠ This discount name already exists. Please enter a new unique name.</span>
                  )}
                  {!discountNameIsDuplicate && actionData?.errors?.discountName && (
                    <span className="disc-field-error">⚠ {actionData.errors.discountName}</span>
                  )}
                </div>
                {!setupHasDiscountSchedule && (
                  <label className="disc-checkbox-row">
                    <input
                      type="checkbox"
                      checked={discountEditActive}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setDiscountEditActive(next);
                        if (next) {
                          setDiscountEditStartAt("");
                          setDiscountEditEndAt("");
                        }
                      }}
                    />
                    <span>Discount enabled immediately</span>
                  </label>
                )}
                {!modalDiscountHasPersisted ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="button"
                      className="disc-btn disc-btn-primary"
                      disabled={!String(discountEditName || "").trim() || discountNameIsDuplicate}
                      onClick={() => submitDiscountSetup(null)}
                    >
                      Save discount name
                    </button>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Save first to unlock tiers &amp; schedule</span>
                  </div>
                ) : discountNameIsDuplicate ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
                    <span>✕</span> Fix the discount name above to continue
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#166534", fontWeight: 500 }}>
                    <span>✓</span> Discount name saved
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 2: Tiers ── */}
            <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20, marginBottom: 20, opacity: sectionsUnlocked ? 1 : 0.5 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: sectionsUnlocked ? "#166534" : "#9ca3af", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>2</span>
                Tier rules
              </div>
              {!sectionsUnlocked ? (
                <div className="disc-info-box">
                  ℹ️ {discountNameIsDuplicate ? "Fix the duplicate discount name above to continue." : "Save a discount name above to start adding tiers."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="disc-info-box">
                    ℹ️ Add up to {MAX_ACTIVE_TIERS} tiers. Each tier triggers a different reward when the cart reaches its threshold.
                  </div>

                  {selectedDiscountTierRules.length === 0 ? (
                    <div className="disc-empty-state">
                      <div className="disc-empty-icon">📭</div>
                      <div className="disc-empty-title">No tiers yet</div>
                      <div className="disc-empty-desc">Add your first tier to start rewarding customers.</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedDiscountTierRules.map((tier, idx) => (
                        <TierCard
                          key={tier.id}
                          tier={tier}
                          position={idx + 1}
                          canDelete={canDeleteRecords}
                          upgradeHref={billingUpgradeHref}
                          onEdit={() => {
                            setTierEditId(tier.id);
                            setTierName(tier.name || "");
                            setTierMinSubtotal(String(tier.minSubtotal ?? ""));
                            setTierRewardType(tier.rewardType === "FREE_SHIPPING" ? "FREE_SHIPPING" : tier.rewardType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE");
                            setTierDiscountPercent(tier.discountPercent == null ? "" : String(tier.discountPercent));
                            setTierMessage(tier.message || "");
                            setTierFormInModalOpen(true);
                          }}
                          onDelete={() => {
                            const fd = new FormData();
                            fd.set("intent", "tier-delete"); fd.set("id", tier.id);
                            submit(fd, { method: "post" });
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {showAddTierButton && (
                    <button
                      type="button"
                      className="disc-btn disc-btn-secondary"
                      onClick={() => {
                        setTierEditId(""); setTierName(""); setTierMinSubtotal("");
                        setTierRewardType(availableTierRewardTypes[0]?.value || "FREE_SHIPPING");
                        setTierDiscountPercent(""); setTierMessage(""); setTierFormInModalOpen(true);
                      }}
                      style={{ alignSelf: "flex-start" }}
                    >
                      ＋ Add tier
                    </button>
                  )}
                  {maxTierLimitReached && !tierEditId && (
                    <div className="disc-warning-box">
                      ⚠️ Only {MAX_ACTIVE_TIERS} tiers per discount. Remove a tier to add another.
                    </div>
                  )}
                  {actionData?.errors?.tier && (
                    <div className="disc-field-error" style={{ marginTop: 6 }}>
                      ⚠ {actionData.errors.tier}
                    </div>
                  )}

                  {tierFormInModalOpen && (
                    <div className="disc-tier-form-card">
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
                        {tierEditId ? "✏️ Edit tier" : "＋ New tier"}
                      </div>
                      <Form method="post">
                        <input type="hidden" name="intent" value={tierEditId ? "tier-update" : "tier-create"} />
                        {tierEditId && <input type="hidden" name="id" value={tierEditId} />}
                        <input type="hidden" name="tierDiscountName" value={tierModalDiscountKey} />
                        <input type="hidden" name="tierScheduleStartAt" value="" />
                        <input type="hidden" name="tierScheduleEndAt" value="" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div className="disc-grid-2">
                            <div className="disc-field">
                              <label>Tier name *</label>
                              <input
                                name="tierName"
                                value={tierName}
                                onChange={(e) => setTierName(readInputText(e, tierName))}
                                type="text"
                                autoComplete="off"
                                className={actionData?.errors?.tierName ? "has-error" : ""}
                              />
                              {actionData?.errors?.tierName && (
                                <span className="disc-field-error">⚠ {actionData.errors.tierName}</span>
                              )}
                            </div>
                            <div className="disc-field">
                              <label>Minimum cart value *</label>
                              <input
                                name="tierMinSubtotal"
                                value={tierMinSubtotal}
                                onChange={(e) => setTierMinSubtotal(toNumericInputString(e, tierMinSubtotal))}
                                type="number"
                                min="0"
                                step="0.01"
                                autoComplete="off"
                                className={actionData?.errors?.tierMinSubtotal ? "has-error" : ""}
                              />
                              {actionData?.errors?.tierMinSubtotal && (
                                <span className="disc-field-error">⚠ {actionData.errors.tierMinSubtotal}</span>
                              )}
                            </div>
                          </div>
                          <div className="disc-grid-2">
                            <div className="disc-field">
                              <label>Discount type *</label>
                              <s-select
                                name="tierRewardType"
                                value={tierRewardType}
                                onChange={(e) => setTierRewardType(readInputText(e, tierRewardType))}
                                error={actionData?.errors?.tierRewardType}
                              >
                                {availableTierRewardTypes.map((opt) => (
                                  <s-option key={opt.value} value={opt.value}>{opt.label}</s-option>
                                ))}
                              </s-select>
                            </div>
                            {tierRewardType !== "FREE_SHIPPING" ? (
                              <div className="disc-field">
                                <label>{tierRewardType === "FIXED_AMOUNT" ? "Fixed amount *" : "Discount % *"}</label>
                                <input
                                  name="tierDiscountPercent"
                                  value={tierDiscountPercent}
                                  onChange={(e) => setTierDiscountPercent(toNumericInputString(e, tierDiscountPercent))}
                                  type="number"
                                  min={tierRewardType === "FIXED_AMOUNT" ? "0.01" : "1"}
                                  max={tierRewardType === "FIXED_AMOUNT" ? undefined : "100"}
                                  step={tierRewardType === "FIXED_AMOUNT" ? "0.01" : undefined}
                                  autoComplete="off"
                                  className={actionData?.errors?.tierDiscountPercent ? "has-error" : ""}
                                />
                                {actionData?.errors?.tierDiscountPercent && (
                                  <span className="disc-field-error">⚠ {actionData.errors.tierDiscountPercent}</span>
                                )}
                              </div>
                            ) : (
                              <div className="disc-field">
                                <label aria-hidden="true" style={{ visibility: "hidden" }}>
                                  Discount type *
                                </label>
                                <div
                                  style={{
                                    background: "#f0fdf4", border: "1px solid #bbf7d0",
                                    borderRadius: 8, padding: "5px 11px", fontSize: 13, color: "#166534", fontWeight: 500,
                                    width: "100%", boxSizing: "border-box",
                                  }}
                                >
                                  🚚 Free shipping applied at this threshold
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="disc-field">
                            <label>Customer message <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
                            <s-text-field
                              name="tierMessage"
                              value={tierMessage}
                              onChange={(e) => setTierMessage(readInputText(e, tierMessage))}
                              autocomplete="off"
                            />
                          </div>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button
                              type="submit"
                              className="disc-btn disc-btn-primary"
                              disabled={maxTierLimitReached && !tierEditId}
                            >
                              {tierEditId ? "✓ Update tier" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="disc-btn disc-btn-secondary"
                              onClick={() => { setTierFormInModalOpen(false); setTierEditId(""); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </Form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {sectionsUnlocked && !setupHasDiscountSchedule && discountEditActive && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="disc-btn disc-btn-primary"
                    disabled={scheduleRangeInvalid || selectedDiscountTierRules.length === 0 || discountNameIsDuplicate}
                    onClick={handleFinalDiscountSetupSave}
                  >
                    ✓ Save discount
                  </button>
                  {selectedDiscountTierRules.length === 0 && (
                    <span style={{ fontSize: 12, color: "#dc2626" }}>Add at least one tier to save</span>
                  )}
                </div>
              </div>
            )}

            {(setupHasDiscountSchedule || !discountEditActive) && (
            <div style={{ opacity: sectionsUnlocked ? 1 : 0.5 }}>
              {/* ── Section 3: Schedule & Save ── */}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: sectionsUnlocked ? "#166534" : "#9ca3af", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>3</span>
                Schedule &amp; save
              </div>

              {!sectionsUnlocked ? (
                <div className="disc-info-box">
                  ℹ️ {discountNameIsDuplicate ? "Fix the duplicate discount name above to continue." : "Save a discount name above to configure the schedule."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {persistedScheduleLocked ? (
                    <div className="disc-warning-box">
                      🔒 This discount already has a saved schedule. It cannot be changed. You can still edit the name and tiers.
                    </div>
                  ) : (
                    <div className="disc-info-box">
                      📅 Set a start and end date-time for this discount. Leave both empty for "always on".
                      Schedule can only be set once and cannot be changed after saving.
                    </div>
                  )}

                  <div className="disc-grid-2">
                    <div className="disc-field">
                      <label htmlFor="discountScheduleStartAt">Start date &amp; time</label>
                      <input
                        id="discountScheduleStartAt"
                        type="datetime-local"
                        value={discountEditStartAt}
                        disabled={persistedScheduleLocked}
                        onChange={(e) => setDiscountEditStartAt(e.target.value)}
                        style={{ opacity: persistedScheduleLocked ? 0.6 : 1 }}
                      />
                      {actionData?.errors?.discountScheduleStartAt && (
                        <span className="disc-field-error">⚠ {actionData.errors.discountScheduleStartAt}</span>
                      )}
                    </div>
                    <div className="disc-field">
                      <label htmlFor="discountScheduleEndAt">End date &amp; time</label>
                      <input
                        id="discountScheduleEndAt"
                        type="datetime-local"
                        value={discountEditEndAt}
                        min={discountEditStartAt || undefined}
                        disabled={persistedScheduleLocked}
                        onChange={(e) => setDiscountEditEndAt(e.target.value)}
                        style={{ opacity: persistedScheduleLocked ? 0.6 : 1 }}
                      />
                      {(scheduleRangeInvalid || actionData?.errors?.discountScheduleEndAt) && (
                        <span className="disc-field-error">
                          ⚠ {scheduleRangeInvalid ? "End must be after start date & time" : actionData.errors.discountScheduleEndAt}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="disc-summary-card">
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>📋 Review summary</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Discount name</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{tierModalDiscountKey || discountEditName || "-"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Tiers configured</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>
                          <span style={statusBadgeStyle(selectedDiscountTierRules.length > 0 ? "ACTIVE" : "INACTIVE")}>
                            {selectedDiscountTierRules.length} tier{selectedDiscountTierRules.length !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Schedule</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>
                          {discountEditStartAt || discountEditEndAt
                            ? `${discountEditStartAt || "Now"} -${discountEditEndAt || "No end"}`
                            : (discountEditActive ? "Always On" : "-")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="disc-btn disc-btn-primary"
                      disabled={scheduleRangeInvalid || selectedDiscountTierRules.length === 0 || discountNameIsDuplicate}
                      onClick={handleFinalDiscountSetupSave}
                    >
                      ✓ Save discount
                    </button>
                    {selectedDiscountTierRules.length === 0 && (
                      <span style={{ fontSize: 12, color: "#dc2626", alignSelf: "center" }}>Add at least one tier to save</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* ── Overview Table ────────────────────────────────────────────────── */}
      <s-section heading="Discount overview">
        <div id="setup-guide-discount-overview" style={{ scrollMarginTop: 16 }}>
        {groupedTierDiscounts.length === 0 ? (
          <div className="disc-empty-state">   
            <div className="disc-empty-icon">🏷️</div>
            <div className="disc-empty-title">No tier discounts yet</div>
            <div className="disc-empty-desc ">  
              Create your first tier discount to start rewarding customers based on cart value.
            </div>
            <button
              type="button"
              className="disc-btn disc-btn-primary"
              onClick={openCreateTierDiscountModal}
              disabled={tierDiscountLimitReached}
              title={tierDiscountLimitReached ? tierDiscountLimitMessage : undefined}
            >
              ＋ Create first discount
            </button>
          </div>
        ) : (
          <>
            <div className="disc-table-toolbar">
              <div className="disc-table-tools">
                <input
                  type="text"
                  value={overviewQuery}
                  onChange={(e) => setOverviewQuery(readInputText(e, overviewQuery))}
                  placeholder="Search discounts"
                />
                {/* <select value={overviewSort} onChange={(e) => setOverviewSort(e.target.value)}>
                  <option value="updated_desc">Newest first</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="usage_desc">Most used</option>
                </select> */}
                <select
                  value={String(overviewPageSize)}
                  onChange={(e) =>
                    setOverviewPageSize(
                      Math.max(1, Math.floor(readStrictNumber(e, overviewPageSize || 5)) || 5),
                    )
                  }
                >
                  <option value="5">5 / page</option>
                  <option value="10">10 / page</option>
                  {/* <option value="20">20 / page</option> */}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <OverviewCreateButton
                  onClick={openCreateTierDiscountModal}
                  disabled={tierDiscountLimitReached}
                  disabledTitle={tierDiscountLimitMessage}
                >
                  Add tier discount
                </OverviewCreateButton>
                {tierDiscountLimitReached && tierDiscountLimitMessage ? (
                  <span style={{ fontSize: 12, color: "#6b7280", textAlign: "right", maxWidth: 280 }}>
                    {tierDiscountLimitMessage}{" "}
                    <s-link href="/app/billing">View pricing</s-link>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="disc-table-wrapper">
              <table className="disc-table">
                <thead>
                  <tr>
                    <th>Discount</th>
                    <th>Active</th>
                    <th>Status</th>
                    <th>Active tiers</th>
                    {/* <th>Scheduled</th>
                  <th>Expired</th> */}
                    {/* <th>Tracked uses</th> */}
                    <th>Schedule</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOverviewDiscounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "18px 16px", textAlign: "center", color: "#6b7280" }}>
                        No discounts match your search.
                      </td>
                    </tr>
                  ) : paginatedOverviewDiscounts.map((group) => (
                    <DiscountOverviewRow
                      key={group.discountName}
                      group={group}
                      totalDiscountUsageCount={totalDiscountUsageCount}
                      canDelete={canDeleteRecords}
                      upgradeHref={billingUpgradeHref}
                      isPlanLocked={isDiscountPlanLocked(group.discountName)}
                      planLockedMessage={PLAN_LOCKED_ITEM_MESSAGE}
                      suppressStorefrontActive={
                        suppressStorefrontActiveName === group.discountName
                      }
                      onConfigure={() => {
                        if (isDiscountPlanLocked(group.discountName)) return;
                        setDiscountEditName(group.discountName);
                        setDiscountEditOriginalName(group.discountName);
                        setDiscountEditActive(group.discountActive !== false);
                        setDiscountEditStartAt(group.discountScheduleStartAt ? isoToLocalDateTimeInput(group.discountScheduleStartAt) : "");
                        setDiscountEditEndAt(group.discountScheduleEndAt ? isoToLocalDateTimeInput(group.discountScheduleEndAt) : "");
                        setTierEditId(""); setTierFormInModalOpen(false); setTierDiscountModalStep(1);
                        setShowTierDiscountModal(true);
                      }}
                      onDelete={() => {
                        openDeleteDiscountModal(group.discountName);
                      }}
                      onToggleActive={(nextActive) => {
                        submitDiscountActiveToggle(group.discountName, nextActive);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="disc-table-pagination">
              <div className="disc-table-page-meta">
                Showing {(overviewTotalItems === 0 ? 0 : (overviewCurrentPage - 1) * overviewPageSizeSafe + 1)}-
                {Math.min(overviewCurrentPage * overviewPageSizeSafe, overviewTotalItems)} of {overviewTotalItems}
              </div>
              <div className="disc-table-page-actions">
                <button
                  type="button"
                  className="disc-btn disc-btn-tertiary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => setOverviewPage((p) => Math.max(1, p - 1))}
                  disabled={!overviewPaginationNeeded || overviewCurrentPage <= 1}
                >
                  Previous
                </button>
                <span className="disc-table-page-meta">
                  Page {overviewCurrentPage} / {overviewTotalPages}
                </span>
                <button
                  type="button"
                  className="disc-btn disc-btn-tertiary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => setOverviewPage((p) => Math.min(overviewTotalPages, p + 1))}
                  disabled={!overviewPaginationNeeded || overviewCurrentPage >= overviewTotalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </s-section>

      {/* ── Errors ────────────────────────────────────────────────────────── */}
      {(errors?.length || visibleActionErrors) && (
        <s-section heading="Errors">
          <div className="disc-error-card">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
                  Request could not be completed
                </div>
                <pre
                  style={{
                    fontSize: 12, color: "#7f1d1d", background: "#fff5f5",
                    border: "1px solid #fca5a5", borderRadius: 6, padding: 12,
                    overflow: "auto", maxHeight: 200, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(errors || visibleActionErrors, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </s-section>
      )}

      {!isPremium ? (
        <s-section heading="Widget customization">
          <div className="disc-advanced-card">
            <div className="disc-advanced-body disc-basic-widget-body">
              <div className="disc-advanced-settings-intro" style={{ marginBottom: 20 }}>
                <p className="disc-advanced-settings-intro-title">Customize badges</p>
                <p className="disc-advanced-settings-intro-text">
                  Tier names come from your active discount tiers. On the Free plan you can set tier
                  icons, badge backgrounds, and icon colors - save to publish to your storefront.
                  {widgetPreviewTiers.length === 0
                    ? " Create and activate a discount with tiers to preview them here."
                    : ""}
                </p>
              </div>
              <div className="disc-advanced-layout">
                <div className="disc-advanced-settings-wrap">
                  <Form method="post" className="disc-advanced-form">
                    <input type="hidden" name="intent" value="tier-widget-settings-save" />
                    <input type="hidden" name="progressBarDesignJson" value={progressBarDesignJsonSubmit} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      <div className="disc-save-bar">
                        <div className="disc-save-bar-meta">
                          <span className="disc-save-bar-label">Widget settings</span>
                          <span className="disc-save-bar-hint">Save to apply icons and badge styling on your storefront</span>
                        </div>
                        <button type="submit" className="disc-btn disc-btn-primary">
                          Save settings
                        </button>
                      </div>
                      <div className="disc-advanced-group">
                        <div className="disc-advanced-group-head">
                          <div className="disc-advanced-group-title">Tier icons</div>
                          <div className="disc-advanced-group-help">
                            Emoji or short text shown inside each tier badge
                          </div>
                        </div>
                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>{dynamicTierLabels.tier1LabelText || "Tier 1"} icon</label>
                            <s-text-field
                              name="tier1Icon"
                              value={tier1Icon}
                              onChange={(e) => setTier1Icon(readInputText(e, tier1Icon))}
                              error={actionData?.errors?.tier1Icon}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>{dynamicTierLabels.tier2LabelText || "Tier 2"} icon</label>
                            <s-text-field
                              name="tier2Icon"
                              value={tier2Icon}
                              onChange={(e) => setTier2Icon(readInputText(e, tier2Icon))}
                              error={actionData?.errors?.tier2Icon}
                              autocomplete="off"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="disc-advanced-group disc-advanced-group--style-editor">
                        <ProgressBarStyleEditor
                          mode="badgeOnly"
                          barStyle={progressBarDesign.barStyle}
                          onPatchRoot={patchBarStyleRoot}
                          onPatchPhase={patchBarStylePhase}
                          onResetDefaults={resetBadgeBackgroundDefaults}
                          tier1Name={dynamicTierLabels.tier1LabelText || "Tier 1"}
                          tier2Name={dynamicTierLabels.tier2LabelText || "Tier 2"}
                        />
                      </div>
                    </div>
                  </Form>
                </div>
                <div className="disc-advanced-preview-wrap">
                  <div className="disc-advanced-preview">
                    <div className="disc-advanced-preview-head">
                      <div className="disc-advanced-preview-head-text">
                        <span className="disc-advanced-preview-title">Live preview</span>
                        <p className="disc-advanced-preview-help">
                          Updates as you edit icons and badge styling
                        </p>
                      </div>
                    </div>
                    <DiscAdvancedLiveWidget
                      shopCurrencyCode={shopCurrencyCode}
                      showHeading={showHeading}
                      sequentialTitle={sequentialTitle}
                      headingColor={headingColor}
                      showSubheading={showSubheading}
                      subheadingColor={subheadingColor}
                      liveProgress={liveProgress}
                      sequentialMsg0={sequentialMsg0}
                      sequentialMsg1={sequentialMsg1}
                      sequentialMsg2={sequentialMsg2}
                      barFillColor={barFillColor}
                      barTrackColor={barTrackColor}
                      showTierIcons={showTierIcons}
                      tier1Icon={tier1Icon}
                      tier2Icon={tier2Icon}
                      showTierLabels={showTierLabels}
                      showTier1Heading={showTier1Heading}
                      showTier2Heading={showTier2Heading}
                      tier1LabelText={dynamicTierLabels.tier1LabelText}
                      tier2LabelText={dynamicTierLabels.tier2LabelText}
                      tierHeadingColor={tierHeadingColor}
                      showTierMinimums={showTierMinimums}
                      minAmountPrefixText={minAmountPrefixText}
                      liveTier1Min={liveTier1Min}
                      liveTier2Min={liveTier2Min}
                      showHint={showHint}
                      hintColor={hintColor}
                      subtotalLabel={subtotalLabel}
                      livePreviewSubtotal={livePreviewSubtotal}
                      estimatedShippingLabel={estimatedShippingLabel}
                      liveHintText={liveHintText}
                      liveWidgetBg={liveWidgetBg}
                      liveWidgetText={liveWidgetText}
                      liveWidgetBorder={liveWidgetBorder}
                      progressBarDesign={progressBarDesign}
                    />
                    <div className="disc-live-preview-input">
                      <s-text-field
                        label={`Preview cart subtotal (${shopCurrencyCode})`}
                        type="number"
                        min="0"
                        value={previewCartTotal}
                        onChange={(e) =>
                          setPreviewCartTotal(
                            String(Math.max(0, readStrictNumber(e, Number(previewCartTotal) || 0))),
                          )
                        }
                        autocomplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="disc-basic-upgrade">
                <span className="disc-basic-upgrade-icon" aria-hidden="true">
                  ✦
                </span>
                <div className="disc-basic-upgrade-content">
                  <p className="disc-basic-upgrade-title">Advanced widget settings (Premium)</p>
                  <p className="disc-basic-upgrade-text">
                    Messages, bar styling, visibility controls, and full progress bar
                    customization unlock with Premium.
                  </p>
                </div>
                <div className="disc-basic-upgrade-actions">
                  <a href="/app/billing" className="disc-btn disc-btn-primary">
                    {`Upgrade - $${PREMIUM_PLAN_PRICE_USD}/month`}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </s-section>
      ) : null}

      {isPremium ? (
      <s-section>
        <div className="disc-advanced-card">
          <details>
            <summary className="disc-advanced-summary">
              <span className="disc-advanced-summary-icon">⚙</span>
              <span>Advanced widget settings</span>
              <span className="disc-advanced-summary-sub">
                Full widget customization and premium features
              </span>
            </summary>
            <div className="disc-advanced-body">
              <div className="disc-advanced-layout">
                <div className="disc-advanced-settings-wrap">
                  
                  <Form method="post">
                    <input type="hidden" name="intent" value="tier-widget-settings-save" />
                    <input type="hidden" name="selectorTargets" value={selectorTargets} />
                    <input type="hidden" name="nameTargetSelectors" value={nameTargetSelectors} />
                    <input type="hidden" name="progressBarDesignJson" value={progressBarDesignJsonSubmit} />
                    <div className="disc-advanced-form">
                      <div className="disc-save-bar">
                        <div className="disc-save-bar-meta">
                          <span className="disc-save-bar-label">Widget settings</span>
                          <span className="disc-save-bar-hint">Save to apply changes to your storefront</span>
                        </div>
                        <button type="submit" className="disc-btn disc-btn-primary">
                          Save settings
                        </button>
                      </div>
                      <div className="disc-widget-settings-panel">
                        <div className="disc-widget-settings-tabs" role="tablist" aria-label="Widget customization">
                          {WIDGET_SETTINGS_TABS.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={widgetSettingsTab === tab.id}
                              className={`disc-widget-settings-tab${widgetSettingsTab === tab.id ? " disc-widget-settings-tab--active" : ""}`}
                              onClick={() => setWidgetSettingsTab(tab.id)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        <div className="disc-widget-settings-tab-body">
                          <div
                            className={`disc-widget-settings-tab-panel${widgetSettingsTab === "progress" ? " disc-widget-settings-tab-panel--active" : ""}`}
                            role="tabpanel"
                            hidden={widgetSettingsTab !== "progress"}
                          >
                            <div className="disc-advanced-group disc-advanced-group--style-editor">
                              <ProgressBarStyleEditor
                                barStyle={progressBarDesign.barStyle}
                                onPatchRoot={patchBarStyleRoot}
                                onPatchPhase={patchBarStylePhase}
                                onResetDefaults={resetBarStyleDefaults}
                                tier1Name={dynamicTierLabels.tier1LabelText || "Tier 1"}
                                tier2Name={dynamicTierLabels.tier2LabelText || "Tier 2"}
                                showTitle={false}
                              />
                            </div>
                          </div>
                          <div
                            className={`disc-widget-settings-tab-panel${widgetSettingsTab === "messages" ? " disc-widget-settings-tab-panel--active" : ""}`}
                            role="tabpanel"
                            hidden={widgetSettingsTab !== "messages"}
                          >
                      <div className="disc-advanced-group">
                        <div className="disc-advanced-group-head">
                          <div className="disc-advanced-group-help">
                            Customer-facing copy, typography, and text colors
                          </div>
                        </div>

                        {/* Sequential widget title + heading color */}
                        <div className="disc-field-color-row">
                          <div className="disc-field" >
                            <label>Sequential widget title</label>
                            <div style={{ display: "flex", gap: 10, marginTop: "8px "}}> 
                            <input
                            type="color"
                            className="disc-inline-swatch"
                            title="Title text color"
                            value={/^#[0-9a-fA-F]{6}$/.test(headingColor) ? headingColor : "#0f172a"}
                            onChange={(e) => setHeadingColor(e.currentTarget.value)}
                          />
                            <s-text-field
                              name="sequentialTitle"
                              value={sequentialTitle}
                              onChange={(e) => setSequentialTitle(readInputText(e, sequentialTitle))}
                              error={actionData?.errors?.sequentialTitle}
                              autocomplete="off"
                            />
                            </div>
                          </div>
                          
                        </div>

                        {/* Status messages + subheading color (shared) */}
                       
                        <div className="disc-color-group-row">
                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>Default status message (before Tier 1)</label>
                            <s-text-field
                              name="sequentialMsg0"
                              value={sequentialMsg0}
                              onChange={(e) => setSequentialMsg0(readInputText(e, sequentialMsg0))}
                              error={actionData?.errors?.sequentialMsg0}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>Message before Tier 1 unlocked</label>
                            <s-text-field
                              name="sequentialMsg1"
                              value={sequentialMsg1}
                              onChange={(e) => setSequentialMsg1(readInputText(e, sequentialMsg1))}
                              error={actionData?.errors?.sequentialMsg1}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>Message after Tier 2 unlocked</label>
                            <s-text-field
                              name="sequentialMsg2"
                              value={sequentialMsg2}
                              onChange={(e) => setSequentialMsg2(readInputText(e, sequentialMsg2))}
                              error={actionData?.errors?.sequentialMsg2}
                              autocomplete="off"
                            />
                          </div> 
                          <div className="disc-fied" >
                         
                            <label>Message text color</label>

                             
<div style={{ display: "flex", gap: 10, marginTop: "8px "}}> 
                          <input
                            type="color"
                            className="disc-inline-swatch"
                            value={/^#[0-9a-fA-F]{6}$/.test(subheadingColor) ? subheadingColor : "#334155"}
                            onChange={(e) => setSubheadingColor(e.currentTarget.value)}
                          />
                          <input
                            type="text"
                            className="disc-color-hex"
                            value={subheadingColor || ""}
                            onChange={(e) => setSubheadingColor(e.currentTarget.value.trim())}
                          />
                          </div>
                          </div>
                          </div>
                        </div>

                        <div className="disc-color-group-row">

                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>Progress hint before Tier 1</label>
                            <s-text-field
                              name="sequentialHintZero"
                              value={sequentialHintZero}
                              onChange={(e) => setSequentialHintZero(readInputText(e, sequentialHintZero))}
                              error={actionData?.errors?.sequentialHintZero}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>Progress hint after Tier 1</label>
                            <s-text-field
                              name="sequentialHintMid"
                              value={sequentialHintMid}
                              onChange={(e) => setSequentialHintMid(readInputText(e, sequentialHintMid))}
                              error={actionData?.errors?.sequentialHintMid}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field"> 
                          <label>Hint text color</label>
                          <div style={{ display: "flex", gap: 10}}> 
                          <input
                            type="color"
                            className="disc-inline-swatch"
                            value={/^#[0-9a-fA-F]{6}$/.test(hintColor) ? hintColor : "#64748b"}
                            onChange={(e) => setHintColor(e.currentTarget.value)}
                          />
                          <input
                            type="text"
                            className="disc-color-hex"
                            value={hintColor || ""}
                            onChange={(e) => setHintColor(e.currentTarget.value.trim())}
                          />
                          </div>
                          </div>
                        </div>

                        </div>

                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>Tier 1 icon</label>
                            <s-text-field
                              name="tier1Icon"
                              value={tier1Icon}
                              onChange={(e) => setTier1Icon(readInputText(e, tier1Icon))}
                              error={actionData?.errors?.tier1Icon}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>Tier 2 icon</label>
                            <s-text-field
                              name="tier2Icon"
                              value={tier2Icon}
                              onChange={(e) => setTier2Icon(readInputText(e, tier2Icon))}
                              error={actionData?.errors?.tier2Icon}
                              autocomplete="off"
                            />
                          </div>
                        </div>
                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>Subtotal label</label>
                            <s-text-field
                              name="subtotalLabel"
                              value={subtotalLabel}
                              onChange={(e) => setSubtotalLabel(readInputText(e, subtotalLabel))}
                              error={actionData?.errors?.subtotalLabel}
                              autocomplete="off"
                            />
                          </div>
                          <div className="disc-field">
                            <label>Estimated shipping label</label>
                            <s-text-field
                              name="estimatedShippingLabel"
                              value={estimatedShippingLabel}
                              onChange={(e) => setEstimatedShippingLabel(readInputText(e, estimatedShippingLabel))}
                              error={actionData?.errors?.estimatedShippingLabel}
                              autocomplete="off"
                            />
                          </div>
                        </div>
                        <p className="disc-advanced-group-help" style={{ marginTop: 8 }}>
                          Tier names under each badge are taken from your active discount tier configuration.
                        </p>
                        <div className="disc-grid-2">
                          <div className="disc-field">
                            <label>Minimum amount prefix text</label>
                            <s-text-field
                              name="minAmountPrefixText"
                              value={minAmountPrefixText}
                              onChange={(e) => setMinAmountPrefixText(readInputText(e, minAmountPrefixText))}
                              error={actionData?.errors?.minAmountPrefixText}
                              autocomplete="off"
                            />
                          </div>
                        </div>

                        {/* Widget background color - always visible */}
                        <div className="disc-advanced-subsection">
                          <div className="disc-color-group-row">
                            <label>Widget background</label>
                            <div style={{ display: "flex", gap: 10, marginTop: "8px "}}> 
                            <input
                              type="color"
                              className="disc-inline-swatch"
                              value={/^#[0-9a-fA-F]{6}$/.test(widgetBackgroundColor) ? widgetBackgroundColor : "#ffffff"}
                              onChange={(e) => { setWidgetBackgroundColor(e.currentTarget.value); setWidgetUseCustomColors(true); }}
                            />
                            <input
                              type="text"
                              className="disc-color-hex"
                              value={widgetBackgroundColor || ""}
                              onChange={(e) => { setWidgetBackgroundColor(e.currentTarget.value.trim()); setWidgetUseCustomColors(true); }}
                            />
                            </div>
                          </div>
                        </div>
                      </div>
                          </div>
                          <div
                            className={`disc-widget-settings-tab-panel${widgetSettingsTab === "visibility" ? " disc-widget-settings-tab-panel--active" : ""}`}
                            role="tabpanel"
                            hidden={widgetSettingsTab !== "visibility"}
                          >
                      <div className="disc-advanced-group">
                        <div className="disc-advanced-group-head">
                          <div className="disc-advanced-group-help">Toggle what customers see in the widget</div>
                        </div>
                        <div className="disc-advanced-check-grid">
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTierIcons"
                              checked={showTierIcons}
                              onChange={(e) => setShowTierIcons(e.currentTarget.checked)}
                            />
                            <span>Show tier icons</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTierLabels"
                              checked={showTierLabels}
                              onChange={(e) => setShowTierLabels(e.currentTarget.checked)}
                            />
                            <span>Show tier labels</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTierMinimums"
                              checked={showTierMinimums}
                              onChange={(e) => setShowTierMinimums(e.currentTarget.checked)}
                            />
                            <span>Show minimum amount line</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showHeading"
                              checked={showHeading}
                              onChange={(e) => setShowHeading(e.currentTarget.checked)}
                            />
                            <span>Show main heading</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showSubheading"
                              checked={showSubheading}
                              onChange={(e) => setShowSubheading(e.currentTarget.checked)}
                            />
                            <span>Show subheading</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showHint"
                              checked={showHint}
                              onChange={(e) => setShowHint(e.currentTarget.checked)}
                            />
                            <span>Show hint line</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTier1Heading"
                              checked={showTier1Heading}
                              onChange={(e) => setShowTier1Heading(e.currentTarget.checked)}
                            />
                            <span>Show Tier 1 heading</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTier1Subheading"
                              checked={showTier1Subheading}
                              onChange={(e) => setShowTier1Subheading(e.currentTarget.checked)}
                            />
                            <span>Show Tier 1 subheading</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTier2Heading"
                              checked={showTier2Heading}
                              onChange={(e) => setShowTier2Heading(e.currentTarget.checked)}
                            />
                            <span>Show Tier 2 heading</span>
                          </label>
                          <label className="disc-toggle">
                            <input
                              type="checkbox"
                              name="showTier2Subheading"
                              checked={showTier2Subheading}
                              onChange={(e) => setShowTier2Subheading(e.currentTarget.checked)}
                            />
                            <span>Show Tier 2 subheading</span>
                          </label>
                        </div>
                      </div>
                          </div>
                        </div>
                      </div>
                      {/* Hidden fields to submit all color values */}
                      <input type="hidden" name="iconBackgroundColor" value={iconBackgroundColor} />
                      <input type="hidden" name="iconTextColor" value={iconTextColor} />
                      <input type="hidden" name="headingColor" value={headingColor} />
                      <input type="hidden" name="subheadingColor" value={subheadingColor} />
                      <input type="hidden" name="tierHeadingColor" value={tierHeadingColor} />
                      <input type="hidden" name="tierSubheadingColor" value={tierSubheadingColor} />
                      <input type="hidden" name="hintColor" value={hintColor} />
                      <input type="hidden" name="widgetBackgroundColor" value={widgetBackgroundColor} />
                      <input type="hidden" name="widgetUseCustomColors" value={widgetUseCustomColors ? "on" : ""} />
                      <input type="hidden" name="widgetTextColor" value={widgetTextColor} />
                      <input type="hidden" name="widgetBorderColor" value={widgetBorderColor} />
                      <div className="disc-advanced-actions">
                        <button type="submit" className="disc-btn disc-btn-primary">
                          Save settings
                        </button>
                      </div>
                    </div>
                  </Form>
                </div>
                <div className="disc-advanced-preview-wrap">
                  <div className="disc-advanced-preview">
                    <div className="disc-advanced-preview-head">
                      <div className="disc-advanced-preview-head-text">
                        <span className="disc-advanced-preview-title">Live preview</span>
                         
                      </div>
                      {/* <span className="disc-advanced-preview-badge">Updates live</span> */}
                    </div>
                    <DiscAdvancedLiveWidget
                      shopCurrencyCode={shopCurrencyCode}
                      showHeading={showHeading}
                      sequentialTitle={sequentialTitle}
                      headingColor={headingColor}
                      showSubheading={showSubheading}
                      subheadingColor={subheadingColor}
                      liveProgress={liveProgress}
                      sequentialMsg0={sequentialMsg0}
                      sequentialMsg1={sequentialMsg1}
                      sequentialMsg2={sequentialMsg2}
                      barFillColor={barFillColor}
                      barTrackColor={barTrackColor}
                      showTierIcons={showTierIcons}
                      tier1Icon={tier1Icon}
                      tier2Icon={tier2Icon}
                      showTierLabels={showTierLabels}
                      showTier1Heading={showTier1Heading}
                      showTier2Heading={showTier2Heading}
                      tier1LabelText={dynamicTierLabels.tier1LabelText}
                      tier2LabelText={dynamicTierLabels.tier2LabelText}
                      tierHeadingColor={tierHeadingColor}
                      showTierMinimums={showTierMinimums}
                      minAmountPrefixText={minAmountPrefixText}
                      liveTier1Min={liveTier1Min}
                      liveTier2Min={liveTier2Min}
                      showHint={showHint}
                      hintColor={hintColor}
                      subtotalLabel={subtotalLabel}
                      livePreviewSubtotal={livePreviewSubtotal}
                      estimatedShippingLabel={estimatedShippingLabel}
                      liveHintText={liveHintText}
                      liveWidgetBg={liveWidgetBg}
                      liveWidgetText={liveWidgetText}
                      liveWidgetBorder={liveWidgetBorder}
                      progressBarDesign={progressBarDesign}
                      onProgressBarDesignPatch={patchProgressBarDesign}
                      interactivePreview
                      overlayEditKey={overlayEditKey}
                      onOverlayEditKeyChange={setOverlayEditKey}
                    />
                    <div className="disc-live-preview-input">
                      <s-text-field
                        label={`Preview cart subtotal (${shopCurrencyCode})`}
                        type="number"
                        min="0"
                        value={previewCartTotal}
                        onChange={(e) =>
                          setPreviewCartTotal(
                            String(Math.max(0, readStrictNumber(e, Number(previewCartTotal) || 0))),
                          )
                        }
                        autocomplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </s-section>
      ) : null}
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);





