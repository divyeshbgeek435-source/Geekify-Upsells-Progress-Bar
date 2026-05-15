import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useOutletContext,
  useRouteError,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  loadAnnouncementHeaderAdminContext,
  loadAnnouncementBodyAdminBlocks,
  handleAnnouncementsUnifiedAction,
} from "../lib/announcements-admin.server.js";
import { resolveSectionHtmlIdFromHeader } from "../lib/announcement-header-template.js";
import { AnnouncementHeaderAdmin } from "./app.announcement-bars.jsx";
import { AnnouncementBodyAdmin } from "./app.additional.jsx";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
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
      updatedAt: b.updatedAt.getTime(),
    })),
    ...bodyBlocks.map((b) => ({
      kind: "body",
      id: b.rowId,
      name: b.name || `Additional UI ${b.config.sectionId}`,
      sectionId: b.config.sectionId,
      updatedAt: new Date(b.updatedAt).getTime(),
    })),
  ].sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    shop,
    headerLoaderData,
    bodyLoaderData,
    mergedRows,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  return handleAnnouncementsUnifiedAction(session.shop, form);
};

function TypePickerModal({ open, onClose, onPickHeader, onPickBody }) {
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
          <button type="button" className="ann-type-card" onClick={onPickHeader}>
            <strong>Announcement bar</strong>
            <span>Header strip (app embed / header block)</span>
          </button>
          <button type="button" className="ann-type-card" onClick={onPickBody}>
            <strong>Announcement body</strong>
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
  const { mergedRows, headerLoaderData, bodyLoaderData } = useLoaderData();
  const actionData = useActionData();
  const location = useLocation();
  const navigate = useNavigate();
  const submit = useSubmit();
  const { onboarding } = useOutletContext() || {};

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  useEffect(() => {
    if (tablePage > totalPages) setTablePage(totalPages);
  }, [tablePage, totalPages]);

  useEffect(() => {
    if (actionData?.ok && (actionData?.deleted || actionData?.intent === "delete")) {
      navigate(withShopifyParams("/app/announcements"));
    }
  }, [actionData, navigate, withShopifyParams]);

  const confirmUnifiedDelete = useCallback(() => {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("intent", "delete");
    fd.set("recordKind", deleteTarget.kind === "header" ? "header" : "body");
    if (deleteTarget.kind === "header") fd.set("id", deleteTarget.id);
    else fd.set("rowId", deleteTarget.id);
    submit(fd, { method: "post" });
    setDeleteTarget(null);
  }, [deleteTarget, submit]);

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
      `}</style>

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

      <TypePickerModal
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
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
              : "Saved successfully."}
          </s-banner>
        ) : null}

        {actionData?.ok === false && actionData?.error ? (
          <s-banner tone="critical" heading="Action failed">
            {actionData.error}
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
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "rgb(0 123 96 / 10%)",
                color: "rgb(0 123 96)",
                border: "1px solid rgb(0 123 96 / 20%)",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => setTypePickerOpen(true)}
            >
              + Create announcement
            </button>
          </div>

          {mergedRows.length === 0 ? (
            <s-box padding="large" borderWidth="base" borderRadius="base">
              <s-text tone="neutral">No announcements yet. Create a header bar or a body block.</s-text>
            </s-box>
          ) : (
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="labeled">Type</s-table-header>
                <s-table-header listSlot="labeled">Section ID</s-table-header>
                <s-table-header listSlot="primary">Name</s-table-header>
                <s-table-header listSlot="labeled">Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {paginatedRows.map((row) => (
                  <s-table-row key={`${row.kind}-${row.id}`}>
                    <s-table-cell>
                      <s-text type="strong">
                        {row.kind === "header" ? "Header / Announcement bar" : "Body / Announcement body"}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text fontVariantNumeric="tabular-nums" type="strong">
                        {row.sectionId}
                      </s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-text type="strong">{row.name}</s-text>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small-100">
                        <s-button
                          type="button"
                          variant="tertiary"
                          icon="edit"
                          onClick={() => {
                            const q =
                              row.kind === "header"
                                ? `kind=header&edit=${encodeURIComponent(row.id)}`
                                : `kind=body&edit=${encodeURIComponent(row.id)}`;
                            navigate(withShopifyParams(`/app/announcements?${q}`));
                          }}
                        />
                        <s-button
                          type="button"
                          variant="tertiary"
                          tone="critical"
                          icon="delete"
                          onClick={() =>
                            setDeleteTarget({ kind: row.kind, id: row.id, name: row.name })
                          }
                        />
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
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
