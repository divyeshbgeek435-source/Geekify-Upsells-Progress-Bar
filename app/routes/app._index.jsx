import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useLoaderData,
  useLocation,
  useNavigate,
  useOutletContext,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  ChartVerticalIcon,
  CheckCircleIcon,
  ClockIcon,
  DiscountIcon,
  LayoutSectionIcon,
  MegaphoneIcon,
  StatusActiveIcon,
  ViewIcon,
} from "@shopify/polaris-icons";

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

const LIST_DISCOUNTS_FOR_USAGE = `#graphql
  query TierStatusDiscountNodes($first: Int!) {
    discountNodes(first: $first, reverse: true) {
      nodes {
        id
        discount {
          __typename
          ... on DiscountAutomaticApp {
            title
            asyncUsageCount
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

const AUTO_TIER_DISCOUNT_TITLE = "Do not remove this discount";
const AUTO_TIER_DISCOUNT_LEGACY_TITLES = new Set([
  "Do not remove this discount title",
]);

function parseTierDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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
    (message.includes(`no such table`) && message.includes(t)) ||
    (message.includes(`relation`) &&
      message.includes(t) &&
      message.includes(`does not exist`))
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
    map.set(name, {
      hasExplicitDiscount: true,
      discountName: name,
      discountActive: discount.active !== false,
      discountScheduleStartAt: parseTierDate(discount.scheduleStartAt),
      discountScheduleEndAt: parseTierDate(discount.scheduleEndAt),
      discountStatus: resolveDiscountStatus(discount),
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
        tiers: [],
      });
    }
    map.get(key).tiers.push(tier);
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
      tiers: tierList.sort((a, b) => a.minSubtotal - b.minSubtotal),
      activeCount,
      scheduledCount,
      expiredCount,
      usageSum,
      startsAt,
      endsAt,
    };
  });
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(LIST_DISCOUNTS_FOR_USAGE, {
    variables: { first: 50 },
  });
  const json = await response.json();
  const appDiscountTypes = json?.data?.appDiscountTypes || [];
  const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
  const allNodes = json?.data?.discountNodes?.nodes || [];

  const nodes = allNodes.filter((n) => {
    const d = n?.discount;
    if (!d) return false;
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

  const inactiveDiscountNames = new Set(
    tierDiscounts
      .filter((row) => {
        const st = resolveDiscountStatus(row);
        return st === "EXPIRED" || st === "INACTIVE";
      })
      .map((row) => String(row.name || "").trim()),
  );
  if (inactiveDiscountNames.size) {
    try {
      await prisma.thresholdTier.updateMany({
        where: {
          shop: session.shop,
          discountName: { in: Array.from(inactiveDiscountNames) },
          active: true,
        },
        data: { active: false },
      });
    } catch (error) {
      if (!isUnknownPrismaArgument(error, "discountName")) throw error;
    }
  }

  let popupDesignCount = 0;
  try {
    if (typeof prisma.popupDesign?.count === "function") {
      popupDesignCount = await prisma.popupDesign.count({ where: { shop: session.shop } });
    }
  } catch (error) {
    if (!isMissingTableError(error, "popup_design")) throw error;
    popupDesignCount = 0;
  }
  const setupHasPopupDesign = popupDesignCount > 0;

  let announcementHeaderCount = 0;
  try {
    if (typeof prisma.announcementHeader?.count === "function") {
      announcementHeaderCount = await prisma.announcementHeader.count({ where: { shop: session.shop } });
    }
  } catch (error) {
    if (!isMissingTableError(error, "announcement_headers")) throw error;
    announcementHeaderCount = 0;
  }
  const setupHasAnnouncementBar = announcementHeaderCount > 0;

  let announcementBodyCount = 0;
  try {
    if (typeof prisma.announcementBody?.count === "function") {
      announcementBodyCount = await prisma.announcementBody.count({ where: { shop: session.shop } });
    }
  } catch (error) {
    if (!isMissingTableError(error, "announcement_body")) throw error;
    announcementBodyCount = 0;
  }

  const setupHasTierDiscount = tierDiscounts.length > 0;

  return {
    tierRules,
    tierDiscounts,
    totalDiscountUsageCount,
    errors: json?.errors || null,
    setupDetection: {
      hasTierDiscount: setupHasTierDiscount,
      hasPopupDesign: setupHasPopupDesign,
      hasAnnouncementBar: setupHasAnnouncementBar,
    },
    contentCounts: {
      popupDesigns: popupDesignCount,
      announcementHeaders: announcementHeaderCount,
      announcementBodies: announcementBodyCount,
    },
  };
};

const tierStatusCss = `
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
  @media (max-width: 900px) {
    .disc-tier-metrics { grid-template-columns: 1fr; }
  }
`;

const SETUP_GUIDE_STATE_KEY = "geekify-setup-guide-state-v2";
const SETUP_GUIDE_LEGACY_STEPS_KEY = "geekify-setup-guide-steps-v1";
const SETUP_GUIDE_DISMISSED_KEY = "geekify-setup-guide-dismissed-v1";

function defaultSetupLocal() {
  return {
    step1InProgress: false,
    step1Confirmed: false,
    step2Opened: false,
    step3Opened: false,
    step4Opened: false,
  };
}

function readSetupGuideLocal() {
  const base = defaultSetupLocal();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(SETUP_GUIDE_STATE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return { ...base, ...o };
    }
    const legacy = window.localStorage.getItem(SETUP_GUIDE_LEGACY_STEPS_KEY);
    if (legacy) {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr) && arr.length === 4) {
        return {
          ...base,
          step1Confirmed: Boolean(arr[0]),
          step2Opened: Boolean(arr[1]),
          step3Opened: Boolean(arr[2]),
          step4Opened: Boolean(arr[3]),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return base;
}

function writeSetupGuideLocal(patch) {
  try {
    if (typeof window === "undefined") return;
    const prev = readSetupGuideLocal();
    window.localStorage.setItem(SETUP_GUIDE_STATE_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* ignore */
  }
}

function readStoredDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SETUP_GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

const setupGuideCss = `
  .setup-guide-wrap { margin-bottom: 20px; }
  .setup-guide-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    overflow: hidden;
  }
  .setup-guide-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid #f3f4f6;
  }
  .setup-guide-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
  }
  .setup-guide-sub {
    margin: 6px 0 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: #6b7280;
  }
  .setup-guide-top-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .setup-guide-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
  }
  .setup-guide-icon-btn:hover { background: #f3f4f6; color: #111827; }
  .setup-guide-progress-row {
    padding: 0 18px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
  }
  .setup-guide-progress-bar {
    height: 6px;
    border-radius: 999px;
    background: #e5e7eb;
    margin-top: 8px;
    overflow: hidden;
  }
  .setup-guide-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: rgb(0 123 96);
    transition: width 0.25s ease;
  }
  .setup-guide-steps { padding: 0 12px 12px; }
  .setup-guide-step {
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid transparent;
  }
  .setup-guide-step--open {
    background: #f9fafb;
    border-color: #e5e7eb;
  }
  .setup-guide-step-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    text-align: left;
    padding: 12px 10px;
    border: none;
    background: transparent;
    font: inherit;
    cursor: pointer;
    border-radius: 10px;
  }
  .setup-guide-step-head:hover {
    background: #fafafa;
  }
  .setup-guide-step--open > .setup-guide-step-head:hover {
    background: transparent;
  }
  .setup-guide-step-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: #9ca3af;
  }
  .setup-guide-step-icon--done { color: rgb(0 123 96); }
  .setup-guide-step-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  .setup-guide-step-body {
    padding: 0 14px 14px 44px;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: #4b5563;
  }
  .setup-guide-step-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }
  .setup-guide-a-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    background: #111827;
    color: #fff !important;
    text-decoration: none !important;
    border: none;
    cursor: pointer;
  }
  .setup-guide-a-primary:hover { background: #000; }
  button.setup-guide-a-primary { font: inherit; border: none; }
  .setup-guide-a-primary[disabled] {
    opacity: 0.45;
    pointer-events: none;
    cursor: not-allowed;
  }
  .setup-guide-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    background: #fff;
    color: #111827;
    border: 1px solid #d1d5db;
    cursor: pointer;
    font: inherit;
  }
  .setup-guide-btn-secondary:hover { background: #f9fafb; }
  .setup-guide-restore {
    margin: 0 0 16px;
    padding: 0;
    border: none;
    background: none;
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgb(0 123 96);
    cursor: pointer;
    text-decoration: underline;
  }
  .setup-guide-restore:hover { color: #005c46; }
  .setup-guide-step-head-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .setup-guide-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .setup-guide-badge--todo {
    background: #f3f4f6;
    color: #6b7280;
  }
  .setup-guide-badge--progress {
    background: #eff6ff;
    color: #1d4ed8;
  }
  .setup-guide-badge--done {
    background: rgb(0 123 96 / 12%);
    color: rgb(0 100 78);
  }
  .setup-guide-hint {
    margin-top: 10px;
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
  }
  .setup-guide-success-wrap { margin-bottom: 20px; }
`;

/* eslint-disable react/prop-types -- onboarding / detection from app layout + index loader */
function mergeStepStates(local, detection) {
  const s0 = local.step1Confirmed
    ? "completed"
    : local.step1InProgress
      ? "in_progress"
      : "not_started";
  const s1 = detection.hasTierDiscount
    ? "completed"
    : local.step2Opened
      ? "in_progress"
      : "not_started";
  const s2 = detection.hasPopupDesign
    ? "completed"
    : local.step3Opened
      ? "in_progress"
      : "not_started";
  const s3 = detection.hasAnnouncementBar
    ? "completed"
    : local.step4Opened
      ? "in_progress"
      : "not_started";
  return [s0, s1, s2, s3];
}

function StepStateBadge({ state }) {
  if (state === "completed") {
    return (
      <span className="setup-guide-badge setup-guide-badge--done">
        <CheckCircleIcon width={14} height={14} aria-hidden />
        Completed
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="setup-guide-badge setup-guide-badge--progress">
        <ClockIcon width={14} height={14} aria-hidden />
        In progress
      </span>
    );
  }
  return <span className="setup-guide-badge setup-guide-badge--todo">Not started</span>;
}

function stepHeadIcon(state) {
  if (state === "completed") {
    return (
      <span className="setup-guide-step-icon setup-guide-step-icon--done">
        <CheckCircleIcon width={22} height={22} aria-hidden />
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="setup-guide-step-icon" style={{ color: "#2563eb" }}>
        <ClockIcon width={22} height={22} aria-hidden />
      </span>
    );
  }
  return (
    <span className="setup-guide-step-icon">
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "2px solid #d1d5db",
          boxSizing: "border-box",
        }}
      />
    </span>
  );
}

function SetupGuideSection({ onboarding, setupDetection, withShopifyParams }) {
  const navigate = useNavigate();
  const [local, setLocal] = useState(() => defaultSetupLocal());
  const [openIndex, setOpenIndex] = useState(0);
  const [bodyCollapsed, setBodyCollapsed] = useState(false);
  const [dismissedEarly, setDismissedEarly] = useState(false);
  const [successBannerDismissed, setSuccessBannerDismissed] = useState(false);

  useEffect(() => {
    const loc = readSetupGuideLocal();
    setLocal(loc);
    setDismissedEarly(readStoredDismissed());
    const st = mergeStepStates(loc, setupDetection);
    const firstIncomplete = st.findIndex((s) => s !== "completed");
    setOpenIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
    // Intentionally once on mount; loader updates merge via setupDetection in useMemo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchLocal = useCallback((patch) => {
    writeSetupGuideLocal(patch);
    setLocal((prev) => ({ ...prev, ...patch }));
  }, []);

  const states = useMemo(() => mergeStepStates(local, setupDetection), [local, setupDetection]);
  const allComplete = states.every((s) => s === "completed");
  const completedCount = useMemo(() => states.filter((s) => s === "completed").length, [states]);
  const totalSteps = 4;
  const progressPct = (completedCount / totalSteps) * 100;

  const prevStatesRef = useRef(states);

  useEffect(() => {
    const prev = prevStatesRef.current;
    prevStatesRef.current = states;
    for (let i = 0; i < states.length; i += 1) {
      if (prev[i] !== "completed" && states[i] === "completed") {
        try {
          window.localStorage.removeItem(SETUP_GUIDE_LEGACY_STEPS_KEY);
        } catch {
          /* ignore */
        }
        const nextOpen = states.findIndex((s) => s !== "completed");
        queueMicrotask(() => setOpenIndex(nextOpen === -1 ? 0 : nextOpen));
        break;
      }
    }
  }, [states]);

  useEffect(() => {
    if (!allComplete) {
      setSuccessBannerDismissed(false);
      return undefined;
    }
    const id = window.setTimeout(() => setSuccessBannerDismissed(true), 5000);
    return () => window.clearTimeout(id);
  }, [allComplete]);

  const dismissEarly = useCallback(() => {
    setDismissedEarly(true);
    try {
      window.localStorage.setItem(SETUP_GUIDE_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const restoreGuide = useCallback(() => {
    setDismissedEarly(false);
    try {
      window.localStorage.removeItem(SETUP_GUIDE_DISMISSED_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const confirmEmbedSaved = useCallback(() => {
    patchLocal({ step1Confirmed: true, step1InProgress: true });
  }, [patchLocal]);

  const goDiscounts = useCallback(() => {
    patchLocal({ step2Opened: true });
    navigate(withShopifyParams("/app/discounts?fromSetup=1"));
  }, [navigate, patchLocal, withShopifyParams]);

  const goPopup = useCallback(() => {
    patchLocal({ step3Opened: true });
    navigate(withShopifyParams("/app/popup-design"));
  }, [navigate, patchLocal, withShopifyParams]);

  const goAnnouncements = useCallback(() => {
    patchLocal({ step4Opened: true });
    navigate(withShopifyParams("/app/announcements"));
  }, [navigate, patchLocal, withShopifyParams]);

  const themeEditorUrl = onboarding?.clientIdConfigured ? onboarding.appEmbedEditorUrl : null;

  if (allComplete) {
    if (successBannerDismissed) return null;
    return (
      <div className="setup-guide-success-wrap">
        <s-banner tone="success" heading="Setup completed successfully 🎉">
          You are all set. Manage discounts, popups, and announcements any time from the app navigation.
        </s-banner>
      </div>
    );
  }

  if (dismissedEarly) {
    return (
      <div className="setup-guide-wrap">
        <button type="button" className="setup-guide-restore" onClick={restoreGuide}>
          Show setup guide
        </button>
      </div>
    );
  }

  return (
    <div className="setup-guide-wrap">
      <div className="setup-guide-card">
        <div className="setup-guide-top">
          <div>
            <h2 className="setup-guide-title">Setup Guide</h2>
            <p className="setup-guide-sub">Follow these steps to complete the app setup.</p>
          </div>
          <div className="setup-guide-top-actions">
            <button
              type="button"
              className="setup-guide-icon-btn"
              aria-label={bodyCollapsed ? "Expand setup guide" : "Collapse setup guide"}
              onClick={() => setBodyCollapsed((c) => !c)}
            >
              <span aria-hidden style={{ fontSize: "14px" }}>
                {bodyCollapsed ? "▼" : "▲"}
              </span>
            </button>
            <button type="button" className="setup-guide-icon-btn" aria-label="Dismiss setup guide" onClick={dismissEarly}>
              <span aria-hidden style={{ fontSize: "18px", lineHeight: 1 }}>
                ×
              </span>
            </button>
          </div>
        </div>

        {!bodyCollapsed ? (
          <>
            <div className="setup-guide-progress-row">
              {completedCount} / {totalSteps} steps completed
              <div className="setup-guide-progress-bar">
                <div className="setup-guide-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="setup-guide-steps">
              <div className={`setup-guide-step${openIndex === 0 ? " setup-guide-step--open" : ""}`}>
                <button
                  type="button"
                  className="setup-guide-step-head"
                  onClick={() => setOpenIndex(0)}
                  aria-expanded={openIndex === 0}
                >
                  {stepHeadIcon(states[0])}
                  <div className="setup-guide-step-head-main">
                    <p className="setup-guide-step-title">Step 1: Activate App Embed in Shopify</p>
                    <StepStateBadge state={states[0]} />
                  </div>
                </button>
                {openIndex === 0 ? (
                  <div className="setup-guide-step-body">
                    Activate and save the app embed in your Shopify theme settings to enable the app on your storefront.
                    {!onboarding?.clientIdConfigured ? (
                      <p style={{ marginTop: 12, marginBottom: 0, color: "#991b1b", fontSize: 12 }}>
                        Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> so the theme editor link works.
                      </p>
                    ) : null}
                    <div className="setup-guide-step-actions">
                      <a
                        className="setup-guide-a-primary"
                        href={themeEditorUrl || "#"}
                        target="_top"
                        rel="noopener noreferrer"
                        aria-disabled={!themeEditorUrl}
                        onClick={(e) => {
                          if (!themeEditorUrl) {
                            e.preventDefault();
                            return;
                          }
                          patchLocal({ step1InProgress: true });
                        }}
                      >
                        Open Theme Settings
                      </a>
                      <button type="button" className="setup-guide-btn-secondary" onClick={confirmEmbedSaved}>
                        Confirm app embed is saved
                      </button>
                    </div>
                    <p className="setup-guide-hint">
                      The app cannot see your theme editor. After the embed is turned <strong>on</strong> and you have
                      clicked <strong>Save</strong> in the theme editor, click <strong>Confirm app embed is saved</strong>{" "}
                      above—this step will show as completed.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={`setup-guide-step${openIndex === 1 ? " setup-guide-step--open" : ""}`}>
                <button
                  type="button"
                  className="setup-guide-step-head"
                  onClick={() => setOpenIndex(1)}
                  aria-expanded={openIndex === 1}
                >
                  {stepHeadIcon(states[1])}
                  <div className="setup-guide-step-head-main">
                    <p className="setup-guide-step-title">
                      Step 2: Create Discount &amp; Configure Widget Design
                    </p>
                    <StepStateBadge state={states[1]} />
                  </div>
                </button>
                {openIndex === 1 ? (
                  <div className="setup-guide-step-body">
                    Create and configure your first discount campaign, then customize the widget design for your storefront
                    display.
                    <div className="setup-guide-step-actions">
                      <button type="button" className="setup-guide-a-primary" onClick={goDiscounts}>
                        Open Discounts
                      </button>
                    </div>
                    <p className="setup-guide-hint">
                      When you create your first discount, this step completes automatically when you return to the home
                      page.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={`setup-guide-step${openIndex === 2 ? " setup-guide-step--open" : ""}`}>
                <button
                  type="button"
                  className="setup-guide-step-head"
                  onClick={() => setOpenIndex(2)}
                  aria-expanded={openIndex === 2}
                >
                  {stepHeadIcon(states[2])}
                  <div className="setup-guide-step-head-main">
                    <p className="setup-guide-step-title">Step 3: Create Popup</p>
                    <StepStateBadge state={states[2]} />
                  </div>
                </button>
                {openIndex === 2 ? (
                  <div className="setup-guide-step-body">
                    Create and customize the popup design. Once created, a unique ID will be generated. Copy the ID and
                    paste it into the storefront block section to display the popup on the frontend.
                    <div className="setup-guide-step-actions">
                      <button type="button" className="setup-guide-a-primary" onClick={goPopup}>
                        Open Popup designer
                      </button>
                    </div>
                    <p className="setup-guide-hint">
                      After you save a popup design, this step completes automatically when you return here.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={`setup-guide-step${openIndex === 3 ? " setup-guide-step--open" : ""}`}>
                <button
                  type="button"
                  className="setup-guide-step-head"
                  onClick={() => setOpenIndex(3)}
                  aria-expanded={openIndex === 3}
                >
                  {stepHeadIcon(states[3])}
                  <div className="setup-guide-step-head-main">
                    <p className="setup-guide-step-title">Step 4: Create Announcement Bar</p>
                    <StepStateBadge state={states[3]} />
                  </div>
                </button>
                {openIndex === 3 ? (
                  <div className="setup-guide-step-body">
                    Create and customize the announcement bar heading and section. Once created, a unique ID will be
                    generated. Copy the ID and paste it into the storefront block section to display the announcement bar
                    on the frontend.
                    <div className="setup-guide-step-actions">
                      <button type="button" className="setup-guide-a-primary" onClick={goAnnouncements}>
                        Open Announcements
                      </button>
                    </div>
                    <p className="setup-guide-hint">
                      After you create an announcement bar, this step completes automatically when you return here.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* eslint-enable react/prop-types */

export default function AppIndexTierStatus() {
  const {
    tierRules = [],
    tierDiscounts = [],
    totalDiscountUsageCount = 0,
    setupDetection: setupDetectionRaw,
    contentCounts: contentCountsRaw,
  } = useLoaderData() ?? {};
  const setupDetection = useMemo(
    () =>
      setupDetectionRaw ?? {
        hasTierDiscount: false,
        hasPopupDesign: false,
        hasAnnouncementBar: false,
      },
    [setupDetectionRaw],
  );
  const contentCounts = useMemo(
    () =>
      contentCountsRaw ?? {
        popupDesigns: 0,
        announcementHeaders: 0,
        announcementBodies: 0,
      },
    [contentCountsRaw],
  );
  const location = useLocation();
  const { onboarding } = useOutletContext() || {};

  const withShopifyParams = useCallback(
    (path) => {
      const [pathname, existingQuery = ""] = path.split("?");
      const current = new URLSearchParams(location.search);
      const keep = new URLSearchParams(existingQuery);
      for (const key of ["host", "shop"]) {
        const val = current.get(key);
        if (val && !keep.has(key)) keep.set(key, val);
      }
      const qs = keep.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [location.search],
  );

  const groupedTierDiscounts = useMemo(
    () => groupTiersByDiscount(tierRules, tierDiscounts),
    [tierRules, tierDiscounts],
  );
  const activeDiscountGroups = useMemo(
    () =>
      groupedTierDiscounts.filter(
        (group) => String(group.discountStatus || "").toUpperCase() === "ACTIVE",
      ),
    [groupedTierDiscounts],
  );
  const primaryActiveDiscount = activeDiscountGroups[0] || null;
  const hasMultipleActiveDiscounts = activeDiscountGroups.length > 1;

  return (
    <s-page heading="Geekify: Upsells, Progress Bar">
      <style>{tierStatusCss}</style>
      <style>{setupGuideCss}</style>

      <SetupGuideSection
        onboarding={onboarding}
        setupDetection={setupDetection}
        withShopifyParams={withShopifyParams}
      />

      <s-section heading="Shop overview">
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
          <div className="disc-tier-metric">
            <div className="disc-tier-metric-label">Popup designs</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{Number(contentCounts.popupDesigns || 0)}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Popup designs"
                aria-label="Popup designs"
              >
                <ViewIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">Saved popup designs in the Popup screen.</div>
          </div>
          <div className="disc-tier-metric">
            <div className="disc-tier-metric-label">Announcement bars</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{Number(contentCounts.announcementHeaders || 0)}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Announcement bars"
                aria-label="Announcement bars"
              >
                <MegaphoneIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">Header strip bars (Announcements → bar type).</div>
          </div>
          <div className="disc-tier-metric">
            <div className="disc-tier-metric-label">Announcement body blocks</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <span className="disc-tier-metric-value">{Number(contentCounts.announcementBodies || 0)}</span>
              <div
                className="disc-tier-metric-icon-badge"
                style={DISC_TIER_METRIC_ICON_BADGE_STYLE}
                title="Announcement body blocks"
                aria-label="Announcement body blocks"
              >
                <LayoutSectionIcon width={20} height={20} aria-hidden style={DISC_TIER_METRIC_ICON_COLOR} />
              </div>
            </div>
            <div className="disc-tier-metric-sub">Additional UI blocks in cart or drawer (body type).</div>
          </div>
        </div>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
