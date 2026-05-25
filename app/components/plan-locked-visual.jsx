import { PLAN_LOCKED_ITEM_MESSAGE } from "../lib/plan-limit-access.shared.js";

export const PLAN_LOCKED_ROW_CLASS = "sce-plan-locked-row";
export const PLAN_LOCKED_CELL_CLASS = "sce-plan-locked-cell";
export const PLAN_LOCKED_PANEL_CLASS = "sce-plan-locked-panel";

export const PLAN_LOCKED_GLOBAL_CSS = `
  .${PLAN_LOCKED_ROW_CLASS},
  tr.${PLAN_LOCKED_ROW_CLASS},
  s-table-row.${PLAN_LOCKED_ROW_CLASS} {
    background-color: #f1f5f9 !important;
  }
  tr.${PLAN_LOCKED_ROW_CLASS}:hover,
  .popup-design-table tbody tr.${PLAN_LOCKED_ROW_CLASS}:hover {
    background-color: #f1f5f9 !important;
  }
  .${PLAN_LOCKED_CELL_CLASS},
  .${PLAN_LOCKED_ROW_CLASS} td,
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-discount-name,
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-tier-tag,
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-active-count,
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-schedule,
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-always-on {
    color: #94a3b8 !important;
  }
  .${PLAN_LOCKED_ROW_CLASS} .disc-overview-tier-tag {
    background: #e8ecf1 !important;
    border-color: #d1d5db !important;
  }
  .${PLAN_LOCKED_ROW_CLASS} s-text,
  .${PLAN_LOCKED_ROW_CLASS} td,
  .${PLAN_LOCKED_ROW_CLASS} td div,
  .${PLAN_LOCKED_ROW_CLASS} td span {
    color: #94a3b8 !important;
  }
  .${PLAN_LOCKED_PANEL_CLASS} {
    position: relative;
    border-radius: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 12px 14px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.45;
    margin-bottom: 12px;
  }
  .disc-modal.sce-plan-locked-modal > :not(.disc-modal-header):not(.${PLAN_LOCKED_PANEL_CLASS}) {
    pointer-events: none;
    opacity: 0.72;
  }
  .sce-plan-locked-editor-body {
    pointer-events: none;
    opacity: 0.72;
  }
  .ann-unified-table tbody tr.${PLAN_LOCKED_ROW_CLASS} td,
  .ann-unified-table tbody tr.${PLAN_LOCKED_ROW_CLASS}:hover td {
    background-color: #f1f5f9 !important;
    color: #94a3b8 !important;
  }
  .ann-unified-table tbody tr.${PLAN_LOCKED_ROW_CLASS} .ann-type-label,
  .ann-unified-table tbody tr.${PLAN_LOCKED_ROW_CLASS} .ann-name-label,
  .ann-unified-table tbody tr.${PLAN_LOCKED_ROW_CLASS} .ann-section-id {
    color: #94a3b8 !important;
  }
  .ann-display-toggle.is-disabled,
  .disc-storefront-toggle.is-disabled,
  .popup-display-toggle.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

/**
 * @param {boolean} isLocked
 * @param {string} [extraClass]
 */
export function planLockedRowClassName(isLocked, extraClass = "") {
  if (!isLocked) return extraClass || undefined;
  const parts = [PLAN_LOCKED_ROW_CLASS, extraClass].filter(Boolean);
  return parts.join(" ");
}

/**
 * @param {boolean} isLocked
 * @param {string} [message]
 */
export function planLockedRowAttrs(isLocked, message = PLAN_LOCKED_ITEM_MESSAGE) {
  if (!isLocked) return {};
  return {
    className: PLAN_LOCKED_ROW_CLASS,
    title: message,
    "aria-disabled": true,
  };
}

/** Wrap inline / web-component cell content when a row exceeds Free plan limits. */
export function PlanLockedCellWrap({ locked, children }) {
  if (!locked) return children;
  return (
    <span className={PLAN_LOCKED_CELL_CLASS} style={{ display: "block", color: "#94a3b8" }}>
      {children}
    </span>
  );
}

/** @param {boolean} locked */
export function planLockedTableCellProps(locked) {
  if (!locked) return {};
  return {
    className: PLAN_LOCKED_CELL_CLASS,
    style: { backgroundColor: "#f1f5f9", color: "#94a3b8" },
  };
}

export function PlanLockedGlobalStyles() {
  return <style>{PLAN_LOCKED_GLOBAL_CSS}</style>;
}
