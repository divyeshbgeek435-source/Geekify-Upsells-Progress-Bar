import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useOutletContext,
  useRouteError,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadShopBillingContext,
  rejectIfAnnouncementCreateBlocked,
  rejectIfAppLocked,
  rejectIfDeleteNotAllowed,
} from "../lib/app-billing.server.js";
import {
  loadAnnouncementHeaderAdminContext,
  loadAnnouncementBodyAdminBlocks,
  handleAnnouncementsUnifiedAction,
} from "../lib/announcements-admin.server.js";
import { resolveSectionHtmlIdFromHeader } from "../lib/announcement-header-template.js";
import {
  AnnouncementHeaderAdmin,
  AnnouncementThemeSetupBanner,
} from "./app.announcement-bars.jsx";
import { AnnouncementBodyAdmin } from "./app.additional.jsx";
import {
  PlanGatedDeleteButton,
  useBillingUpgradeHref,
} from "../components/plan-gated-delete.jsx";
import { getPlanLimits } from "../lib/app-plans.shared.js";
import { rejectIfAnnouncementFormLocked } from "../lib/plan-limit-enforcement.server.js";
import {
  isAnnouncementEditableOnPlan,
  PLAN_LOCKED_ITEM_MESSAGE,
} from "../lib/plan-limit-access.shared.js";
import {
  PLAN_LOCKED_CELL_CLASS,
  PLAN_LOCKED_PANEL_CLASS,
  planLockedRowClassName,
  planLockedTableCellProps,
} from "../components/plan-locked-visual.jsx";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const billingPlan = await loadShopBillingContext(billing, shop);
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "";
  const edit = url.searchParams.get("edit") || "";
  const headerEditId = kind === "header" ? edit : "";
  const bodyEditId = kind === "body" ? edit : "";
  const pendingHeaderCreate = kind === "header" && url.searchParams.get("create") === "1";
  const pendingBodyCreate = kind === "body" && url.searchParams.get("create") === "1";

  const [headerCtx, bodyBlocks] = await Promise.all([
    loadAnnouncementHeaderAdminContext(shop, headerEditId || null),
    loadAnnouncementBodyAdminBlocks(shop),
  ]);

  const headerLoaderData = {
    ...headerCtx,
    pendingHeaderCreate,
  };

  const bodyLoaderData = {
    blocks: bodyBlocks,
    bodyEditId,
    pendingBodyCreate,
  };

  const mergedRows = [
    ...headerCtx.bars.map((b) => ({
      kind: "header",
      id: b.id,
      name: b.name,
      sectionId: resolveSectionHtmlIdFromHeader(b),
      active: Boolean(b.active),
      createdAt: b.createdAt.getTime(),
      updatedAt: b.updatedAt.getTime(),
    })),
    ...bodyBlocks.map((b) => ({
      kind: "body",
      id: b.rowId,
      name: b.name || `Additional UI ${b.config.sectionId}`,
      sectionId: b.config.sectionId,
      active: Boolean(b.active),
      createdAt: new Date(b.createdAt || b.updatedAt).getTime(),
      updatedAt: new Date(b.updatedAt).getTime(),
    })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  return {
    shop,
    headerLoaderData,
    bodyLoaderData,
    mergedRows,
    billingPlan,
  };
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const billingPlan = await loadShopBillingContext(billing, shop);
  const appLockErr = rejectIfAppLocked(billingPlan);
  if (appLockErr) return appLockErr;
  const form = await request.formData();

  const limitErr = await rejectIfAnnouncementCreateBlocked(
    shop,
    billingPlan.planId,
    form,
  );
  if (limitErr) return limitErr;

  const lockErr = rejectIfAnnouncementFormLocked(
    billingPlan.planId,
    billingPlan.planSlots,
    form,
    { blockActivationOnly: true },
  );
  if (lockErr) return lockErr;

  const intent = String(form.get("intent") || "");
  if (intent !== "set_active") {
    const editLockErr = rejectIfAnnouncementFormLocked(
      billingPlan.planId,
      billingPlan.planSlots,
      form,
    );
    if (editLockErr) return editLockErr;
  }

  if (intent === "delete") {
    const deleteBlock = rejectIfDeleteNotAllowed(billingPlan.planId);
    if (deleteBlock) return deleteBlock;
  }

  return handleAnnouncementsUnifiedAction(shop, form);
};

function AnnouncementDisplayToggle({ active, onChange, disabled, showLabel = true }) {
  return (
    <label
      className={`ann-display-toggle${active ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
      title={active ? "Shown on storefront" : "Hidden on storefront"}
    >
      <input
        type="checkbox"
        checked={active}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={active ? "Display on storefront: On" : "Display on storefront: Off"}
      />
      <span className="ann-display-toggle-track" aria-hidden="true">
        <span className="ann-display-toggle-thumb" />
      </span>
      {showLabel ? (
        <span className="ann-display-toggle-text">{active ? "On" : "Off"}</span>
      ) : null}
    </label>
  );
}

function HeaderOverrideModal({ open, existingName, onCancel, onOverride }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ann-type-dialog"
      aria-labelledby="ann-override-title"
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="ann-type-panel" onClick={(e) => e.stopPropagation()}>
        <h2 id="ann-override-title" className="ann-type-title">
          Override existing announcement bar?
        </h2>
        <p className="ann-type-sub">
          Only one Header / Announcement bar can be active at a time.{" "}
          <strong>{existingName}</strong> is currently on. Override it to turn on this bar, or
          cancel to keep everything as is.
        </p>
        <s-stack direction="inline" gap="small">
          <s-button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </s-button>
          <s-button type="button" variant="primary" onClick={onOverride}>
            Override
          </s-button>
        </s-stack>
      </div>
    </dialog>
  );
}

function TypePickerModal({ open, onClose, onPickHeader, onPickBody, headerDisabled, bodyDisabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ann-type-dialog"
      aria-labelledby="ann-type-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ann-type-panel" onClick={(e) => e.stopPropagation()}>
        <h2 id="ann-type-title" className="ann-type-title">
          Create announcement
        </h2>
        <p className="ann-type-sub">Choose the announcement type to open the matching editor.</p>
        <div className="ann-type-grid">
          <button
            type="button"
            className="ann-type-card"
            disabled={headerDisabled}
            style={
              headerDisabled
                ? { opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }
                : undefined
            }
            onClick={onPickHeader}
          >
            <strong>Announcement bar</strong>
            <span>Header strip (app embed / header block)</span>
          </button>
          <button
            type="button"
            className="ann-type-card"
            disabled={bodyDisabled}
            style={
              bodyDisabled
                ? { opacity: 0.5, cursor: "not-allowed", pointerEvents: "none" }
                : undefined
            }
            onClick={onPickBody}
          >
            <strong>Announcement Section</strong>
            <span>Additional UI in cart / drawer</span>
          </button>
        </div>
        <button type="button" className="ann-type-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

function UnifiedDeleteModal({ open, target, onClose, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) el.close();
    return undefined;
  }, [open]);

  if (!target) return null;
  return (
    <dialog
      ref={ref}
      className="ann-type-dialog"
      aria-labelledby="ann-del-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ann-type-panel" onClick={(e) => e.stopPropagation()}>
        <h2 id="ann-del-title" className="ann-type-title">
          Delete announcement?
        </h2>
        <p className="ann-type-sub">
          This permanently removes{" "}
          <strong>{target.name}</strong> ({target.kind === "header" ? "header" : "body"}).
        </p>
        <s-stack direction="inline" gap="small">
          <s-button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </s-button>
          <s-button type="button" variant="primary" tone="critical" onClick={onConfirm}>
            Delete
          </s-button>
        </s-stack>
      </div>
    </dialog>
  );
}

export default function AnnouncementsPage() {
  const { mergedRows, headerLoaderData, bodyLoaderData, billingPlan: loaderBillingPlan } =
    useLoaderData();
  const { onboarding, billingPlan: outletBillingPlan } = useOutletContext() || {};
  const billingPlan = loaderBillingPlan ?? outletBillingPlan;
  const canDeleteRecords = Boolean(billingPlan?.isPremium);
  const billingUpgradeHref = useBillingUpgradeHref();
  const actionData = useActionData();
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [headerOverride, setHeaderOverride] = useState(null);
  const toggleBusy = navigation.state === "submitting";

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

  const totalRecords = mergedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const pageStart = (currentPage - 1) * tablePageSize;
  const paginatedRows = useMemo(
    () => mergedRows.slice(pageStart, pageStart + tablePageSize),
    [mergedRows, pageStart, tablePageSize],
  );
  const pageEnd = Math.min(pageStart + paginatedRows.length, totalRecords);

  const urlKind = useMemo(
    () => new URLSearchParams(location.search).get("kind") || "",
    [location.search],
  );
  const urlEditId = useMemo(
    () => new URLSearchParams(location.search).get("edit") || "",
    [location.search],
  );
  const editingPlanLocked = useMemo(() => {
    if (!urlEditId || billingPlan?.isPremium) return false;
    if (urlKind === "header") {
      return !isAnnouncementEditableOnPlan(
        billingPlan?.planId,
        "header",
        urlEditId,
        billingPlan?.planSlots,
      );
    }
    if (urlKind === "body") {
      return !isAnnouncementEditableOnPlan(
        billingPlan?.planId,
        "body",
        urlEditId,
        billingPlan?.planSlots,
      );
    }
    return false;
  }, [urlEditId, urlKind, billingPlan?.planId, billingPlan?.planSlots, billingPlan?.isPremium]);

  const announcementLimits = useMemo(
    () => getPlanLimits(billingPlan?.planId),
    [billingPlan?.planId],
  );
  const headerAnnouncementCount = useMemo(
    () => mergedRows.filter((r) => r.kind === "header").length,
    [mergedRows],
  );
  const bodyAnnouncementCount = useMemo(
    () => mergedRows.filter((r) => r.kind === "body").length,
    [mergedRows],
  );
  const canCreateAnnouncementHeader = useMemo(() => {
    const cap = announcementLimits.maxAnnouncementHeaders;
    return cap == null || headerAnnouncementCount < cap;
  }, [announcementLimits.maxAnnouncementHeaders, headerAnnouncementCount]);
  const canCreateAnnouncementBody = useMemo(() => {
    const cap = announcementLimits.maxAnnouncementBodies;
    return cap == null || bodyAnnouncementCount < cap;
  }, [announcementLimits.maxAnnouncementBodies, bodyAnnouncementCount]);
  const canCreateAnyAnnouncement = canCreateAnnouncementHeader || canCreateAnnouncementBody;
  const createLimitReached = !canCreateAnyAnnouncement;

  useEffect(() => {
    if (tablePage > totalPages) setTablePage(totalPages);
  }, [tablePage, totalPages]);

  useEffect(() => {
    if (actionData?.ok && (actionData?.deleted || actionData?.intent === "delete")) {
      navigate(withShopifyParams("/app/announcements"));
    }
  }, [actionData, navigate, withShopifyParams]);

  useEffect(() => {
    if (actionData?.needsHeaderOverride) {
      setHeaderOverride({
        pendingId: actionData.pendingId,
        existingName: actionData.existingActiveName || "Another bar",
      });
    }
  }, [actionData?.needsHeaderOverride, actionData?.pendingId, actionData?.existingActiveName]);

  useEffect(() => {
    if (actionData?.ok && actionData?.intent === "set_active") {
      setHeaderOverride(null);
    }
  }, [actionData?.ok, actionData?.intent]);

  const submitDisplayToggle = useCallback(
    (row, nextActive, confirmOverride = false) => {
      const fd = new FormData();
      fd.set("intent", "set_active");
      fd.set("active", nextActive ? "1" : "0");
      if (row.kind === "header") {
        fd.set("recordKind", "header");
        fd.set("id", row.id);
        if (confirmOverride) fd.set("confirmOverride", "true");
      } else {
        fd.set("recordKind", "body");
        fd.set("rowId", row.id);
      }
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const confirmHeaderOverride = useCallback(() => {
    if (!headerOverride?.pendingId) return;
    const row = mergedRows.find(
      (r) => r.kind === "header" && r.id === headerOverride.pendingId,
    );
    if (!row) {
      setHeaderOverride(null);
      return;
    }
    submitDisplayToggle(row, true, true);
    setHeaderOverride(null);
  }, [headerOverride, mergedRows, submitDisplayToggle]);

  const confirmUnifiedDelete = useCallback(() => {
    if (!deleteTarget || !canDeleteRecords) return;
    const fd = new FormData();
    fd.set("intent", "delete");
    fd.set("recordKind", deleteTarget.kind === "header" ? "header" : "body");
    if (deleteTarget.kind === "header") fd.set("id", deleteTarget.id);
    else fd.set("rowId", deleteTarget.id);
    submit(fd, { method: "post" });
    setDeleteTarget(null);
  }, [canDeleteRecords, deleteTarget, submit]);

  return (
    <>
      <style>{`
        .ann-type-dialog {
          padding: 0;
          border: none;
          border-radius: 16px;
          background: transparent;
          box-shadow: none;
        }
        .ann-type-dialog::backdrop {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
        }
        .ann-type-panel {
          background: #fafbfc;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
          padding: 22px;
          min-width: min(92vw, 420px);
          max-width: 520px;
        }
        .ann-type-title { margin: 0 0 8px; font-size: 1.2rem; font-weight: 600; color: #0f172a; }
        .ann-type-sub { margin: 0 0 16px; font-size: 0.875rem; line-height: 1.45; color: #64748b; }
        .ann-type-grid { display: grid; gap: 10px; margin-bottom: 14px; }
        .ann-type-card {
          text-align: left;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          cursor: pointer;
          font: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ann-type-card:hover {
          border-color: rgba(0, 123, 96);
          // box-shadow: 0 6px 20px rgba(99, 102, 241, 0.1);
        }
        .ann-type-card strong { display: block; font-size: 0.95rem; color: #0f172a; margin-bottom: 4px; }
        .ann-type-card span { display: block; font-size: 0.78rem; color: #64748b; line-height: 1.35; }
        .ann-type-cancel {
          width: 100%;
          padding: 8px;
          border: 1px dashed rgba(15, 23, 42, 0.18);
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .ann-display-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .ann-display-toggle.is-disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .ann-unified-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ann-unified-table thead tr { background: #f8fafc; border-bottom: 1px solid #e4e8f0; }
        .ann-unified-table th {
          text-align: left;
          padding: 12px 16px;
          font-weight: 700;
          color: #475569;
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .ann-unified-table tbody tr { border-bottom: 1px solid #eef0f4; transition: background 0.12s; }
        .ann-unified-table tbody tr:hover:not(.sce-plan-locked-row) { background: #f8fafc; }
        .ann-unified-table td { padding: 14px 16px; vertical-align: middle; color: #0f172a; }
        .ann-type-label, .ann-name-label { font-weight: 600; }
        .ann-section-id { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; }
        .ann-actions-cell { text-align: right; white-space: nowrap; }
        .ann-display-toggle input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .ann-display-toggle-track {
          position: relative;
          width: 40px;
          height: 22px;
          border-radius: 999px;
          background: #d1d5db;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .ann-display-toggle.is-on .ann-display-toggle-track {
          background: rgb(0, 123, 95);
        }
        .ann-display-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s;
        }
        .ann-display-toggle.is-on .ann-display-toggle-thumb {
          transform: translateX(18px);
        }
        .ann-display-toggle-text {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          min-width: 22px;
        }
      `}</style>

      {editingPlanLocked ? (
        <div className={PLAN_LOCKED_PANEL_CLASS} style={{ margin: "0 0 12px" }}>
          {PLAN_LOCKED_ITEM_MESSAGE}{" "}
          <s-link href={withShopifyParams("/app/billing")}>Upgrade to Premium</s-link> to edit
          this announcement.
        </div>
      ) : null}

      <div
        className={editingPlanLocked ? "sce-plan-locked-editor-body" : undefined}
        style={editingPlanLocked ? { pointerEvents: "none" } : undefined}
      >
        <AnnouncementHeaderAdmin
          loaderData={headerLoaderData}
          routePrefix="/app/announcements"
          showTable={false}
          navigateQueryStyle="unified"
        />
        <AnnouncementBodyAdmin
          loaderData={bodyLoaderData}
          routePrefix="/app/announcements"
          showTable={false}
          navigateQueryStyle="unified"
        />
      </div>

      <TypePickerModal
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        headerDisabled={!canCreateAnnouncementHeader}
        bodyDisabled={!canCreateAnnouncementBody}
        onPickHeader={() => {
          setTypePickerOpen(false);
          navigate(withShopifyParams("/app/announcements?kind=header&create=1"));
        }}
        onPickBody={() => {
          setTypePickerOpen(false);
          navigate(withShopifyParams("/app/announcements?kind=body&create=1"));
        }}
      />

      <UnifiedDeleteModal
        open={Boolean(deleteTarget)}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmUnifiedDelete}
      />

      <HeaderOverrideModal
        open={Boolean(headerOverride)}
        existingName={headerOverride?.existingName || ""}
        onCancel={() => setHeaderOverride(null)}
        onOverride={confirmHeaderOverride}
      />

      <s-page heading="Announcements">
        {!onboarding?.clientIdConfigured ? (
          <s-banner tone="critical" heading="Missing API Key">
            Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> for theme editor deep links.
          </s-banner>
        ) : null}

        {actionData?.ok ? (
          <s-banner tone="success" heading="Updated">
            {actionData?.intent === "delete" || actionData?.deleted
              ? "Announcement removed."
              : actionData?.intent === "set_active"
                ? "Storefront display updated."
                : "Saved successfully."}
          </s-banner>
        ) : null}

        {actionData?.ok === false && actionData?.error ? (
          <s-banner tone="critical" heading="Action failed">
            {actionData.error}
            {actionData.planUpgradeRequired ? (
              <>
                {" "}
                <s-link href={withShopifyParams("/app/billing")}>View pricing</s-link>
              </>
            ) : null}
          </s-banner>
        ) : null}

        <AnnouncementThemeSetupBanner
          embedUrl={
            onboarding?.announcementBarEmbedEditorUrl ||
            headerLoaderData?.announcementBarEditorUrl
          }
          blockHeaderUrl={
            onboarding?.announcementBarBlockHeaderUrl ||
            headerLoaderData?.announcementBarBlockHeaderUrl
          }
          clientIdConfigured={
            onboarding?.clientIdConfigured ?? headerLoaderData?.clientIdConfigured
          }
        />

        {!billingPlan?.isPremium ? (
          <s-banner tone="info" heading={`${billingPlan.planName} plan`}>
            {announcementLimits.maxAnnouncementHeaders != null &&
            announcementLimits.maxAnnouncementBodies != null
              ? `Your plan includes up to ${announcementLimits.maxAnnouncementHeaders} announcement header${
                  announcementLimits.maxAnnouncementHeaders === 1 ? "" : "s"
                } and up to ${announcementLimits.maxAnnouncementBodies} announcement Section${
                  announcementLimits.maxAnnouncementBodies === 1 ? "" : "s"
                }. `
              : null}
            <s-link href={withShopifyParams("/app/billing")}>Upgrade to Premium</s-link> for
            unlimited announcements.
          </s-banner>
        ) : null}

        <s-section>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 160, maxWidth: 200 }}>
              <s-select
                label="Rows per page"
                value={String(tablePageSize)}
                onChange={(e) => {
                  const next = Number(e.target?.value) || 10;
                  setTablePageSize(next);
                  setTablePage(1);
                }}
              >
                <s-option value="5">5 / page</s-option>
                <s-option value="10">10 / page</s-option>
                <s-option value="25">25 / page</s-option>
                <s-option value="50">50 / page</s-option>
              </s-select>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                maxWidth: 360,
              }}
            >
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  background: createLimitReached
                    ? "rgba(148, 163, 184, 0.15)"
                    : "rgb(0 123 96 / 10%)",
                  color: createLimitReached ? "#64748b" : "rgb(0 123 96)",
                  border: createLimitReached
                    ? "1px solid rgba(148, 163, 184, 0.35)"
                    : "1px solid rgb(0 123 96 / 20%)",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: createLimitReached ? "not-allowed" : "pointer",
                  opacity: createLimitReached ? 0.85 : 1,
                }}
                disabled={createLimitReached}
                onClick={() => {
                  if (!canCreateAnyAnnouncement) return;
                  setTypePickerOpen(true);
                }}
              >
                + Create announcement
              </button>
              {createLimitReached ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    lineHeight: 1.45,
                    color: "#64748b",
                    textAlign: "right",
                  }}
                >
                  You have reached your plan limit. Please upgrade your plan to create more
                  announcements.{" "}
                  <s-link href={withShopifyParams("/app/billing")}>Upgrade plan</s-link>
                </p>
              ) : null}
            </div>
          </div>

          {mergedRows.length === 0 ? (
            <s-box padding="large" borderWidth="base" borderRadius="base">
              <s-text tone="neutral">No announcements yet. Create a header bar or a body block.</s-text>
            </s-box>
          ) : (
            <div
              style={{
                overflowX: "auto",
                borderRadius: 14,
                border: "1px solid #e4e8f0",
                background: "#fff",
              }}
            >
              <table className="ann-unified-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Section ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Display</th>
                    <th scope="col" className="ann-actions-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => {
                    const rowPlanLocked = !isAnnouncementEditableOnPlan(
                      billingPlan?.planId,
                      row.kind,
                      row.id,
                      billingPlan?.planSlots,
                    );
                    const cellProps = planLockedTableCellProps(rowPlanLocked);
                    const typeLabel =
                      row.kind === "header"
                        ? "Header / Announcement bar"
                        : "Section / Announcement Bar ";
                    return (
                      <tr
                        key={`${row.kind}-${row.id}`}
                        className={planLockedRowClassName(rowPlanLocked)}
                        title={rowPlanLocked ? PLAN_LOCKED_ITEM_MESSAGE : undefined}
                        aria-disabled={rowPlanLocked || undefined}
                      >
                        <td {...cellProps}>
                          <span className="ann-type-label">{typeLabel}</span>
                        </td>
                        <td {...cellProps}>
                          <span className="ann-section-id">
                            {row.kind === "header" ? "-" : row.sectionId}
                          </span>
                        </td>
                        <td {...cellProps}>
                          <span className="ann-name-label">{row.name}</span>
                        </td>
                        <td {...cellProps}>
                          <AnnouncementDisplayToggle
                            active={Boolean(row.active)}
                            disabled={toggleBusy || rowPlanLocked}
                            onChange={(next) => {
                              if (rowPlanLocked && next) return;
                              if (row.kind === "header" && next && !row.active) {
                                submitDisplayToggle(row, true, false);
                                return;
                              }
                              submitDisplayToggle(row, next, false);
                            }}
                          />
                        </td>
                        <td
                          {...cellProps}
                          className={
                            rowPlanLocked
                              ? `ann-actions-cell ${PLAN_LOCKED_CELL_CLASS}`
                              : "ann-actions-cell"
                          }
                        >
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <s-button
                              type="button"
                              variant="tertiary"
                              icon="edit"
                              disabled={rowPlanLocked}
                              title={rowPlanLocked ? PLAN_LOCKED_ITEM_MESSAGE : undefined}
                              onClick={() => {
                                if (rowPlanLocked) return;
                                const q =
                                  row.kind === "header"
                                    ? `kind=header&edit=${encodeURIComponent(row.id)}`
                                    : `kind=body&edit=${encodeURIComponent(row.id)}`;
                                navigate(withShopifyParams(`/app/announcements?${q}`));
                              }}
                            />
                            <PlanGatedDeleteButton
                              canDelete={canDeleteRecords}
                              upgradeHref={billingUpgradeHref}
                              onClick={() =>
                                setDeleteTarget({
                                  kind: row.kind,
                                  id: row.id,
                                  name: row.name,
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {mergedRows.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <s-text tone="neutral">
                Showing {pageStart + 1}-{pageEnd} of {totalRecords}
              </s-text>
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-button
                  type="button"
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </s-button>
                <s-text tone="neutral">
                  Page {currentPage} / {totalPages}
                </s-text>
                <s-button
                  type="button"
                  variant="secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </s-button>
              </s-stack>
            </div>
          ) : null}
        </s-section>
      </s-page>
    </>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
