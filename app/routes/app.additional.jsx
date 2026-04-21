import { useEffect, useMemo, useState } from "react";
import { Form, useActionData, useLoaderData, useOutletContext } from "react-router";
import {
  defaultAdditionalConfig,
  parseAdditionalConfig,
  resolveSectionId,
} from "../lib/additional-ui-config.js";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const ADDITIONAL_UI_BAR_TYPE = "additional_ui";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const row = await prisma.announcementBar.findFirst({
    where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
    orderBy: { updatedAt: "desc" },
    select: { id: true, configJson: true, updatedAt: true },
  });
  const raw = row ? parseAdditionalConfig(row.configJson) : defaultAdditionalConfig();
  const config = row ? { ...raw, sectionId: resolveSectionId(raw, row.id) } : raw;
  return {
    config,
    savedId: row?.id ?? null,
    savedAt: row?.updatedAt?.toISOString?.() || null,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  if (intent !== "save") {
    return { ok: false, error: "Unknown action." };
  }

  let messagesPosted = [];
  try {
    messagesPosted = JSON.parse(String(form.get("messagesJson") || "[]"));
  } catch {
    messagesPosted = [];
  }
  if (!Array.isArray(messagesPosted)) messagesPosted = [];

  const config = parseAdditionalConfig(
    JSON.stringify({
      sectionId: String(form.get("sectionId") || "").trim(),
      displayMode: String(form.get("displayMode") || "stack"),
      rotateIntervalMs: Number(form.get("rotateIntervalMs") || 3000),
      rotateDirection: String(form.get("rotateDirection") || "forward"),
      rotateAutoplay: form.get("rotateAutoplay") !== "false",
      rotatePauseOnHover: form.get("rotatePauseOnHover") !== "false",
      marqueeDurationSeconds: Number(form.get("marqueeDurationSeconds") || 18),
      marqueeDirection: String(form.get("marqueeDirection") || "rtl"),
      marqueeSeparator: String(form.get("marqueeSeparator") || "•"),
      marqueeSeparatorRepeat: Number(form.get("marqueeSeparatorRepeat") || 1),
      marqueeTrailingSeparator: form.get("marqueeTrailingSeparator") !== "false",
      gapPx: Number(form.get("gapPx") || 24),
      fontSizePx: Number(form.get("fontSizePx") || 22),
      paddingYpx: Number(form.get("paddingYpx") || 14),
      paddingXpx: Number(form.get("paddingXpx") || 16),
      backgroundColor: String(form.get("backgroundColor") || "#b8f441"),
      textColor: String(form.get("textColor") || "#0f172a"),
      messages: messagesPosted,
    }),
  );

  const configJson = JSON.stringify(config);
  const existing = await prisma.announcementBar.findFirst({
    where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.announcementBar.update({
      where: { id: existing.id },
      data: {
        name: "Additional UI Block",
        barType: ADDITIONAL_UI_BAR_TYPE,
        configJson,
        active: false,
      },
      select: { id: true, updatedAt: true },
    });
    return {
      ok: true,
      savedId: updated.id,
      savedAt: updated.updatedAt.toISOString(),
    };
  }

  const created = await prisma.announcementBar.create({
    data: {
      shop,
      name: "Additional UI Block",
      barType: ADDITIONAL_UI_BAR_TYPE,
      configJson,
      active: false,
      customHtml: "",
      customLiquid: "",
      customCss: "",
    },
    select: { id: true, updatedAt: true },
  });
  return {
    ok: true,
    savedId: created.id,
    savedAt: created.updatedAt.toISOString(),
  };
};

export default function AdditionalPage() {
  const { config: loadedConfig, savedAt: loadedSavedAt } = useLoaderData();
  const actionData = useActionData();
  const { onboarding } = useOutletContext() || {};
  const [messages, setMessages] = useState(loadedConfig.messages);
  const [sectionId, setSectionId] = useState(loadedConfig.sectionId || "");
  const [displayMode, setDisplayMode] = useState(loadedConfig.displayMode || "stack");
  const [rotateIntervalMs, setRotateIntervalMs] = useState(loadedConfig.rotateIntervalMs || 3000);
  const [rotateDirection, setRotateDirection] = useState(loadedConfig.rotateDirection || "forward");
  const [rotateAutoplay, setRotateAutoplay] = useState(loadedConfig.rotateAutoplay !== false);
  const [rotatePauseOnHover, setRotatePauseOnHover] = useState(loadedConfig.rotatePauseOnHover !== false);
  const [marqueeDurationSeconds, setMarqueeDurationSeconds] = useState(
    loadedConfig.marqueeDurationSeconds || 18,
  );
  const [marqueeDirection, setMarqueeDirection] = useState(loadedConfig.marqueeDirection || "rtl");
  const [marqueeSeparator, setMarqueeSeparator] = useState(loadedConfig.marqueeSeparator || "•");
  const [marqueeSeparatorRepeat, setMarqueeSeparatorRepeat] = useState(
    loadedConfig.marqueeSeparatorRepeat || 1,
  );
  const [marqueeTrailingSeparator, setMarqueeTrailingSeparator] = useState(
    loadedConfig.marqueeTrailingSeparator !== false,
  );
  const [gapPx, setGapPx] = useState(loadedConfig.gapPx);
  const [fontSizePx, setFontSizePx] = useState(loadedConfig.fontSizePx);
  const [paddingYpx, setPaddingYpx] = useState(loadedConfig.paddingYpx);
  const [paddingXpx, setPaddingXpx] = useState(loadedConfig.paddingXpx);
  const [backgroundColor, setBackgroundColor] = useState(loadedConfig.backgroundColor);
  const [textColor, setTextColor] = useState(loadedConfig.textColor);

  const itemStyle = useMemo(
    () => ({
      fontWeight: 800,
      fontSize: `${fontSizePx}px`,
      lineHeight: 1.2,
      color: textColor,
      whiteSpace: "nowrap",
      width: "fit-content",
      maxWidth: "100%",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    }),
    [fontSizePx, textColor],
  );

  const lineTexts = useMemo(
    () => messages.map((m) => String(m ?? "").trim()).filter(Boolean),
    [messages],
  );

  const handleMessageChange = (idx, value) => {
    setMessages((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addLine = () => setMessages((prev) => [...prev, "NEW OFFER"]);
  const removeLast = () =>
    setMessages((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  const [rotIdx, setRotIdx] = useState(0);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);

  useEffect(() => {
    setRotIdx(0);
  }, [messages, displayMode]);

  useEffect(() => {
    if (displayMode !== "rotate" || lineTexts.length <= 1 || !rotateAutoplay) return undefined;
    if (rotatePauseOnHover && isPreviewHovered) return undefined;
    const t = setInterval(() => {
      setRotIdx((i) =>
        rotateDirection === "backward"
          ? (i - 1 + lineTexts.length) % lineTexts.length
          : (i + 1) % lineTexts.length,
      );
    }, Math.max(1000, rotateIntervalMs || 3000));
    return () => clearInterval(t);
  }, [
    displayMode,
    lineTexts,
    rotateIntervalMs,
    rotateDirection,
    rotateAutoplay,
    rotatePauseOnHover,
    isPreviewHovered,
  ]);

  return (
    <s-page heading="Announcement UI playground">
      <s-stack direction="block" gap="base">
          {!onboarding?.clientIdConfigured ? (
            <s-paragraph>
              <s-text tone="critical">
                Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> to enable direct "add block" deep links.
              </s-text>
            </s-paragraph>
          ) : null}
          {actionData?.ok ? (
            <s-banner tone="success" heading="Saved to Prisma">
              Saved at {new Date(actionData.savedAt || Date.now()).toLocaleString()}.
            </s-banner>
          ) : null}
          {actionData?.ok === false && actionData?.error ? (
            <s-banner tone="critical" heading="Save failed">
              {actionData.error}
            </s-banner>
          ) : null}
          {!actionData?.ok && loadedSavedAt ? (
            <s-paragraph>
              <s-text tone="subdued">
                Last saved at {new Date(loadedSavedAt).toLocaleString()}.
              </s-text>
            </s-paragraph>
          ) : null}

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Live preview</s-text>
              <div
                style={{
                  width: "100%",
                  background: backgroundColor,
                  borderRadius: 8,
                  padding: `${paddingYpx}px ${paddingXpx}px`,
                  boxSizing: "border-box",
                  overflowX: "auto",
                }}
                onMouseEnter={() => setIsPreviewHovered(true)}
                onMouseLeave={() => setIsPreviewHovered(false)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: `${gapPx}px`,
                    minWidth: "max-content",
                  }}
                >
                  {displayMode === "marquee" ? (
                    <div style={{ overflow: "hidden", width: "100%" }}>
                      {(() => {
                        const cleaned = lineTexts;
                        const sepToken = String(marqueeSeparator || "•").repeat(
                          Math.max(1, marqueeSeparatorRepeat),
                        );
                        const sep = ` ${sepToken} `;
                        const baseText = cleaned.join(sep);
                        const loopText = marqueeTrailingSeparator ? `${baseText}${sep}` : baseText;
                        return (
                      <div
                        style={{
                          display: "inline-flex",
                          whiteSpace: "nowrap",
                          gap: 0,
                          animation: `sceAdditionalPreviewMarquee ${marqueeDurationSeconds}s linear infinite`,
                          animationDirection: marqueeDirection === "ltr" ? "reverse" : "normal",
                        }}
                      >
                        <span style={itemStyle}>{loopText}</span>
                        <span style={itemStyle}>{loopText}</span>
                      </div>
                        );
                      })()}
                    </div>
                  ) : displayMode === "rotate" ? (
                    <span style={itemStyle}>
                      {lineTexts[rotIdx] || ""}
                    </span>
                  ) : (
                    lineTexts.map((msg, i) => (
                      <span key={i} style={itemStyle}>
                        {msg}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </s-stack>
          </s-box>

          <s-grid gridTemplateColumns="repeat(2, minmax(220px, 1fr))" gap="base">
            <s-select
              label="Display mode"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target?.value ?? "stack")}
            >
              <s-option value="stack">Normal</s-option>
              <s-option value="rotate">Rotate</s-option>
              <s-option value="marquee">Marquee</s-option>
            </s-select>
            <s-text-field
              label="Rotate interval (ms)"
              type="number"
              min={1000}
              max={10000}
              value={String(rotateIntervalMs)}
              onChange={(e) => setRotateIntervalMs(Math.max(1000, Number(e.currentTarget.value) || 1000))}
            />
            <s-select
              label="Rotate direction"
              value={rotateDirection}
              onChange={(e) => setRotateDirection(e.target?.value ?? "forward")}
            >
              <s-option value="forward">Forward</s-option>
              <s-option value="backward">Backward</s-option>
            </s-select>
            <s-checkbox
              label="Rotate autoplay"
              checked={rotateAutoplay}
              onChange={(e) => setRotateAutoplay(e.target?.checked ?? false)}
            />
            <s-checkbox
              label="Pause rotate on hover"
              checked={rotatePauseOnHover}
              onChange={(e) => setRotatePauseOnHover(e.target?.checked ?? false)}
            />
            <s-text-field
              label="Marquee duration (seconds)"
              type="number"
              min={4}
              max={120}
              value={String(marqueeDurationSeconds)}
              onChange={(e) =>
                setMarqueeDurationSeconds(Math.max(4, Number(e.currentTarget.value) || 4))
              }
            />
            <s-select
              label="Marquee direction"
              value={marqueeDirection}
              onChange={(e) => setMarqueeDirection(e.target?.value ?? "rtl")}
            >
              <s-option value="rtl">Right to left</s-option>
              <s-option value="ltr">Left to right</s-option>
            </s-select>
            <s-text-field
              label="Marquee separator symbol"
              value={marqueeSeparator}
              onChange={(e) => setMarqueeSeparator(e.currentTarget.value || "•")}
            />
            <s-text-field
              label="Separator repeat count"
              type="number"
              min={1}
              max={6}
              value={String(marqueeSeparatorRepeat)}
              onChange={(e) =>
                setMarqueeSeparatorRepeat(
                  Math.max(1, Math.min(6, Number(e.currentTarget.value) || 1)),
                )
              }
            />
            <s-checkbox
              label="Add separator at end before loop"
              checked={marqueeTrailingSeparator}
              onChange={(e) => setMarqueeTrailingSeparator(e.target?.checked ?? false)}
            />
            <s-text-field
              label="Gap between items (px)"
              type="number"
              min={8}
              max={64}
              value={String(gapPx)}
              onChange={(e) => setGapPx(Math.max(8, Number(e.currentTarget.value) || 8))}
            />
            <s-text-field
              label="Font size (px)"
              type="number"
              min={12}
              max={48}
              value={String(fontSizePx)}
              onChange={(e) => setFontSizePx(Math.max(12, Number(e.currentTarget.value) || 12))}
            />
            <s-text-field
              label="Padding Y (px)"
              type="number"
              min={0}
              max={48}
              value={String(paddingYpx)}
              onChange={(e) => setPaddingYpx(Math.max(0, Number(e.currentTarget.value) || 0))}
            />
            <s-text-field
              label="Padding X (px)"
              type="number"
              min={0}
              max={64}
              value={String(paddingXpx)}
              onChange={(e) => setPaddingXpx(Math.max(0, Number(e.currentTarget.value) || 0))}
            />
            <s-text-field
              label="Background color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.currentTarget.value || "#b8f441")}
            />
            <s-text-field
              label="Text color"
              value={textColor}
              onChange={(e) => setTextColor(e.currentTarget.value || "#0f172a")}
            />
          </s-grid>

          <s-divider />

          <s-text type="strong">Marquee (single section)</s-text>
          <s-paragraph>
            <s-text tone="subdued">
              One Section ID identifies this whole marquee; all lines below belong to it. In the
              theme editor, paste this same value into the Additional UI bar block — the storefront
              bar only appears after that field is filled and matches this ID.
            </s-text>
          </s-paragraph>
          <s-text-field
            label="Section ID"
            value={sectionId}
            onChange={(e) => setSectionId(e.currentTarget.value)}
            autocomplete="off"
          />

          <s-divider />

          <s-text type="strong">Marquee lines</s-text>
          {messages.map((msg, i) => (
            <s-text-field
              key={i}
              label={`Line ${i + 1}`}
              value={msg}
              onChange={(e) => handleMessageChange(i, e.currentTarget.value)}
              autocomplete="off"
            />
          ))}

          <s-stack direction="inline" gap="small">
            <s-button type="button" variant="secondary" onClick={addLine}>
              Add item
            </s-button>
            <s-button type="button" variant="tertiary" tone="critical" onClick={removeLast}>
              Remove last
            </s-button>
            <Form method="post">
              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="sectionId" value={sectionId} />
              <input type="hidden" name="messagesJson" value={JSON.stringify(messages)} />
              <input type="hidden" name="displayMode" value={displayMode} />
              <input type="hidden" name="rotateIntervalMs" value={String(rotateIntervalMs)} />
              <input type="hidden" name="rotateDirection" value={rotateDirection} />
              <input type="hidden" name="rotateAutoplay" value={rotateAutoplay ? "true" : "false"} />
              <input type="hidden" name="rotatePauseOnHover" value={rotatePauseOnHover ? "true" : "false"} />
              <input
                type="hidden"
                name="marqueeDurationSeconds"
                value={String(marqueeDurationSeconds)}
              />
              <input type="hidden" name="marqueeDirection" value={marqueeDirection} />
              <input type="hidden" name="marqueeSeparator" value={marqueeSeparator} />
              <input
                type="hidden"
                name="marqueeSeparatorRepeat"
                value={String(marqueeSeparatorRepeat)}
              />
              <input
                type="hidden"
                name="marqueeTrailingSeparator"
                value={marqueeTrailingSeparator ? "true" : "false"}
              />
              <input type="hidden" name="gapPx" value={String(gapPx)} />
              <input type="hidden" name="fontSizePx" value={String(fontSizePx)} />
              <input type="hidden" name="paddingYpx" value={String(paddingYpx)} />
              <input type="hidden" name="paddingXpx" value={String(paddingXpx)} />
              <input type="hidden" name="backgroundColor" value={backgroundColor} />
              <input type="hidden" name="textColor" value={textColor} />
              <s-button type="submit" variant="primary">
                Save to Prisma
              </s-button>
            </Form>
          </s-stack>
      </s-stack>
      <style>{`
        @keyframes sceAdditionalPreviewMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </s-page>
  );
}
