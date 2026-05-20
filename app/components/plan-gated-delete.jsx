import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BILLING_PLANS_PATH,
  FREE_PLAN_DELETE_BLOCKED_MESSAGE,
} from "../lib/plan-delete-access.shared.js";

const TOOLTIP_STYLE = `
  .plan-gated-delete-host {
    position: relative;
    display: inline-flex;
    vertical-align: middle;
  }
  .plan-gated-delete-tooltip {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 1000;
    width: min(320px, 88vw);
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #fff;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
    font-size: 13px;
    line-height: 1.45;
    color: #334155;
    text-align: left;
    pointer-events: auto;
  }
  .plan-gated-delete-tooltip p {
    margin: 0 0 10px;
  }
  .plan-gated-delete-upgrade {
    display: inline-block;
    font-weight: 600;
    color: #007b60;
    text-decoration: none;
  }
  .plan-gated-delete-upgrade:hover {
    text-decoration: underline;
  }
`;

let tooltipStylesInjected = false;

function ensureTooltipStyles() {
  if (tooltipStylesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.setAttribute("data-plan-gated-delete", "true");
  el.textContent = TOOLTIP_STYLE;
  document.head.appendChild(el);
  tooltipStylesInjected = true;
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
 * Wraps a delete control on Free plan: shows upgrade tooltip on hover/focus.
 * When `canDelete` is true, renders children only.
 */
export function PlanGatedDeleteTooltip({ canDelete, upgradeHref, children }) {
  const [open, setOpen] = useState(false);
  const href = upgradeHref || BILLING_PLANS_PATH;

  if (canDelete) return children;

  ensureTooltipStyles();

  return (
    <span
      className="plan-gated-delete-host"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <div className="plan-gated-delete-tooltip" role="tooltip">
          <p>{FREE_PLAN_DELETE_BLOCKED_MESSAGE}</p>
          <Link to={href} className="plan-gated-delete-upgrade">
            Upgrade Plan
          </Link>
        </div>
      ) : null}
    </span>
  );
}
