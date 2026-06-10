import { useCallback, useEffect, useRef } from "react";
import { Form, useFetcher, useLocation } from "react-router";
import {
  APP_PLAN_ID,
  PLAN_CATALOG,
  PREMIUM_PLAN_PRICE_USD,
  getPremiumTrialDays,
} from "../lib/app-plans.shared.js";
import { TRIAL_LOCK_MESSAGE } from "../lib/subscription-state.shared.js";

export function trialLockModalMessage() {
  const days = getPremiumTrialDays();
  return `Your ${days}-day Premium free trial has ended. Choose how you want to continue.`;
}

/**
 * Full-app lock overlay while the merchant must pick Free or Premium after trial expiry.
 */
export function AppTrialLockOverlay({ locked }) {
  if (!locked) return null;

  return (
    <>
      <style>{`
        .app-trial-lock-overlay {
          position: fixed;
          inset: 0;
          z-index: 9990;
          background: rgba(15, 23, 42, 0.35);
          pointer-events: auto;
          cursor: not-allowed;
        }
        .app-trial-lock-nav-hint {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9991;
          padding: 8px 14px;
          border-radius: 8px;
          background: #0f172a;
          color: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25);
          pointer-events: none;
        }
      `}</style>
      <div className="app-trial-lock-overlay" aria-hidden />
      <div className="app-trial-lock-nav-hint">Choose a plan to continue using the app</div>
    </>
  );
}

/**
 * Non-dismissable plan-choice modal after the Premium trial ends.
 */
export function PremiumTrialLockModal({
  locked,
  premiumPriceUsd = PREMIUM_PLAN_PRICE_USD,
  billingPath = "/app/billing",
  formAction = "/app",
}) {
  const location = useLocation();
  const dialogRef = useRef(null);
  const fetcher = useFetcher();

  const freePlan = PLAN_CATALOG.find((p) => p.id === APP_PLAN_ID.FREE);
  const premiumPlan = PLAN_CATALOG.find((p) => p.id === APP_PLAN_ID.PREMIUM);

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

  useEffect(() => {
    const el = dialogRef.current;
    if (!el || !locked) return undefined;
    if (!el.open) el.showModal();
    return undefined;
  }, [locked]);

  if (!locked) return null;

  const isChoosingFree = fetcher.state !== "idle";

  return (
    <dialog
      ref={dialogRef}
      className="premium-trial-lock-dialog"
      aria-labelledby="premium-trial-lock-title"
      aria-modal="true"
      onCancel={(e) => e.preventDefault()}
    >
      <style>{`
        .premium-trial-lock-dialog {
          border: none;
          border-radius: 14px;
          padding: 0;
          max-width: 640px;
          width: calc(100% - 32px);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
          z-index: 10001;
        }
        .premium-trial-lock-dialog::backdrop {
          background: rgba(15, 23, 42, 0.55);
        }
        .premium-trial-lock-inner {
          padding: 24px 22px 22px;
        }
        .premium-trial-lock-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 650;
          color: #0f172a;
        }
        .premium-trial-lock-body {
          margin: 0 0 18px;
          font-size: 14px;
          line-height: 1.55;
          color: #475569;
        }
        .premium-trial-lock-plans {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: stretch;
        }
        .premium-trial-lock-plan {
          flex: 1 1 240px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 16px;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .premium-trial-lock-plan--premium {
          border: 2px solid rgb(0 123 96);
          background: rgb(0 123 96 / 4%);
        }
        .premium-trial-lock-plan-name {
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 650;
          color: #0f172a;
        }
        .premium-trial-lock-plan-price {
          margin: 0 0 10px;
          font-size: 0.85rem;
          color: #64748b;
        }
        .premium-trial-lock-plan-features {
          margin: 0 0 14px;
          padding-left: 18px;
          font-size: 0.8rem;
          color: #334155;
          line-height: 1.45;
          flex: 1;
        }
        .premium-trial-lock-plan-features li {
          margin-bottom: 4px;
        }
        .premium-trial-lock-plan-action {
          margin-top: auto;
        }
      `}</style>
      <div className="premium-trial-lock-inner">
        <h2 id="premium-trial-lock-title" className="premium-trial-lock-title">
          Your trial has ended
        </h2>
        <p className="premium-trial-lock-body">{trialLockModalMessage()}</p>
        <div className="premium-trial-lock-plans">
          <div className="premium-trial-lock-plan">
            <h3 className="premium-trial-lock-plan-name">{freePlan?.name ?? "Free"} plan</h3>
            <p className="premium-trial-lock-plan-price">
              {freePlan?.priceLabel ?? "$0"} {freePlan?.intervalLabel ?? "forever"}
            </p>
            <ul className="premium-trial-lock-plan-features">
              {(freePlan?.features ?? []).slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="premium-trial-lock-plan-action">
              <fetcher.Form method="post" action={withShopifyParams(formAction)}>
                <input type="hidden" name="intent" value="choose-free-plan" />
                <s-button type="submit" variant="secondary" disabled={isChoosingFree}>
                  Continue on Free plan
                </s-button>
              </fetcher.Form>
            </div>
          </div>
          <div className="premium-trial-lock-plan premium-trial-lock-plan--premium">
            <h3 className="premium-trial-lock-plan-name">
              {premiumPlan?.name ?? "Premium"} plan
            </h3>
            <p className="premium-trial-lock-plan-price">
              ${premiumPriceUsd}/mo — your {getPremiumTrialDays()}-day trial has been used
            </p>
            <ul className="premium-trial-lock-plan-features">
              {(premiumPlan?.features ?? []).slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="premium-trial-lock-plan-action">
              <Form method="post" action={withShopifyParams(billingPath)}>
                <input type="hidden" name="intent" value="subscribe" />
                <s-button type="submit" variant="primary">
                  Upgrade to Premium — ${premiumPriceUsd}/mo
                </s-button>
              </Form>
            </div>
          </div>
        </div>
        <p className="premium-trial-lock-body" style={{ marginTop: 14, marginBottom: 0, fontSize: 12 }}>
          {TRIAL_LOCK_MESSAGE}
        </p>
      </div>
    </dialog>
  );
}
