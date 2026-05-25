import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { BILLING_PLANS_PATH } from "../lib/plan-delete-access.shared.js";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** @type {((to: string) => void) | null} */
let appNavigate = null;

const GAP_PX = 8;
const ARROW_SIZE_PX = 7;
const TOOLTIP_ROOT_ID = "sce-plan-gated-delete-tooltip-root";
const TOOLTIP_BG = "rgb(0, 123, 95)";
const TOOLTIP_STYLE_ID = "sce-plan-gated-delete-tooltip-styles";

const BUBBLE_BASE_STYLE = {
  position: "fixed",
  zIndex: "10000",
  minWidth: "240px",
  maxWidth: "300px",
  padding: "10px 12px",
  borderRadius: "4px",
  background: TOOLTIP_BG,
  color: "rgb(255, 255, 255)",
  fontSize: "13px",
  lineHeight: "1.45",
  fontWeight: "500",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  textAlign: "left",
  boxShadow: "rgba(15, 23, 42, 0.22) 0px 8px 24px",
  boxSizing: "border-box",
  pointerEvents: "auto",
  display: "none",
};

const LINK_STYLE = {
  color: "#7dd3fc",
  fontWeight: "600",
  textDecoration: "none",
};

let tooltipStylesInjected = false;

function ensureTooltipStyles() {
  if (tooltipStylesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.id = TOOLTIP_STYLE_ID;
  el.textContent = `
    #${TOOLTIP_ROOT_ID}::after {
      content: "";
      position: absolute;
      bottom: -${ARROW_SIZE_PX}px;
      left: var(--tooltip-arrow-left, auto);
      right: var(--tooltip-arrow-right, 15px);
      width: 0;
      height: 0;
      border-width: ${ARROW_SIZE_PX}px ${ARROW_SIZE_PX}px 0;
      border-style: solid;
      border-color: ${TOOLTIP_BG} transparent transparent;
    }
  `;
  document.head.appendChild(el);
  tooltipStylesInjected = true;
}

function setArrowPosition(root, bubbleLeft, buttonCenterX, bubbleWidth) {
  const arrowLeft = buttonCenterX - bubbleLeft - ARROW_SIZE_PX;
  const clamped = Math.min(
    Math.max(ARROW_SIZE_PX, arrowLeft),
    bubbleWidth - ARROW_SIZE_PX * 2,
  );
  root.style.setProperty("--tooltip-arrow-left", `${clamped}px`);
  root.style.setProperty("--tooltip-arrow-right", "auto");
}

/** One tooltip node for the whole app (avoids portal/s-stack layout bugs). */
function getTooltipRoot() {
  if (typeof document === "undefined") return null;
  ensureTooltipStyles();
  let root = document.getElementById(TOOLTIP_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOOLTIP_ROOT_ID;
    Object.assign(root.style, BUBBLE_BASE_STYLE);
    document.body.appendChild(root);
  }
  return root;
}

function hideTooltipRoot() {
  const root = document.getElementById(TOOLTIP_ROOT_ID);
  if (!root) return;
  root.style.display = "none";
}

function positionTooltipRoot(root, anchorRect) {
  const bubbleWidth = root.offsetWidth || 260;
  const bubbleHeight = root.offsetHeight || 72;
  const buttonCenterX = anchorRect.left + anchorRect.width / 2;
  const arrowTipGap = ARROW_SIZE_PX + GAP_PX;
  const top = Math.max(8, anchorRect.top - arrowTipGap - bubbleHeight);

  // Prefer right-aligning bubble with arrow over delete icon center
  let left = buttonCenterX - bubbleWidth + 22;
  left = Math.min(
    Math.max(12, left),
    window.innerWidth - bubbleWidth - 12,
  );

  root.style.top = `${top}px`;
  root.style.left = `${left}px`;

  setArrowPosition(root, left, buttonCenterX, bubbleWidth);
}

/** Pricing page URL with embedded-app `host` / `shop` params when present. */
export function resolveBillingUpgradeHref(explicitHref) {
  const base = explicitHref || BILLING_PLANS_PATH;
  if (typeof window === "undefined") return base;
  const [pathname, existingQs = ""] = base.split("?");
  const merged = new URLSearchParams(existingQs);
  const current = new URLSearchParams(window.location.search);
  for (const key of ["host", "shop"]) {
    if (!merged.has(key)) {
      const val = current.get(key);
      if (val) merged.set(key, val);
    }
  }
  const qs = merged.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function navigateToPricingPage(href) {
  hideTooltipRoot();
  const target = resolveBillingUpgradeHref(href);
  if (appNavigate) {
    appNavigate(target);
    return;
  }
  window.location.assign(target);
}

function renderTooltipContent(root, href) {
  const pricingHref = resolveBillingUpgradeHref(href);
  root.innerHTML = "";
  const p = document.createElement("p");
  p.style.margin = "0";
  p.style.whiteSpace = "normal";
  p.style.wordWrap = "break-word";
  p.append(
    document.createTextNode("Delete feature is not available in Free Plan. "),
  );
  const link = document.createElement("a");
  link.href = pricingHref;
  link.textContent = "Upgrade";
  link.setAttribute("role", "link");
  link.setAttribute("aria-label", "Upgrade to pricing plan");
  Object.assign(link.style, LINK_STYLE);
  link.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToPricingPage(pricingHref);
  });
  link.addEventListener("mouseenter", () => {
    link.style.textDecoration = "underline";
    link.style.color = "#bae6fd";
  });
  link.addEventListener("mouseleave", () => {
    link.style.textDecoration = "none";
    link.style.color = LINK_STYLE.color;
  });
  p.append(link, document.createTextNode(" to access it."));
  root.appendChild(p);
}

/** Registers React Router navigate for tooltip Upgrade clicks (mount in app layout). */
export function PlanGatedDeleteNavBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    appNavigate = navigate;
    return () => {
      appNavigate = null;
    };
  }, [navigate]);
  return null;
}

/** Preserves Shopify embedded `host` / `shop` query params for /app/billing. */
export function useBillingUpgradeHref() {
  const location = useLocation();
  return useMemo(() => {
    const current = new URLSearchParams(location.search);
    const keep = new URLSearchParams();
    for (const key of ["host", "shop"]) {
      const val = current.get(key);
      if (val) keep.set(key, val);
    }
    const qs = keep.toString();
    return qs ? `${BILLING_PLANS_PATH}?${qs}` : BILLING_PLANS_PATH;
  }, [location.search]);
}

/**
 * Uniform speech-bubble tooltip for Free-plan disabled delete controls.
 */
export function PlanGatedDeleteTooltip({
  canDelete,
  upgradeHref,
  children,
}) {
  const hostRef = useRef(null);
  const [open, setOpen] = useState(false);
  const href = upgradeHref || BILLING_PLANS_PATH;
  const hideTimerRef = useRef(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setOpen(false);
      hideTooltipRoot();
    }, 80);
  }, [clearHideTimer]);

  const show = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  useIsomorphicLayoutEffect(() => {
    if (canDelete || !open) {
      hideTooltipRoot();
      return;
    }
    const host = hostRef.current;
    const root = getTooltipRoot();
    if (!host || !root) return;

    renderTooltipContent(root, href);
    root.style.display = "block";
    positionTooltipRoot(root, host.getBoundingClientRect());
    requestAnimationFrame(() => {
      if (root.style.display === "block" && hostRef.current) {
        positionTooltipRoot(root, hostRef.current.getBoundingClientRect());
      }
    });
  }, [canDelete, open, href]);

  useEffect(() => {
    if (canDelete || !open) return;
    const root = getTooltipRoot();
    const host = hostRef.current;
    if (!root || !host) return;

    const reposition = () => {
      if (hostRef.current && root.style.display === "block") {
        positionTooltipRoot(root, hostRef.current.getBoundingClientRect());
      }
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [canDelete, open]);

  useEffect(() => {
    if (canDelete || !open) return;
    const root = getTooltipRoot();
    if (!root) return;

    const onRootEnter = () => clearHideTimer();
    const onRootLeave = () => scheduleHide();
    root.addEventListener("mouseenter", onRootEnter);
    root.addEventListener("mouseleave", onRootLeave);
    return () => {
      root.removeEventListener("mouseenter", onRootEnter);
      root.removeEventListener("mouseleave", onRootLeave);
    };
  }, [canDelete, open, clearHideTimer, scheduleHide]);

  useEffect(() => {
    if (canDelete) hideTooltipRoot();
  }, [canDelete]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  if (canDelete) return children;

  return (
    <span
      ref={hostRef}
      className="plan-gated-delete-host"
      style={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "middle",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
      }}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={scheduleHide}
    >
      <span
        className="plan-gated-delete-trigger"
        style={{
          display: "inline-flex",
          pointerEvents: "none",
          opacity: 0.55,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Standard delete control used on every app page (same icon button + tooltip).
 */
export function PlanGatedDeleteButton({
  canDelete,
  upgradeHref,
  onClick,
  disabled = false,
  loading = false,
}) {
  const blocked = !canDelete || disabled;
  return (
    <PlanGatedDeleteTooltip canDelete={canDelete} upgradeHref={upgradeHref}>
      <s-button
        type="button"
        variant="secondary"
        tone="critical"
        icon="delete"
        disabled={blocked}
        loading={loading}
        onClick={canDelete && !disabled ? onClick : undefined}
      />
    </PlanGatedDeleteTooltip>
  );
}
