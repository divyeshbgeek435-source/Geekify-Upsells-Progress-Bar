import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { FREE_PLAN_DOWNGRADE_NOTICE_MESSAGE } from "../lib/plan-limit-access.shared.js";

export function PlanDowngradeNoticeModal({ open, onDismiss }) {
  const dialogRef = useRef(null);
  const fetcher = useFetcher();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return undefined;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
    return undefined;
  }, [open]);

  const dismiss = () => {
    const fd = new FormData();
    fd.set("intent", "dismiss-plan-downgrade-notice");
    fetcher.submit(fd, { method: "post", action: "/app" });
    onDismiss?.();
  };

  return (
    <dialog
      ref={dialogRef}
      className="plan-downgrade-dialog"
      aria-labelledby="plan-downgrade-title"
      onClose={dismiss}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <style>{`
        .plan-downgrade-dialog {
          border: none;
          border-radius: 14px;
          padding: 0;
          max-width: 440px;
          width: calc(100% - 32px);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
        }
        .plan-downgrade-dialog::backdrop {
          background: rgba(15, 23, 42, 0.45);
        }
        .plan-downgrade-inner {
          padding: 24px 22px 20px;
        }
        .plan-downgrade-title {
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 650;
          color: #0f172a;
        }
        .plan-downgrade-body {
          margin: 0 0 20px;
          font-size: 14px;
          line-height: 1.55;
          color: #475569;
        }
        .plan-downgrade-actions {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
      <div className="plan-downgrade-inner">
        <h2 id="plan-downgrade-title" className="plan-downgrade-title">
          Plan changed to Free
        </h2>
        <p className="plan-downgrade-body">{FREE_PLAN_DOWNGRADE_NOTICE_MESSAGE}</p>
        <div className="plan-downgrade-actions">
          <s-button type="button" variant="primary" onClick={dismiss}>
            Got it
          </s-button>
        </div>
      </div>
    </dialog>
  );
}
