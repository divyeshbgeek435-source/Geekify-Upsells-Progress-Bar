import { useEffect, useRef } from "react";
import {
  DISC_LIVE_BADGE_SHAPE,
  PROGRESS_OVERLAY_KEYS,
  mergeProgressBarDesign,
  sanitizeProgressBarDesignForDb,
} from "../lib/progress-bar-design.js";

export { DISC_LIVE_BADGE_SHAPE, PROGRESS_OVERLAY_KEYS, mergeProgressBarDesign, sanitizeProgressBarDesignForDb };

function clampPct(n, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, x));
}

/** Format a numeric amount using the shop's billing currency (Admin `shop.currencyCode`). */
function formatDiscShopMoney(amount, currencyCode) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  const code = String(currencyCode || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return Number.isInteger(n) ? `${code} ${n}` : `${code} ${n.toFixed(2)}`;
  }
}

export function resolveSequentialBarColors(barStyle, barFillColor, barTrackColor, tier1Complete, tier2Complete) {
  const bs = barStyle && typeof barStyle === "object" ? barStyle : {};
  const t1b = bs.tier1?.before || {};
  const t1a = bs.tier1?.after || {};
  const t2b = bs.tier2?.before || {};
  const t2a = bs.tier2?.after || {};
  let fill = barFillColor;
  let track = barTrackColor;
  if (!tier1Complete) {
    if (t1b.barFill) fill = t1b.barFill;
    if (t1b.barTrack) track = t1b.barTrack;
  } else if (!tier2Complete) {
    if (t2b.barFill) fill = t2b.barFill;
    else if (t1a.barFill) fill = t1a.barFill;
    if (t2b.barTrack) track = t2b.barTrack;
    else if (t1a.barTrack) track = t1a.barTrack;
  } else {
    if (t2a.barFill) fill = t2a.barFill;
    if (t2a.barTrack) track = t2a.barTrack;
  }
  return { fill, track };
}

export function DiscAdvancedLiveWidget({
  showHeading,
  sequentialTitle,
  headingColor,
  showSubheading,
  subheadingColor,
  liveProgress,
  sequentialMsg0,
  sequentialMsg1,
  sequentialMsg2,
  barFillColor,
  barTrackColor,
  showTierIcons,
  tier1Icon,
  tier2Icon,
  showTierLabels = true,
  showTier1Heading = true,
  showTier2Heading = true,
  tier1LabelText,
  tier2LabelText,
  tierHeadingColor,
  showTierMinimums,
  minAmountPrefixText,
  liveTier1Min,
  liveTier2Min,
  shopCurrencyCode = "USD",
  showHint,
  hintColor,
  subtotalLabel,
  livePreviewSubtotal,
  estimatedShippingLabel,
  liveHintText,
  liveWidgetBg,
  liveWidgetText,
  liveWidgetBorder,
  progressBarDesign = mergeProgressBarDesign(null),
  onProgressBarDesignPatch,
  interactivePreview = false,
  overlayEditKey = "tierBefore",
  onOverlayEditKeyChange,
}) {
  const hasTwoTiers = liveTier2Min > 0;
  const tier1RatioPct =
    hasTwoTiers
      ? Math.max(0, Math.min(100, Math.round((liveTier1Min / liveTier2Min) * 100)))
      : 50;

  const tier1Complete = liveProgress >= tier1RatioPct;
  const tier2Complete = liveProgress >= 100;

  const tier2Display =
    String(tier2Icon || "").trim().toLowerCase() === "truck" ? "🚚" : tier2Icon || "🚚";
  const tier1Display =
    String(tier1Icon || "").trim().toLowerCase() === "truck" ? "🚚" : tier1Icon || "%";

  const bs = progressBarDesign.barStyle || {};
  const { fill: resolvedBarFill, track: resolvedBarTrack } = resolveSequentialBarColors(
    progressBarDesign.barStyle, barFillColor, barTrackColor, tier1Complete, tier2Complete,
  );

  const p1 = tier1Complete ? bs.tier1?.after : bs.tier1?.before;
  const p2 = tier2Complete ? bs.tier2?.after : bs.tier2?.before;
  const badgeSize = Number(bs.badgeSizePx) > 0 ? Number(bs.badgeSizePx) : 46;
  const barH = Number(bs.barHeightPx) > 0 ? Number(bs.barHeightPx) : 10;
  const br = Number(bs.barBorderRadiusPx) >= 0 ? Number(bs.barBorderRadiusPx) : 999;
  const capGap = Number(bs.captionGapPx) >= 0 ? Number(bs.captionGapPx) : 18;
  const transMs = Number(bs.transitionMs) >= 0 ? Number(bs.transitionMs) : 280;
  const hoverSc = Number(bs.badgeHoverScalePercent) >= 100 ? Number(bs.badgeHoverScalePercent) / 100 : 1.04;
  const barMax = Number(bs.barMaxWidthPx) > 0 ? `${bs.barMaxWidthPx}px` : "100%";
  const mt = Number(bs.barSectionMarginTopPx) >= 0 ? bs.barSectionMarginTopPx : 30;

  const barInset = Math.ceil(badgeSize / 2) + 4;
  const brStr = br >= 999 ? "999px" : `${br}px`;

  const badgeStyle = (phase) => ({
    width: badgeSize,
    height: badgeSize,
    background: phase?.badgeBackgroundColor || "#c3bbbb",
    color: phase?.iconColor || "#000000",
    border: "none",
    boxShadow: phase?.badgeShadow || "none",
    fontSize: phase?.iconSizePx ? `${phase.iconSizePx}px` : `${Math.max(12, Math.round(badgeSize * 0.33))}px`,
    transition: `background ${transMs}ms ease, color ${transMs}ms ease, box-shadow ${transMs}ms ease, transform 0.2s ease`,
  });

  const labelCol = (phase) => phase?.labelColor || tierHeadingColor;
  const priceCol = (phase) => phase?.priceLabelColor || "#6b7280";

  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!interactivePreview || !onProgressBarDesignPatch) return undefined;
    const onMove = (ev) => {
      const d = dragRef.current;
      const el = canvasRef.current;
      if (!d || !el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      const dx = ((ev.clientX - d.startClientX) / w) * 100;
      const dy = ((ev.clientY - d.startClientY) / h) * 100;
      onProgressBarDesignPatch(d.key, {
        xPercent: clampPct(d.originX + dx, 50),
        yPercent: clampPct(d.originY + dy, 50),
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [interactivePreview, onProgressBarDesignPatch]);

  const startOverlayDrag = (key, ev) => {
    if (!interactivePreview || !onProgressBarDesignPatch) return;
    ev.preventDefault();
    onOverlayEditKeyChange?.(key);
    const L = progressBarDesign[key];
    dragRef.current = {
      key,
      startClientX: ev.clientX,
      startClientY: ev.clientY,
      originX: clampPct(L?.xPercent, 50),
      originY: clampPct(L?.yPercent, 50),
    };
  };

  const min1 = `${minAmountPrefixText || "Min."} ${formatDiscShopMoney(liveTier1Min || 0, shopCurrencyCode)}`.trim();
  const min2 = `${minAmountPrefixText || "Min."} ${formatDiscShopMoney(liveTier2Min || 0, shopCurrencyCode)}`.trim();

  const badge1Left = hasTwoTiers ? `${tier1RatioPct}%` : "100%";
  const badge2Left = "100%";

  return (
    <div
      className="disc-live-widget"
      style={{
        background: liveWidgetBg,
        color: liveWidgetText,
        borderColor: liveWidgetBorder,
        borderRadius: 12,
        border: "1px solid",
        padding: "12px 14px",
        overflow: "visible",
      }}
    >
      <div ref={canvasRef} className="disc-live-front-canvas">
        {showHeading ? (
          <div className="disc-live-widget-title" style={{ color: headingColor }}>
            {sequentialTitle || "Rewards progress"}
          </div>
        ) : null}

        {showSubheading ? (
          <div className="disc-live-widget-subtitle" style={{ color: subheadingColor }}>
            {liveProgress === 0 ? sequentialMsg0 : liveProgress === 50 ? sequentialMsg1 : sequentialMsg2}
          </div>
        ) : null}

        {/* Bar + badges + captions - shared horizontal inset so % positions match */}
        <div className="disc-live-progress-rail" style={{ maxWidth: barMax, margin: "0 auto" }}>
          <div
            className="disc-live-bar-zone"
            style={{
              position: "relative",
              marginLeft: barInset,
              marginRight: barInset,
              marginTop: mt,
              marginBottom: 0,
              height: badgeSize,
            }}
          >
            {/* Track */}
            <div
              className="disc-live-bar-track"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                height: barH,
                borderRadius: brStr,
                background: resolvedBarTrack,
                overflow: "hidden",
                transition: `background ${transMs}ms ease`,
              }}
            >
              <div
                className="disc-live-bar-fill"
                style={{
                  height: "100%",
                  width: `${liveProgress > 0 ? Math.max(liveProgress, 2) : 0}%`,
                  background: resolvedBarFill,
                  borderRadius: brStr,
                  transition: `width ${transMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              />
            </div>

            {/* Tier 1 badge */}
            <div
              className="disc-live-badge"
              style={{
                position: "absolute",
                top: "50%",
                left: badge1Left,
                transform: "translate(-50%, -50%)",
                display: showTierIcons ? "inline-flex" : "none",
                ...badgeStyle(p1),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translate(-50%, -50%) scale(${hoverSc})`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
              }}
            >
              {tier1Display}
            </div>

            {/* Tier 2 badge */}
            {hasTwoTiers ? (
              <div
                className="disc-live-badge"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: badge2Left,
                  transform: "translate(-50%, -50%)",
                  display: showTierIcons ? "inline-flex" : "none",
                  ...badgeStyle(p2),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = `translate(-50%, -50%) scale(${hoverSc})`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                }}
              >
                {tier2Display}
              </div>
            ) : null}
          </div>

          {/* Captions - same inset as bar zone for identical % positioning */}
          <div
            className="disc-live-tier-captions-rail"
            style={{
              position: "relative",
              marginLeft: barInset,
              marginRight: barInset,
              marginTop: capGap,
              minHeight: 36,
            }}
          >
            {/* Tier 1 caption */}
            <div
              className="disc-live-tier-cap"
              style={{
                position: "absolute",
                top: 0,
                left: badge1Left,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{
                fontWeight: 700,
                fontSize: 12,
                color: labelCol(p1),
                visibility: showTierLabels && showTier1Heading ? "visible" : "hidden",
                lineHeight: 1.3,
                width: "100%",
                textAlign: "center",
              }}>
                {tier1LabelText || "Tier 1"}
              </div>
              <div style={{
                fontWeight: 500,
                fontSize: 11,
                color: priceCol(p1),
                marginTop: 2,
                visibility: showTierMinimums ? "visible" : "hidden",
                lineHeight: 1.35,
                width: "100%",
                textAlign: "center",
              }}>
                {min1}
              </div>
            </div>

            {/* Tier 2 caption */}
            {hasTwoTiers ? (
              <div
                className="disc-live-tier-cap"
                style={{
                  position: "absolute",
                  top: 0,
                  left: badge2Left,
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: labelCol(p2),
                  visibility: showTierLabels && showTier2Heading ? "visible" : "hidden",
                  lineHeight: 1.3,
                  width: "100%",
                  textAlign: "center",
                }}>
                  {tier2LabelText || "Tier 2"}
                </div>
                <div style={{
                  fontWeight: 500,
                  fontSize: 11,
                  color: priceCol(p2),
                  marginTop: 2,
                  visibility: showTierMinimums ? "visible" : "hidden",
                  lineHeight: 1.35,
                  width: "100%",
                  textAlign: "center",
                }}>
                  {min2}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <hr className="disc-live-divider" />
        {showHint ? (
          <div className="disc-live-hint" style={{ color: hintColor }}>
            {`${subtotalLabel || "Current subtotal"}: ${formatDiscShopMoney(livePreviewSubtotal, shopCurrencyCode)} (${estimatedShippingLabel || "Estimated shipping"}: ${formatDiscShopMoney(0, shopCurrencyCode)}) - ${liveHintText}`}
          </div>
        ) : null}

        {/* {interactivePreview
          ? PROGRESS_OVERLAY_KEYS.map((key) => {
              const L = progressBarDesign[key];
              if (!L?.visible) return null;
              const active = overlayEditKey === key;
              const sc = (Number(L.scalePercent) || 100) / 100;
              return (
                <div
                  key={key}
                  className={`disc-live-overlay-chip${active ? " disc-live-overlay-chip-active" : ""}`}
                  style={{
                    left: `${clampPct(L.xPercent, 50)}%`,
                    top: `${clampPct(L.yPercent, 50)}%`,
                    transform: `translate(-50%, -50%) scale(${sc})`,
                    background: L.backgroundColor,
                    color: L.textColor,
                  }}
                  role="presentation"
                  onPointerDown={(e) => startOverlayDrag(key, e)}
                >
                  {L.imageDataUrl ? (
                    <img src={L.imageDataUrl} alt="" className="disc-live-overlay-chip-img" />
                  ) : null}
                  <span className="disc-live-overlay-chip-label">{L.label || key}</span>
                </div>
              );
            })
          : null} */}
      </div>
    </div>
  );
}
