import { defaultBarStyle } from "../lib/progress-bar-design.js";

function ColorCell({ value, fallback, onChange }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(value)) ? value : fallback;
  return (
    <div className="disc-tier-cell">
      <input
        type="color"
        className="disc-tier-swatch"
        value={hex}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
      <input
        type="text"
        className="disc-tier-hex"
        placeholder="inherit"
        value={value || ""}
        onChange={(e) => onChange(e.currentTarget.value.trim())}
      />
    </div>
  );
}

function NumCell({ value, fallback, min, max, onChange }) {
  return (
    <div className="disc-tier-cell">
      <input
        type="number"
        className="disc-tier-num"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.currentTarget.value) || fallback)}
      />
    </div>
  );
}

function ShadowCell({ value, onChange }) {
  return (
    <div className="disc-tier-cell disc-tier-cell--wide">
      <input
        type="text"
        className="disc-tier-shadow"
        value={value || ""}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="CSS box-shadow"
      />
    </div>
  );
}

const TIER_ROWS = [
  { key: "barFill",             label: "Bar fill",     type: "color",  fallback: "#000000" },
  { key: "barTrack",            label: "Bar track",    type: "color",  fallback: "#e5e7eb" },
  { key: "badgeBackgroundColor", label: "Badge bg",     type: "color",  fallback: "#ffffff" },
  { key: "badgeBorderColor",    label: "Badge border", type: "color",  fallback: "#000000" },
  { key: "iconColor",           label: "Icon color",   type: "color",  fallback: "#000000" },
  // { key: "badgeShadow",         label: "Badge shadow", type: "shadow" },
  { key: "labelColor",          label: "Label color",  type: "color",  fallback: "#111827" },
  { key: "priceLabelColor",     label: "Price color",  type: "color",  fallback: "#6b7280" },
  { key: "iconSizePx",          label: "Icon size",    type: "number", fallback: 15, min: 8, max: 32 },

];

function TierComparisonTable({ tier, tierLabel, beforeData, afterData, onPatch, onCopyTier1 }) {
  const b = beforeData || {};
  const a = afterData || {};
  return (
    <div className="disc-tier-table-wrap">
      <div className="disc-tier-table-head">
        <div className="disc-tier-table-title">{tierLabel}</div>
        {onCopyTier1 && (
          <button type="button" className="disc-copy-tier1-btn" onClick={onCopyTier1}>
            Copy Tier 1 colors
          </button>
        )}
      </div>
      <div className="disc-tier-table" role="table">
        <div className="disc-tier-table-header" role="row">
          <div className="disc-tier-table-th disc-tier-table-th--label" role="columnheader">Property</div>
          <div className="disc-tier-table-th" role="columnheader">Before</div>
          <div className="disc-tier-table-th" role="columnheader">After</div>
        </div>
        {TIER_ROWS.map((row) => (
          <div className="disc-tier-table-row" role="row" key={row.key}>
            <div className="disc-tier-table-td disc-tier-table-td--label" role="cell">{row.label}</div>
            <div className="disc-tier-table-td" role="cell">
              {row.type === "color" ? (
                <ColorCell value={b[row.key]} fallback={row.fallback} onChange={(v) => onPatch(tier, "before", { [row.key]: v })} />
              ) : row.type === "number" ? (
                <NumCell value={b[row.key]} fallback={row.fallback} min={row.min} max={row.max} onChange={(v) => onPatch(tier, "before", { [row.key]: v })} />
              ) : (
                <ShadowCell value={b[row.key]} onChange={(v) => onPatch(tier, "before", { [row.key]: v })} />
              )}
            </div>
            <div className="disc-tier-table-td" role="cell">
              {row.type === "color" ? (
                <ColorCell value={a[row.key]} fallback={row.fallback} onChange={(v) => onPatch(tier, "after", { [row.key]: v })} />
              ) : row.type === "number" ? (
                <NumCell value={a[row.key]} fallback={row.fallback} min={row.min} max={row.max} onChange={(v) => onPatch(tier, "after", { [row.key]: v })} />
              ) : (
                <ShadowCell value={a[row.key]} onChange={(v) => onPatch(tier, "after", { [row.key]: v })} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBarStyleEditor({ barStyle, onPatchRoot, onPatchPhase, onResetDefaults }) {
  const bs = barStyle && typeof barStyle === "object" ? barStyle : defaultBarStyle();

  const copyTier1ToTier2 = () => {
    const t1b = bs.tier1?.before || {};
    const t1a = bs.tier1?.after || {};
    const beforePatch = {};
    const afterPatch = {};
    TIER_ROWS.forEach((row) => {
      if (t1b[row.key] != null) beforePatch[row.key] = t1b[row.key];
      if (t1a[row.key] != null) afterPatch[row.key] = t1a[row.key];
    });
    onPatchPhase("tier2", "before", beforePatch);
    onPatchPhase("tier2", "after", afterPatch);
  };

  return (
    <div className="disc-bar-style-editor">
      <div className="disc-bar-style-editor-head">
        <span className="disc-bar-style-editor-title">Progress bar and badges</span>
        <button type="button" className="disc-close-btn disc-bar-style-reset" onClick={onResetDefaults}>
          Reset defaults
        </button>
      </div>
      <p className="disc-bar-style-editor-help">
        Horizontal bar with scalloped tier badges. "Before" applies until the shopper reaches a tier "After" once reached.
      </p>

      <div className="disc-bar-style-global">
        <div className="disc-bar-style-phase-title">Layout and motion</div>
        <div className="disc-layout-grid">
          <label className="disc-layout-field">
            <span>Bar height</span>
            <input type="number" min={4} max={24} className="disc-layout-input" value={bs.barHeightPx ?? 10} onChange={(e) => onPatchRoot({ barHeightPx: Number(e.currentTarget.value) || 10 })} />
            <span className="disc-layout-unit">px</span>
          </label>
          <label className="disc-layout-field">
            <span>Bar radius</span>
            <input type="number" min={0} max={999} className="disc-layout-input" value={bs.barBorderRadiusPx ?? 999} onChange={(e) => onPatchRoot({ barBorderRadiusPx: Number(e.currentTarget.value) ?? 999 })} />
            <span className="disc-layout-unit">px</span>
          </label>
          <label className="disc-layout-field">
            <span>Margin top</span>
            <input type="number" min={8} max={80} className="disc-layout-input" value={bs.barSectionMarginTopPx ?? 30} onChange={(e) => onPatchRoot({ barSectionMarginTopPx: Number(e.currentTarget.value) || 30 })} />
            <span className="disc-layout-unit">px</span>
          </label>
          <label className="disc-layout-field">
            <span>Badge size</span>
            <input type="number" min={28} max={72} className="disc-layout-input" value={bs.badgeSizePx ?? 46} onChange={(e) => onPatchRoot({ badgeSizePx: Number(e.currentTarget.value) || 46 })} />
            <span className="disc-layout-unit">px</span>
          </label>
          <label className="disc-layout-field">
            <span>Caption gap</span>
            <input type="number" min={0} max={28} className="disc-layout-input" value={bs.captionGapPx ?? 8} onChange={(e) => onPatchRoot({ captionGapPx: Number(e.currentTarget.value) || 8 })} />
            <span className="disc-layout-unit">px</span>
          </label>
          <label className="disc-layout-field">
            <span>Transition</span>
            <input type="number" min={0} max={1200} className="disc-layout-input" value={bs.transitionMs ?? 280} onChange={(e) => onPatchRoot({ transitionMs: Number(e.currentTarget.value) || 280 })} />
            <span className="disc-layout-unit">ms</span>
          </label>
          <label className="disc-layout-field">
            <span>Hover scale</span>
            <input type="number" min={100} max={130} className="disc-layout-input" value={bs.badgeHoverScalePercent ?? 104} onChange={(e) => onPatchRoot({ badgeHoverScalePercent: Number(e.currentTarget.value) || 104 })} />
            <span className="disc-layout-unit">%</span>
          </label>
        </div>
      </div>

      <TierComparisonTable
        tier="tier1"
        tierLabel="Tier 1 - Discount"
        beforeData={bs.tier1?.before}
        afterData={bs.tier1?.after}
        onPatch={onPatchPhase}
      />
      <TierComparisonTable
        tier="tier2"
        tierLabel="Tier 2 - Free Shipping"
        beforeData={bs.tier2?.before}
        afterData={bs.tier2?.after}
        onPatch={onPatchPhase}
        onCopyTier1={copyTier1ToTier2}
      />
    </div>
  );
}
