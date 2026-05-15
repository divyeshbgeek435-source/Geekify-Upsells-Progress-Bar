// import { useEffect, useMemo, useState } from "react";
// import { Form, useActionData, useLoaderData, useOutletContext } from "react-router";
// import {
//   defaultAdditionalConfig,
//   parseAdditionalConfig,
//   resolveSectionId,
// } from "../lib/additional-ui-config.js";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// const ADDITIONAL_UI_BAR_TYPE = "additional_ui";

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const row = await prisma.announcementBar.findFirst({
//     where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
//     orderBy: { updatedAt: "desc" },
//     select: { id: true, configJson: true, updatedAt: true },
//   });
//   const raw = row ? parseAdditionalConfig(row.configJson) : defaultAdditionalConfig();
//   const config = row ? { ...raw, sectionId: resolveSectionId(raw, row.id) } : raw;
//   return {
//     config,
//     savedId: row?.id ?? null,
//     savedAt: row?.updatedAt?.toISOString?.() || null,
//   };
// };

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   const intent = String(form.get("intent") || "");
//   if (intent !== "save") {
//     return { ok: false, error: "Unknown action." };
//   }

//   let messagesPosted = [];
//   try {
//     messagesPosted = JSON.parse(String(form.get("messagesJson") || "[]"));
//   } catch {
//     messagesPosted = [];
//   }
//   if (!Array.isArray(messagesPosted)) messagesPosted = [];

//   const config = parseAdditionalConfig(
//     JSON.stringify({
//       sectionId: String(form.get("sectionId") || "").trim(),
//       displayMode: String(form.get("displayMode") || "stack"),
//       rotateIntervalMs: Number(form.get("rotateIntervalMs") || 3000),
//       rotateDirection: String(form.get("rotateDirection") || "forward"),
//       rotateAutoplay: form.get("rotateAutoplay") !== "false",
//       rotatePauseOnHover: form.get("rotatePauseOnHover") !== "false",
//       marqueeDurationSeconds: Number(form.get("marqueeDurationSeconds") || 18),
//       marqueeDirection: String(form.get("marqueeDirection") || "rtl"),
//       marqueeSeparator: String(form.get("marqueeSeparator") || "•"),
//       marqueeSeparatorRepeat: Number(form.get("marqueeSeparatorRepeat") || 1),
//       marqueeTrailingSeparator: form.get("marqueeTrailingSeparator") !== "false",
//       gapPx: Number(form.get("gapPx") || 24),
//       fontSizePx: Number(form.get("fontSizePx") || 22),
//       paddingYpx: Number(form.get("paddingYpx") || 14),
//       paddingXpx: Number(form.get("paddingXpx") || 16),
//       backgroundColor: String(form.get("backgroundColor") || "#b8f441"),
//       textColor: String(form.get("textColor") || "#0f172a"),
//       messages: messagesPosted,
//     }),
//   );

//   const configJson = JSON.stringify(config);
//   const existing = await prisma.announcementBar.findFirst({
//     where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
//     select: { id: true },
//   });

//   if (existing) {
//     const updated = await prisma.announcementBar.update({
//       where: { id: existing.id },
//       data: {
//         name: "Additional UI Block",
//         barType: ADDITIONAL_UI_BAR_TYPE,
//         configJson,
//         active: false,
//       },
//       select: { id: true, updatedAt: true },
//     });
//     return {
//       ok: true,
//       savedId: updated.id,
//       savedAt: updated.updatedAt.toISOString(),
//     };
//   }

//   const created = await prisma.announcementBar.create({
//     data: {
//       shop,
//       name: "Additional UI Block",
//       barType: ADDITIONAL_UI_BAR_TYPE,
//       configJson,
//       active: false,
//       customHtml: "",
//       customLiquid: "",
//       customCss: "",
//     },
//     select: { id: true, updatedAt: true },
//   });
//   return {
//     ok: true,
//     savedId: created.id,
//     savedAt: created.updatedAt.toISOString(),
//   };
// };

// export default function AdditionalPage() {
//   const { config: loadedConfig, savedAt: loadedSavedAt } = useLoaderData();
//   const actionData = useActionData();
//   const { onboarding } = useOutletContext() || {};
//   const [messages, setMessages] = useState(loadedConfig.messages);
//   const [sectionId, setSectionId] = useState(loadedConfig.sectionId || "");
//   const [displayMode, setDisplayMode] = useState(loadedConfig.displayMode || "stack");
//   const [rotateIntervalMs, setRotateIntervalMs] = useState(loadedConfig.rotateIntervalMs || 3000);
//   const [rotateDirection, setRotateDirection] = useState(loadedConfig.rotateDirection || "forward");
//   const [rotateAutoplay, setRotateAutoplay] = useState(loadedConfig.rotateAutoplay !== false);
//   const [rotatePauseOnHover, setRotatePauseOnHover] = useState(loadedConfig.rotatePauseOnHover !== false);
//   const [marqueeDurationSeconds, setMarqueeDurationSeconds] = useState(
//     loadedConfig.marqueeDurationSeconds || 18,
//   );
//   const [marqueeDirection, setMarqueeDirection] = useState(loadedConfig.marqueeDirection || "rtl");
//   const [marqueeSeparator, setMarqueeSeparator] = useState(loadedConfig.marqueeSeparator || "•");
//   const [marqueeSeparatorRepeat, setMarqueeSeparatorRepeat] = useState(
//     loadedConfig.marqueeSeparatorRepeat || 1,
//   );
//   const [marqueeTrailingSeparator, setMarqueeTrailingSeparator] = useState(
//     loadedConfig.marqueeTrailingSeparator !== false,
//   );
//   const [gapPx, setGapPx] = useState(loadedConfig.gapPx);
//   const [fontSizePx, setFontSizePx] = useState(loadedConfig.fontSizePx);
//   const [paddingYpx, setPaddingYpx] = useState(loadedConfig.paddingYpx);
//   const [paddingXpx, setPaddingXpx] = useState(loadedConfig.paddingXpx);
//   const [backgroundColor, setBackgroundColor] = useState(loadedConfig.backgroundColor);
//   const [textColor, setTextColor] = useState(loadedConfig.textColor);

//   const itemStyle = useMemo(
//     () => ({
//       fontWeight: 800,
//       fontSize: `${fontSizePx}px`,
//       lineHeight: 1.2,
//       color: textColor,
//       whiteSpace: "nowrap",
//       width: "fit-content",
//       maxWidth: "100%",
//       overflowWrap: "anywhere",
//       wordBreak: "break-word",
//     }),
//     [fontSizePx, textColor],
//   );

//   const lineTexts = useMemo(
//     () => messages.map((m) => String(m ?? "").trim()).filter(Boolean),
//     [messages],
//   );

//   const handleMessageChange = (idx, value) => {
//     setMessages((prev) => {
//       const next = [...prev];
//       next[idx] = value;
//       return next;
//     });
//   };

//   const addLine = () => setMessages((prev) => [...prev, "NEW OFFER"]);
//   const removeLast = () =>
//     setMessages((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
//   const [rotIdx, setRotIdx] = useState(0);
//   const [isPreviewHovered, setIsPreviewHovered] = useState(false);

//   useEffect(() => {
//     setRotIdx(0);
//   }, [messages, displayMode]);

//   useEffect(() => {
//     if (displayMode !== "rotate" || lineTexts.length <= 1 || !rotateAutoplay) return undefined;
//     if (rotatePauseOnHover && isPreviewHovered) return undefined;
//     const t = setInterval(() => {
//       setRotIdx((i) =>
//         rotateDirection === "backward"
//           ? (i - 1 + lineTexts.length) % lineTexts.length
//           : (i + 1) % lineTexts.length,
//       );
//     }, Math.max(1000, rotateIntervalMs || 3000));
//     return () => clearInterval(t);
//   }, [
//     displayMode,
//     lineTexts,
//     rotateIntervalMs,
//     rotateDirection,
//     rotateAutoplay,
//     rotatePauseOnHover,
//     isPreviewHovered,
//   ]);

//   return (
//     <s-page heading="Announcement UI playground">
//       <s-stack direction="block" gap="base">
//           {!onboarding?.clientIdConfigured ? (
//             <s-paragraph>
//               <s-text tone="critical">
//                 Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> to enable direct "add block" deep links.
//               </s-text>
//             </s-paragraph>
//           ) : null}
//           {actionData?.ok ? (
//             <s-banner tone="success" heading="Saved to Prisma">
//               Saved at {new Date(actionData.savedAt || Date.now()).toLocaleString()}.
//             </s-banner>
//           ) : null}
//           {actionData?.ok === false && actionData?.error ? (
//             <s-banner tone="critical" heading="Save failed">
//               {actionData.error}
//             </s-banner>
//           ) : null}
//           {!actionData?.ok && loadedSavedAt ? (
//             <s-paragraph>
//               <s-text tone="subdued">
//                 Last saved at {new Date(loadedSavedAt).toLocaleString()}.
//               </s-text>
//             </s-paragraph>
//           ) : null}

//           <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
//             <s-stack direction="block" gap="small">
//               <s-text type="strong">Live preview</s-text>
//               <div
//                 style={{
//                   width: "100%",
//                   background: backgroundColor,
//                   borderRadius: 8,
//                   padding: `${paddingYpx}px ${paddingXpx}px`,
//                   boxSizing: "border-box",
//                   overflowX: "auto",
//                 }}
//                 onMouseEnter={() => setIsPreviewHovered(true)}
//                 onMouseLeave={() => setIsPreviewHovered(false)}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "flex-start",
//                     gap: `${gapPx}px`,
//                     minWidth: "max-content",
//                   }}
//                 >
//                   {displayMode === "marquee" ? (
//                     <div style={{ overflow: "hidden", width: "100%" }}>
//                       {(() => {
//                         const cleaned = lineTexts;
//                         const sepToken = String(marqueeSeparator || "•").repeat(
//                           Math.max(1, marqueeSeparatorRepeat),
//                         );
//                         const sep = ` ${sepToken} `;
//                         const baseText = cleaned.join(sep);
//                         const loopText = marqueeTrailingSeparator ? `${baseText}${sep}` : baseText;
//                         return (
//                       <div
//                         style={{
//                           display: "inline-flex",
//                           whiteSpace: "nowrap",
//                           gap: 0,
//                           animation: `sceAdditionalPreviewMarquee ${marqueeDurationSeconds}s linear infinite`,
//                           animationDirection: marqueeDirection === "ltr" ? "reverse" : "normal",
//                         }}
//                       >
//                         <span style={itemStyle}>{loopText}</span>
//                         <span style={itemStyle}>{loopText}</span>
//                       </div>
//                         );
//                       })()}
//                     </div>
//                   ) : displayMode === "rotate" ? (
//                     <span style={itemStyle}>
//                       {lineTexts[rotIdx] || ""}
//                     </span>
//                   ) : (
//                     lineTexts.map((msg, i) => (
//                       <span key={i} style={itemStyle}>
//                         {msg}
//                       </span>
//                     ))
//                   )}
//                 </div>
//               </div>
//             </s-stack>
//           </s-box>

//           <s-grid gridTemplateColumns="repeat(2, minmax(220px, 1fr))" gap="base">
//             <s-select
//               label="Display mode"
//               value={displayMode}
//               onChange={(e) => setDisplayMode(e.target?.value ?? "stack")}
//             >
//               <s-option value="stack">Normal</s-option>
//               <s-option value="rotate">Rotate</s-option>
//               <s-option value="marquee">Marquee</s-option>
//             </s-select>
//             <s-text-field
//               label="Rotate interval (ms)"
//               type="number"
//               min={1000}
//               max={10000}
//               value={String(rotateIntervalMs)}
//               onChange={(e) => setRotateIntervalMs(Math.max(1000, Number(e.currentTarget.value) || 1000))}
//             />
//             <s-select
//               label="Rotate direction"
//               value={rotateDirection}
//               onChange={(e) => setRotateDirection(e.target?.value ?? "forward")}
//             >
//               <s-option value="forward">Forward</s-option>
//               <s-option value="backward">Backward</s-option>
//             </s-select>
//             <s-checkbox
//               label="Rotate autoplay"
//               checked={rotateAutoplay}
//               onChange={(e) => setRotateAutoplay(e.target?.checked ?? false)}
//             />
//             <s-checkbox
//               label="Pause rotate on hover"
//               checked={rotatePauseOnHover}
//               onChange={(e) => setRotatePauseOnHover(e.target?.checked ?? false)}
//             />
//             <s-text-field
//               label="Marquee duration (seconds)"
//               type="number"
//               min={4}
//               max={120}
//               value={String(marqueeDurationSeconds)}
//               onChange={(e) =>
//                 setMarqueeDurationSeconds(Math.max(4, Number(e.currentTarget.value) || 4))
//               }
//             />
//             <s-select
//               label="Marquee direction"
//               value={marqueeDirection}
//               onChange={(e) => setMarqueeDirection(e.target?.value ?? "rtl")}
//             >
//               <s-option value="rtl">Right to left</s-option>
//               <s-option value="ltr">Left to right</s-option>
//             </s-select>
//             <s-text-field
//               label="Marquee separator symbol"
//               value={marqueeSeparator}
//               onChange={(e) => setMarqueeSeparator(e.currentTarget.value || "•")}
//             />
//             <s-text-field
//               label="Separator repeat count"
//               type="number"
//               min={1}
//               max={6}
//               value={String(marqueeSeparatorRepeat)}
//               onChange={(e) =>
//                 setMarqueeSeparatorRepeat(
//                   Math.max(1, Math.min(6, Number(e.currentTarget.value) || 1)),
//                 )
//               }
//             />
//             <s-checkbox
//               label="Add separator at end before loop"
//               checked={marqueeTrailingSeparator}
//               onChange={(e) => setMarqueeTrailingSeparator(e.target?.checked ?? false)}
//             />
//             <s-text-field
//               label="Gap between items (px)"
//               type="number"
//               min={8}
//               max={64}
//               value={String(gapPx)}
//               onChange={(e) => setGapPx(Math.max(8, Number(e.currentTarget.value) || 8))}
//             />
//             <s-text-field
//               label="Font size (px)"
//               type="number"
//               min={12}
//               max={48}
//               value={String(fontSizePx)}
//               onChange={(e) => setFontSizePx(Math.max(12, Number(e.currentTarget.value) || 12))}
//             />
//             <s-text-field
//               label="Padding Y (px)"
//               type="number"
//               min={0}
//               max={48}
//               value={String(paddingYpx)}
//               onChange={(e) => setPaddingYpx(Math.max(0, Number(e.currentTarget.value) || 0))}
//             />
//             <s-text-field
//               label="Padding X (px)"
//               type="number"
//               min={0}
//               max={64}
//               value={String(paddingXpx)}
//               onChange={(e) => setPaddingXpx(Math.max(0, Number(e.currentTarget.value) || 0))}
//             />
//             <s-text-field
//               label="Background color"
//               value={backgroundColor}
//               onChange={(e) => setBackgroundColor(e.currentTarget.value || "#b8f441")}
//             />
//             <s-text-field
//               label="Text color"
//               value={textColor}
//               onChange={(e) => setTextColor(e.currentTarget.value || "#0f172a")}
//             />
//           </s-grid>

//           <s-divider />

//           <s-text type="strong">Marquee (single section)</s-text>
//           <s-paragraph>
//             <s-text tone="subdued">
//               One Section ID identifies this whole marquee; all lines below belong to it. In the
//               theme editor, paste this same value into the Additional UI bar block - the storefront
//               bar only appears after that field is filled and matches this ID.
//             </s-text>
//           </s-paragraph>
//           <s-text-field
//             label="Section ID"
//             value={sectionId}
//             onChange={(e) => setSectionId(e.currentTarget.value)}
//             autocomplete="off"
//           />

//           <s-divider />

//           <s-text type="strong">Marquee lines</s-text>
//           {messages.map((msg, i) => (
//             <s-text-field
//               key={i}
//               label={`Line ${i + 1}`}
//               value={msg}
//               onChange={(e) => handleMessageChange(i, e.currentTarget.value)}
//               autocomplete="off"
//             />
//           ))}

//           <s-stack direction="inline" gap="small">
//             <s-button type="button" variant="secondary" onClick={addLine}>
//               Add item
//             </s-button>
//             <s-button type="button" variant="tertiary" tone="critical" onClick={removeLast}>
//               Remove last
//             </s-button>
//             <Form method="post">
//               <input type="hidden" name="intent" value="save" />
//               <input type="hidden" name="sectionId" value={sectionId} />
//               <input type="hidden" name="messagesJson" value={JSON.stringify(messages)} />
//               <input type="hidden" name="displayMode" value={displayMode} />
//               <input type="hidden" name="rotateIntervalMs" value={String(rotateIntervalMs)} />
//               <input type="hidden" name="rotateDirection" value={rotateDirection} />
//               <input type="hidden" name="rotateAutoplay" value={rotateAutoplay ? "true" : "false"} />
//               <input type="hidden" name="rotatePauseOnHover" value={rotatePauseOnHover ? "true" : "false"} />
//               <input
//                 type="hidden"
//                 name="marqueeDurationSeconds"
//                 value={String(marqueeDurationSeconds)}
//               />
//               <input type="hidden" name="marqueeDirection" value={marqueeDirection} />
//               <input type="hidden" name="marqueeSeparator" value={marqueeSeparator} />
//               <input
//                 type="hidden"
//                 name="marqueeSeparatorRepeat"
//                 value={String(marqueeSeparatorRepeat)}
//               />
//               <input
//                 type="hidden"
//                 name="marqueeTrailingSeparator"
//                 value={marqueeTrailingSeparator ? "true" : "false"}
//               />
//               <input type="hidden" name="gapPx" value={String(gapPx)} />
//               <input type="hidden" name="fontSizePx" value={String(fontSizePx)} />
//               <input type="hidden" name="paddingYpx" value={String(paddingYpx)} />
//               <input type="hidden" name="paddingXpx" value={String(paddingXpx)} />
//               <input type="hidden" name="backgroundColor" value={backgroundColor} />
//               <input type="hidden" name="textColor" value={textColor} />
//               <s-button type="submit" variant="primary">
//                 Save to Prisma
//               </s-button>
//             </Form>
//           </s-stack>
//       </s-stack>
//       <style>{`
//         @keyframes sceAdditionalPreviewMarquee {
//           from { transform: translateX(0); }
//           to { transform: translateX(-50%); }
//         }
//       `}</style>
//     </s-page>
//   );
// }



// import { useEffect, useMemo, useRef, useState } from "react";
// import { Form, useActionData, useLoaderData, useOutletContext, useNavigation, useSubmit } from "react-router";
// import {
//   defaultAdditionalConfig,
//   generateSectionId,
//   parseAdditionalConfig,
//   resolveSectionId,
// } from "../lib/additional-ui-config.js";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// const ADDITIONAL_UI_BAR_TYPE = "additional_ui";

// function buildEditorState(config) {
//   return {
//     sectionId: config.sectionId || generateSectionId(),
//     displayMode: config.displayMode || "stack",
//     rotateIntervalMs: config.rotateIntervalMs || 3000,
//     rotateDirection: config.rotateDirection || "forward",
//     rotateAutoplay: config.rotateAutoplay !== false,
//     rotatePauseOnHover: config.rotatePauseOnHover !== false,
//     marqueeDurationSeconds: config.marqueeDurationSeconds || 18,
//     marqueeDirection: config.marqueeDirection || "rtl",
//     marqueeSeparator: config.marqueeSeparator || "•",
//     marqueeSeparatorRepeat: config.marqueeSeparatorRepeat || 1,
//     marqueeTrailingSeparator: config.marqueeTrailingSeparator !== false,
//     marqueeFullWidth: config.marqueeFullWidth !== false,
//     gapPx: config.gapPx || 24,
//     fontSizePx: config.fontSizePx || 22,
//     paddingYpx: config.paddingYpx || 14,
//     paddingXpx: config.paddingXpx || 16,
//     backgroundColor: config.backgroundColor || "#b8f441",
//     textColor: config.textColor || "#0f172a",
//     messages: Array.isArray(config.messages) ? config.messages : ["BLACK FRIDAY SALE!"],
//     policyContentSafe: config.policyContentSafe !== false,
//     policyNoFalseClaims: config.policyNoFalseClaims !== false,
//     policyAccessibilityReady: config.policyAccessibilityReady !== false,
//     comments: String(config.comments || ""),
//   };
// }

// /** Same trimming and fallback as `extensions/smart-cart-experience/assets/additional-ui.js` `normalizeItems`. */
// function normalizeStorefrontItems(messages) {
//   const raw = Array.isArray(messages) ? messages : [];
//   const items = [];
//   for (let j = 0; j < raw.length; j += 1) {
//     const row = raw[j];
//     let text = "";
//     if (row && typeof row === "object") {
//       text = String(row.text || row.message || "").trim();
//     } else {
//       text = String(row || "").trim();
//     }
//     if (text) items.push(text);
//   }
//   if (!items.length) items.push("BLACK FRIDAY SALE!");
//   return items;
// }

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const rows = await prisma.announcementBar.findMany({
//     where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
//     orderBy: { updatedAt: "desc" },
//     select: { id: true, configJson: true, updatedAt: true },
//   });

//   const blocks = rows.map((row) => {
//     const parsed = parseAdditionalConfig(row.configJson);
//     return {
//       rowId: row.id,
//       config: { ...parsed, sectionId: resolveSectionId(parsed, row.id) },
//       updatedAt: row.updatedAt.toISOString(),
//     };
//   });
//   return { blocks };
// };

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   const intent = String(form.get("intent") || "");

//   if (intent === "delete") {
//     const rowId = String(form.get("rowId") || "").trim();
//     if (!rowId) return { ok: false, error: "Missing row id." };
//     await prisma.announcementBar.deleteMany({
//       where: { id: rowId, shop, barType: ADDITIONAL_UI_BAR_TYPE },
//     });
//     return { ok: true, intent: "delete" };
//   }

//   if (intent !== "save") {
//     return { ok: false, error: "Unknown action." };
//   }

//   let messagesPosted = [];
//   try {
//     messagesPosted = JSON.parse(String(form.get("messagesJson") || "[]"));
//   } catch {
//     messagesPosted = [];
//   }
//   if (!Array.isArray(messagesPosted)) messagesPosted = [];

//   const config = parseAdditionalConfig(
//     JSON.stringify({
//       sectionId: String(form.get("sectionId") || "").trim(),
//       displayMode: String(form.get("displayMode") || "stack"),
//       rotateIntervalMs: Number(form.get("rotateIntervalMs") || 3000),
//       rotateDirection: String(form.get("rotateDirection") || "forward"),
//       rotateAutoplay: form.get("rotateAutoplay") !== "false",
//       rotatePauseOnHover: form.get("rotatePauseOnHover") !== "false",
//       marqueeDurationSeconds: Number(form.get("marqueeDurationSeconds") || 18),
//       marqueeDirection: String(form.get("marqueeDirection") || "rtl"),
//       marqueeSeparator: String(form.get("marqueeSeparator") || "•"),
//       marqueeSeparatorRepeat: Number(form.get("marqueeSeparatorRepeat") || 1),
//       marqueeTrailingSeparator: form.get("marqueeTrailingSeparator") !== "false",
//       marqueeFullWidth: form.get("marqueeFullWidth") !== "false",
//       gapPx: Number(form.get("gapPx") || 24),
//       fontSizePx: Number(form.get("fontSizePx") || 22),
//       paddingYpx: Number(form.get("paddingYpx") || 14),
//       paddingXpx: Number(form.get("paddingXpx") || 16),
//       backgroundColor: String(form.get("backgroundColor") || "#b8f441"),
//       textColor: String(form.get("textColor") || "#0f172a"),
//       messages: messagesPosted,
//       policyContentSafe: form.get("policyContentSafe") !== "false",
//       policyNoFalseClaims: form.get("policyNoFalseClaims") !== "false",
//       policyAccessibilityReady: form.get("policyAccessibilityReady") !== "false",
//       comments: String(form.get("comments") || "").trim(),
//     }),
//   );

//   const rowId = String(form.get("rowId") || "").trim();
//   const conflicts = await prisma.announcementBar.findMany({
//     where: { shop, barType: ADDITIONAL_UI_BAR_TYPE },
//     select: { id: true, configJson: true },
//   });
//   const hasDuplicateId = conflicts.some((entry) => {
//     if (rowId && entry.id === rowId) return false;
//     return parseAdditionalConfig(entry.configJson).sectionId === config.sectionId;
//   });
//   if (hasDuplicateId) {
//     return { ok: false, error: "Block ID already exists. Use a unique 12-character ID." };
//   }

//   const configJson = JSON.stringify(config);
//   if (rowId) {
//     const updated = await prisma.announcementBar.update({
//       where: { id: rowId },
//       data: {
//         name: `Additional UI ${config.sectionId}`,
//         barType: ADDITIONAL_UI_BAR_TYPE,
//         configJson,
//         active: false,
//       },
//       select: { id: true, updatedAt: true },
//     });
//     return { ok: true, intent: "save", savedId: updated.id, savedAt: updated.updatedAt.toISOString() };
//   }

//   const created = await prisma.announcementBar.create({
//     data: {
//       shop,
//       name: `Additional UI ${config.sectionId}`,
//       barType: ADDITIONAL_UI_BAR_TYPE,
//       configJson,
//       active: false,
//       customHtml: "",
//       customLiquid: "",
//       customCss: "",
//     },
//     select: { id: true, updatedAt: true },
//   });
//   return { ok: true, intent: "save", savedId: created.id, savedAt: created.updatedAt.toISOString() };
// };

// export default function AdditionalPage() {
//   const { blocks } = useLoaderData();
//   const actionData = useActionData();
//   const navigation = useNavigation();
//   const submit = useSubmit();
//   const { onboarding } = useOutletContext() || {};

//   const [isEditorOpen, setIsEditorOpen] = useState(false);
//   const [editingRowId, setEditingRowId] = useState("");
//   const [editor, setEditor] = useState(buildEditorState(defaultAdditionalConfig()));
//   const [currentPage, setCurrentPage] = useState(1);
//   const [rowsPerPage, setRowsPerPage] = useState(5);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.intent === "save") {
//       setIsEditorOpen(false);
//     }
//   }, [actionData]);

//   const isSaving = navigation.state === "submitting" && navigation.formData?.get("intent") === "save";
//   const isDeleting = navigation.state === "submitting" && navigation.formData?.get("intent") === "delete";

//   const previewItems = useMemo(() => normalizeStorefrontItems(editor.messages), [editor.messages]);
//   const previewItemsSig = previewItems.join("\u001e");

//   const gapPxClamped = Math.max(8, Number(editor.gapPx) || 24);
//   const fontSizePxClamped = Math.max(12, Number(editor.fontSizePx) || 22);
//   const paddingYpxClamped = Math.max(0, Number(editor.paddingYpx) || 14);
//   const paddingXpxClamped = Math.max(0, Number(editor.paddingXpx) || 16);
//   const marqueeDurationSecondsClamped = Math.max(4, Number(editor.marqueeDurationSeconds) || 18);
//   const marqueeDirectionClamped = editor.marqueeDirection === "ltr" ? "ltr" : "rtl";
//   const marqueeSepRepeatClamped = Math.max(1, Math.min(6, Number(editor.marqueeSeparatorRepeat) || 1));
//   const rotateIntervalMsClamped = Math.max(1000, Number(editor.rotateIntervalMs) || 3000);
//   const rotateDirectionClamped = editor.rotateDirection === "backward" ? "backward" : "forward";
//   const borderRadiusPx = 8;

//   const marqueeLoopText = useMemo(() => {
//     const sepToken = String(editor.marqueeSeparator || "•").repeat(marqueeSepRepeatClamped);
//     const sep = ` ${sepToken} `;
//     const baseText = previewItems.join(sep);
//     return editor.marqueeTrailingSeparator !== false ? baseText + sep : baseText;
//   }, [editor.marqueeSeparator, editor.marqueeTrailingSeparator, marqueeSepRepeatClamped, previewItems]);

//   const [rotIdx, setRotIdx] = useState(0);
//   const previewBarRef = useRef(null);
//   const rotateTimerRef = useRef(null);
//   const rotateKickRef = useRef(null);

//   useEffect(() => {
//     setRotIdx(0);
//   }, [editor.displayMode, previewItemsSig]);

//   useEffect(() => {
//     if (editor.displayMode !== "rotate" || previewItems.length <= 1 || !editor.rotateAutoplay) {
//       return undefined;
//     }
//     const el = previewBarRef.current;
//     const items = previewItems;

//     const advance = () => {
//       setRotIdx((i) =>
//         rotateDirectionClamped === "backward"
//           ? (i - 1 + items.length) % items.length
//           : (i + 1) % items.length,
//       );
//     };

//     const startRotateTimer = () => {
//       if (rotateTimerRef.current || items.length <= 1) return;
//       rotateTimerRef.current = setInterval(advance, rotateIntervalMsClamped);
//     };

//     const stopRotateTimer = () => {
//       if (!rotateTimerRef.current) return;
//       clearInterval(rotateTimerRef.current);
//       rotateTimerRef.current = null;
//     };

//     rotateKickRef.current = setTimeout(() => {
//       rotateKickRef.current = null;
//       if (!rotateTimerRef.current) advance();
//       startRotateTimer();
//     }, Math.min(rotateIntervalMsClamped, 1200));

//     const onEnter = () => {
//       if (!editor.rotatePauseOnHover) return;
//       stopRotateTimer();
//     };
//     const onLeave = () => {
//       if (!editor.rotatePauseOnHover || !editor.rotateAutoplay) return;
//       startRotateTimer();
//     };

//     if (el && editor.rotatePauseOnHover) {
//       el.addEventListener("mouseenter", onEnter);
//       el.addEventListener("mouseleave", onLeave);
//     }

//     return () => {
//       if (rotateKickRef.current) {
//         clearTimeout(rotateKickRef.current);
//         rotateKickRef.current = null;
//       }
//       stopRotateTimer();
//       if (el) {
//         el.removeEventListener("mouseenter", onEnter);
//         el.removeEventListener("mouseleave", onLeave);
//       }
//     };
//   }, [
//     editor.displayMode,
//     editor.rotateAutoplay,
//     editor.rotatePauseOnHover,
//     previewItems,
//     previewItemsSig,
//     rotateDirectionClamped,
//     rotateIntervalMsClamped,
//   ]);

//   const itemStyle = useMemo(
//     () => ({
//       fontWeight: 800,
//       lineHeight: 1.2,
//       whiteSpace: "nowrap",
//       width: "fit-content",
//       maxWidth: "100%",
//       overflowWrap: "anywhere",
//       wordBreak: "break-word",
//       fontSize: fontSizePxClamped,
//     }),
//     [fontSizePxClamped],
//   );

//   const tableRows = useMemo(
//     () =>
//       blocks.map((row) => {
//         const cfg = buildEditorState(row.config || {});
//         const msgCount = normalizeStorefrontItems(cfg.messages).length;
//         const policyPassed =
//           cfg.policyContentSafe && cfg.policyNoFalseClaims && cfg.policyAccessibilityReady;
//         return {
//           ...row,
//           cfg,
//           msgCount,
//           policyPassed,
//           commentsShort: String(cfg.comments || "").slice(0, 80),
//         };
//       }),
//     [blocks],
//   );

//   const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
//   const safePage = Math.min(currentPage, totalPages);
//   const pageStart = (safePage - 1) * rowsPerPage;
//   const pagedRows = tableRows.slice(pageStart, pageStart + rowsPerPage);

//   useEffect(() => {
//     if (currentPage > totalPages) setCurrentPage(totalPages);
//   }, [currentPage, totalPages]);

//   const openCreate = () => {
//     const cfg = buildEditorState(defaultAdditionalConfig());
//     setEditingRowId("");
//     setEditor({ ...cfg, sectionId: generateSectionId() });
//     setIsEditorOpen(true);
//   };

//   const openEdit = (row) => {
//     setEditingRowId(row.rowId);
//     setEditor(buildEditorState(row.config));
//     setIsEditorOpen(true);
//   };

//   const updateField = (key, value) => setEditor((prev) => ({ ...prev, [key]: value }));
//   const updateMessage = (index, value) => {
//     setEditor((prev) => {
//       const next = [...prev.messages];
//       next[index] = value;
//       return { ...prev, messages: next };
//     });
//   };
//   const addMessage = () => setEditor((prev) => ({ ...prev, messages: [...prev.messages, "NEW MESSAGE"] }));
//   const removeMessage = (index) =>
//     setEditor((prev) => {
//       const next = prev.messages.filter((_, i) => i !== index);
//       return { ...prev, messages: next.length ? next : [""] };
//     });

//   return (
//     <s-page heading="Additional UI Blocks">
//       <s-stack direction="block" gap="base">
//         {!onboarding?.clientIdConfigured ? (
//           <s-banner tone="critical" heading="Missing API Key">
//             Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> to enable direct add-block deep links.
//           </s-banner>
//         ) : null}

//         {actionData?.ok ? (
//           <s-banner tone="success" heading={actionData.intent === "delete" ? "Block deleted" : "Block saved"}>
//             {actionData.intent === "delete" ? "Record removed instantly." : "Changes are now live on storefront polling."}
//           </s-banner>
//         ) : null}
//         {actionData?.ok === false && actionData?.error ? (
//           <s-banner tone="critical" heading="Action failed">
//             {actionData.error}
//           </s-banner>
//         ) : null}

//         <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
//           <s-stack direction="inline" alignItems="center" distribution="space-between">
//             <s-text type="strong">Configured blocks</s-text>
//             <s-stack direction="inline" gap="small" alignItems="center">
//               <s-select
//                 label="Rows per page"
//                 value={String(rowsPerPage)}
//                 onChange={(e) => {
//                   const next = Math.max(1, Number(e.target?.value) || 5);
//                   setRowsPerPage(next);
//                   setCurrentPage(1);
//                 }}
//               >
//                 <s-option value="5">5</s-option>
//                 <s-option value="10">10</s-option>
//                 <s-option value="20">20</s-option>
//               </s-select>
//               <s-button type="button" variant="primary" onClick={openCreate}>
//                 Create block
//               </s-button>
//             </s-stack>
//           </s-stack>
//           <div style={{ marginTop: 12 }}>
//             <table className="sce-data-table">
//               <thead>
//                 <tr>
//                   <th>Block ID</th>
//                   <th>Mode</th>
//                   <th>Messages</th>
//                   <th>Policies</th>
//                   <th>Comments</th>
//                   <th>Updated</th>
//                   <th style={{ textAlign: "right" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {pagedRows.map((row) => (
//                   <tr key={row.rowId}>
//                     <td style={{ fontFamily: "monospace" }}>{row.cfg.sectionId}</td>
//                     <td>{row.cfg.displayMode}</td>
//                     <td>{row.msgCount}</td>
//                     <td>
//                       <span className={row.policyPassed ? "sce-pill sce-pill-ok" : "sce-pill sce-pill-warn"}>
//                         {row.policyPassed ? "Compliant" : "Needs review"}
//                       </span>
//                     </td>
//                     <td title={row.cfg.comments || ""}>{row.commentsShort || "-"}</td>
//                     <td>{new Date(row.updatedAt).toLocaleString()}</td>
//                     <td style={{ textAlign: "right" }}>
//                       <s-stack direction="inline" gap="small" distribution="trailing">
//                         <s-button type="button" variant="secondary" onClick={() => openEdit(row)}>
//                           Edit
//                         </s-button>
//                         <button
//                           type="button"
//                           className="sce-delete-btn"
//                           onClick={() =>
//                             submit(
//                               { intent: "delete", rowId: row.rowId },
//                               { method: "post" },
//                             )
//                           }
//                           disabled={isDeleting}
//                         >
//                           Delete
//                         </button>
//                       </s-stack>
//                     </td>
//                   </tr>
//                 ))}
//                 {!blocks.length ? (
//                   <tr>
//                     <td colSpan={7} style={{ color: "#6b7280" }}>
//                       No blocks yet. Create your first 12-character ID block.
//                     </td>
//                   </tr>
//                 ) : null}
//               </tbody>
//             </table>
//             {blocks.length ? (
//               <div className="sce-pagination">
//                 <s-text tone="subdued">
//                   Showing {pageStart + 1}-{Math.min(pageStart + rowsPerPage, tableRows.length)} of {tableRows.length}
//                 </s-text>
//                 <s-stack direction="inline" gap="small" alignItems="center">
//                   <s-button type="button" variant="secondary" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
//                     Previous
//                   </s-button>
//                   <s-text>Page {safePage} / {totalPages}</s-text>
//                   <s-button type="button" variant="secondary" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
//                     Next
//                   </s-button>
//                 </s-stack>
//               </div>
//             ) : null}
//           </div>
//         </s-box>
//       </s-stack>

//       {isEditorOpen ? (
//         <div className="sce-modal-backdrop">
//           <div className="sce-modal">
//             <s-stack direction="block" gap="base">
//               <s-stack direction="inline" distribution="space-between" alignItems="center">
//                 <s-text type="strong">{editingRowId ? "Edit block" : "Create block"}</s-text>
//                 <button type="button" className="sce-close-btn" onClick={() => setIsEditorOpen(false)}>
//                   ×
//                 </button>
//               </s-stack>

//               <s-text-field
//                 label="Block ID (12 alphanumeric characters)"
//                 value={editor.sectionId}
//                 onChange={(e) =>
//                   updateField("sectionId", String(e.currentTarget.value || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12))
//                 }
//                 readonly
//                 // autocomplete="off"
//               />

//               <s-select
//                 label="Mode"
//                 value={editor.displayMode}
//                 onChange={(e) => updateField("displayMode", e.target?.value ?? "stack")}
//               >
//                 <s-option value="marquee">Marquee</s-option>
//                 <s-option value="rotate">Rotate</s-option>
//                 <s-option value="stack">Normal</s-option>
//               </s-select>

//               {editor.displayMode === "marquee" ? (
//                 <s-box borderWidth="base" borderRadius="base" padding="base">
//                   <s-text type="strong">Marquee settings</s-text>
//                   <s-grid gridTemplateColumns="repeat(2, minmax(200px, 1fr))" gap="base">
//                     <s-checkbox label="Full width" checked={editor.marqueeFullWidth} onChange={(e) => updateField("marqueeFullWidth", e.target?.checked ?? false)} />
//                     <s-select label="Direction" value={editor.marqueeDirection} onChange={(e) => updateField("marqueeDirection", e.target?.value ?? "rtl")}>
//                       <s-option value="rtl">Right to left</s-option>
//                       <s-option value="ltr">Left to right</s-option>
//                     </s-select>
//                     <s-text-field label="Scroll speed (seconds)" type="number" min={4} value={String(editor.marqueeDurationSeconds)} onChange={(e) => updateField("marqueeDurationSeconds", Math.max(4, Number(e.currentTarget.value) || 4))} />
//                     <s-text-field label="Separator symbol" value={editor.marqueeSeparator} onChange={(e) => updateField("marqueeSeparator", e.currentTarget.value || "•")} />
//                     <s-text-field label="Separator repeat" type="number" min={1} max={6} value={String(editor.marqueeSeparatorRepeat)} onChange={(e) => updateField("marqueeSeparatorRepeat", Math.max(1, Math.min(6, Number(e.currentTarget.value) || 1)))} />
//                     <s-checkbox label="Trailing separator before loop" checked={editor.marqueeTrailingSeparator} onChange={(e) => updateField("marqueeTrailingSeparator", e.target?.checked ?? false)} />
//                     <s-checkbox label="Continuous scroll" checked={true} disabled />
//                   </s-grid>
//                 </s-box>
//               ) : null}

//               {editor.displayMode === "rotate" ? (
//                 <s-box borderWidth="base" borderRadius="base" padding="base">
//                   <s-text type="strong">Rotate settings</s-text>
//                   <s-grid gridTemplateColumns="repeat(2, minmax(200px, 1fr))" gap="base">
//                     <s-text-field label="Interval (ms)" type="number" min={1000} value={String(editor.rotateIntervalMs)} onChange={(e) => updateField("rotateIntervalMs", Math.max(1000, Number(e.currentTarget.value) || 1000))} />
//                     <s-select label="Direction" value={editor.rotateDirection} onChange={(e) => updateField("rotateDirection", e.target?.value ?? "forward")}>
//                       <s-option value="forward">Forward</s-option>
//                       <s-option value="backward">Reverse</s-option>
//                     </s-select>
//                     <s-checkbox label="Autoplay" checked={editor.rotateAutoplay} onChange={(e) => updateField("rotateAutoplay", e.target?.checked ?? false)} />
//                     <s-checkbox label="Pause on hover" checked={editor.rotatePauseOnHover} onChange={(e) => updateField("rotatePauseOnHover", e.target?.checked ?? false)} />
//                   </s-grid>
//                 </s-box>
//               ) : null}

//               <s-box borderWidth="base" borderRadius="base" padding="base">
//                 <s-text type="strong">Appearance</s-text>
//                 <s-grid gridTemplateColumns="repeat(2, minmax(200px, 1fr))" gap="base">
//                   <s-text-field label="Font size (px)" type="number" min={12} value={String(editor.fontSizePx)} onChange={(e) => updateField("fontSizePx", Math.max(12, Number(e.currentTarget.value) || 12))} />
//                   <s-text-field label="Gap between items (px)" type="number" min={8} value={String(editor.gapPx)} onChange={(e) => updateField("gapPx", Math.max(8, Number(e.currentTarget.value) || 8))} />
//                   <s-text-field label="Padding Y (px)" type="number" min={0} value={String(editor.paddingYpx)} onChange={(e) => updateField("paddingYpx", Math.max(0, Number(e.currentTarget.value) || 0))} />
//                   <s-text-field label="Padding X (px)" type="number" min={0} value={String(editor.paddingXpx)} onChange={(e) => updateField("paddingXpx", Math.max(0, Number(e.currentTarget.value) || 0))} />
//                   <s-text-field label="Background color" value={editor.backgroundColor} onChange={(e) => updateField("backgroundColor", e.currentTarget.value || "#b8f441")} />
//                   <s-text-field label="Text color" value={editor.textColor} onChange={(e) => updateField("textColor", e.currentTarget.value || "#0f172a")} />
//                 </s-grid>
//               </s-box>

//               <s-box borderWidth="base" borderRadius="base" padding="base">
//                 <s-text type="strong">Policies</s-text>
//                 <s-grid gridTemplateColumns="repeat(2, minmax(240px, 1fr))" gap="base">
//                   <s-checkbox
//                     label="Content-safe text (no abusive language)"
//                     checked={editor.policyContentSafe}
//                     onChange={(e) => updateField("policyContentSafe", e.target?.checked ?? false)}
//                   />
//                   <s-checkbox
//                     label="No misleading claims"
//                     checked={editor.policyNoFalseClaims}
//                     onChange={(e) => updateField("policyNoFalseClaims", e.target?.checked ?? false)}
//                   />
//                   <s-checkbox
//                     label="Accessibility-ready copy"
//                     checked={editor.policyAccessibilityReady}
//                     onChange={(e) => updateField("policyAccessibilityReady", e.target?.checked ?? false)}
//                   />
//                 </s-grid>
//               </s-box>

//               <s-box borderWidth="base" borderRadius="base" padding="base">
//                 <s-text type="strong">Internal comments</s-text>
//                 <div style={{ marginTop: 8 }}>
//                   <textarea
//                     className="sce-comments-input"
//                     value={editor.comments}
//                     onChange={(e) => updateField("comments", e.currentTarget.value)}
//                     placeholder="Add reviewer notes, launch comments, or implementation context..."
//                   />
//                 </div>
//               </s-box>

//               <s-box borderWidth="base" borderRadius="base" padding="base">
//                 <s-stack direction="inline" distribution="space-between" alignItems="center">
//                   <s-text type="strong">Messages</s-text>
//                   <s-button type="button" variant="secondary" onClick={addMessage}>
//                     Add message
//                   </s-button>
//                 </s-stack>
//                 <s-stack direction="block" gap="small">
//                   {editor.messages.map((message, index) => (
//                     <s-stack key={index} direction="inline" gap="small" alignItems="center">
//                       <div style={{ flex: 1 }}>
//                         <s-text-field
//                           label={`Message ${index + 1}`}
//                           value={message}
//                           onChange={(e) => updateMessage(index, e.currentTarget.value)}
//                           autocomplete="off"
//                         />
//                       </div>
//                       <button type="button" className="sce-delete-btn" onClick={() => removeMessage(index)}>
//                         Delete
//                       </button>
//                     </s-stack>
//                   ))}
//                 </s-stack>
//               </s-box>

//               <s-box borderWidth="base" borderRadius="base" padding="base">
//                 <s-text type="strong">Storefront preview</s-text>
//                 <div style={{ marginTop: 8 }}>
//                   <div
//                     ref={previewBarRef}
//                     className="sce-extra-bar sce-extra-bar--inline sce-extra-preview-root"
//                     style={{
//                       background: editor.backgroundColor,
//                       color: editor.textColor,
//                       padding: `${paddingYpxClamped}px ${paddingXpxClamped}px`,
//                       borderRadius: borderRadiusPx,
//                       ...(editor.displayMode === "marquee" && editor.marqueeFullWidth === false
//                         ? { width: "fit-content" }
//                         : {}),
//                     }}
//                   >
//                     <div
//                       className={
//                         editor.displayMode === "marquee"
//                           ? "sce-extra-bar__track-wrap sce-extra-bar__track-wrap--marquee"
//                           : "sce-extra-bar__track-wrap"
//                       }
//                     >
//                       <div
//                         className={
//                           editor.displayMode === "marquee"
//                             ? "sce-extra-bar__track sce-extra-bar__track--marquee"
//                             : "sce-extra-bar__track"
//                         }
//                         style={
//                           editor.displayMode === "marquee"
//                             ? {
//                                 gap: 0,
//                                 animationDuration: `${marqueeDurationSecondsClamped}s`,
//                                 animationDirection: marqueeDirectionClamped === "ltr" ? "reverse" : "normal",
//                               }
//                             : { gap: gapPxClamped }
//                         }
//                       >
//                         {editor.displayMode === "marquee" ? (
//                           <>
//                             <span className="sce-extra-bar__item" style={itemStyle}>
//                               {marqueeLoopText}
//                             </span>
//                             <span className="sce-extra-bar__item" style={itemStyle}>
//                               {marqueeLoopText}
//                             </span>
//                           </>
//                         ) : editor.displayMode === "rotate" ? (
//                           <span className="sce-extra-bar__item" style={itemStyle}>
//                             {previewItems.length ? previewItems[rotIdx % previewItems.length] ?? "" : ""}
//                           </span>
//                         ) : (
//                           previewItems.map((msg, i) => (
//                             <span key={i} className="sce-extra-bar__item" style={itemStyle}>
//                               {msg}
//                             </span>
//                           ))
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </s-box>

//               <Form method="post">
//                 <input type="hidden" name="intent" value="save" />
//                 <input type="hidden" name="rowId" value={editingRowId} />
//                 <input type="hidden" name="sectionId" value={editor.sectionId} />
//                 <input type="hidden" name="messagesJson" value={JSON.stringify(editor.messages)} />
//                 <input type="hidden" name="displayMode" value={editor.displayMode} />
//                 <input type="hidden" name="rotateIntervalMs" value={String(editor.rotateIntervalMs)} />
//                 <input type="hidden" name="rotateDirection" value={editor.rotateDirection} />
//                 <input type="hidden" name="rotateAutoplay" value={editor.rotateAutoplay ? "true" : "false"} />
//                 <input type="hidden" name="rotatePauseOnHover" value={editor.rotatePauseOnHover ? "true" : "false"} />
//                 <input type="hidden" name="marqueeDurationSeconds" value={String(editor.marqueeDurationSeconds)} />
//                 <input type="hidden" name="marqueeDirection" value={editor.marqueeDirection} />
//                 <input type="hidden" name="marqueeSeparator" value={editor.marqueeSeparator} />
//                 <input type="hidden" name="marqueeSeparatorRepeat" value={String(editor.marqueeSeparatorRepeat)} />
//                 <input type="hidden" name="marqueeTrailingSeparator" value={editor.marqueeTrailingSeparator ? "true" : "false"} />
//                 <input type="hidden" name="marqueeFullWidth" value={editor.marqueeFullWidth ? "true" : "false"} />
//                 <input type="hidden" name="gapPx" value={String(editor.gapPx)} />
//                 <input type="hidden" name="fontSizePx" value={String(editor.fontSizePx)} />
//                 <input type="hidden" name="paddingYpx" value={String(editor.paddingYpx)} />
//                 <input type="hidden" name="paddingXpx" value={String(editor.paddingXpx)} />
//                 <input type="hidden" name="backgroundColor" value={editor.backgroundColor} />
//                 <input type="hidden" name="textColor" value={editor.textColor} />
//                 <input type="hidden" name="policyContentSafe" value={editor.policyContentSafe ? "true" : "false"} />
//                 <input type="hidden" name="policyNoFalseClaims" value={editor.policyNoFalseClaims ? "true" : "false"} />
//                 <input type="hidden" name="policyAccessibilityReady" value={editor.policyAccessibilityReady ? "true" : "false"} />
//                 <input type="hidden" name="comments" value={editor.comments} />
//                 <s-stack direction="inline" distribution="trailing" gap="small">
//                   <s-button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>
//                     Cancel
//                   </s-button>
//                   <s-button type="submit" variant="primary" disabled={isSaving || editor.sectionId.length !== 12}>
//                     {isSaving ? "Saving..." : "Save block"}
//                   </s-button>
//                 </s-stack>
//               </Form>
//             </s-stack>
//           </div>
//         </div>
//       ) : null}

//       <style>{`
//         .sce-delete-btn {
//           border: 1px solid #ef4444;
//           color: #b91c1c;
//           background: #fff;
//           border-radius: 8px;
//           padding: 7px 10px;
//           cursor: pointer;
//         }
//         .sce-data-table {
//           width: 100%;
//           border-collapse: separate;
//           border-spacing: 0;
//           font-size: 13px;
//           background: #fff;
//           border: 1px solid #e5e7eb;
//           border-radius: 10px;
//           overflow: hidden;
//         }
//         .sce-data-table th,
//         .sce-data-table td {
//           padding: 10px 12px;
//           border-bottom: 1px solid #f1f5f9;
//           text-align: left;
//           vertical-align: middle;
//         }
//         .sce-data-table th {
//           background: #f8fafc;
//           color: #334155;
//           font-weight: 700;
//           font-size: 12px;
//           text-transform: uppercase;
//           letter-spacing: 0.02em;
//         }
//         .sce-data-table tbody tr:hover {
//           background: #f8fafc;
//         }
//         .sce-pill {
//           display: inline-block;
//           border-radius: 999px;
//           padding: 2px 10px;
//           font-size: 12px;
//           font-weight: 700;
//         }
//         .sce-pill-ok {
//           color: #166534;
//           background: #dcfce7;
//         }
//         .sce-pill-warn {
//           color: #92400e;
//           background: #fef3c7;
//         }
//         .sce-pagination {
//           margin-top: 12px;
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//         }
//         .sce-comments-input {
//           width: 100%;
//           min-height: 92px;
//           border: 1px solid #cbd5e1;
//           border-radius: 8px;
//           padding: 10px 12px;
//           font-size: 14px;
//           line-height: 1.4;
//           resize: vertical;
//         }
//         .sce-modal-backdrop {
//           position: fixed;
//           inset: 0;
//           background: rgba(15, 23, 42, 0.45);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 10000;
//           padding: 24px;
//         }
//         .sce-modal {
//           width: min(980px, 100%);
//           max-height: calc(100vh - 48px);
//           overflow: auto;
//           background: #fff;
//           border-radius: 12px;
//           padding: 16px;
//           box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
//         }
//         .sce-close-btn {
//           border: none;
//           background: transparent;
//           font-size: 24px;
//           cursor: pointer;
//           line-height: 1;In the UI, when clicking the Create button, a popup opens. In this popup, the three templates should be shown first as small preview images for selection. After selecting any template, all its options should be displayed in a tab layout. For example, color options in a Color tab, contact options in a Contact tab, etc. The form should be organized into multiple tabs, and finally include a Create button to submit
//           color: #6b7280;
//         }
//         /* Mirrors extensions/smart-cart-experience/assets/additional-ui.css */
//         .sce-extra-preview-root.sce-extra-bar {
//           box-sizing: border-box;
//           display: block;
//           width: 100%;
//           max-width: 100%;
//           left: 0;
//           right: 0;
//           -webkit-font-smoothing: antialiased;
//         }
//         .sce-extra-bar--inline.sce-extra-preview-root {
//           position: relative;
//         }
//         .sce-extra-preview-root .sce-extra-bar__track-wrap {
//           width: 100%;
//           overflow-x: auto;
//           overflow-y: hidden;
//         }
//         .sce-extra-preview-root .sce-extra-bar__track-wrap--marquee {
//           width: 100%;
//           overflow: hidden;
//         }
//         .sce-extra-preview-root .sce-extra-bar__track {
//           display: flex;
//           align-items: center;
//           justify-content: flex-start;
//           min-width: max-content;
//         }
//         .sce-extra-preview-root .sce-extra-bar__track--marquee {
//           display: inline-flex;
//           white-space: nowrap;
//           will-change: transform;
//           animation-name: sceExtraMarquee;
//           animation-timing-function: linear;
//           animation-iteration-count: infinite;
//           gap: 0;
//         }
//         @keyframes sceExtraMarquee {
//           0% {
//             transform: translateX(0);
//           }
//           100% {
//             transform: translateX(-50%);
//           }
//         }
//         .sce-extra-preview-root .sce-extra-bar__item {
//           font-weight: 800;
//           line-height: 1.2;
//           white-space: nowrap;
//           width: fit-content;
//           max-width: 100%;
//           overflow-wrap: anywhere;
//           word-break: break-word;
//         }
//       `}</style>
//     </s-page>
//   );
// }








/**
 * AdditionalPage.jsx
 *
 * Admin page for managing "Additional UI" announcement bar blocks.
 * Each block maps to a unique 12-char sectionId used in the Shopify theme.
 *
 * Features:
 *  - Paginated table with rows-per-page selector
 *  - Policy compliance column (content-safe, no false claims, accessibility)
 *  - Internal comments column
 *  - Full-featured editor modal with live storefront preview
 *  - Marquee / Rotate / Stack display modes
 *  - White background, refined light-mode design
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useOutletContext,
  useNavigation,
  useSubmit,
} from "react-router";
import {
  defaultAdditionalConfig,
  generateSectionId,
} from "../lib/additional-ui-config.js";
import { authenticate } from "../shopify.server";
import {
  loadAnnouncementBodyAdminBlocks,
  handleAnnouncementBodyAdminAction,
} from "../lib/announcements-admin.server.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ADDITIONAL_TEMPLATES = [
  {
    id: "promo-stack",
    name: "Promo Stack",
    description: "Static stacked promotional lines.",
    patch: {
      displayMode: "stack",
      backgroundColor: "#b8f441",
      textColor: "#0f172a",
      fontSizePx: 22,
      messages: ["BLACK FRIDAY SALE!", "FREE SHIPPING ABOVE $99"],
    },
  },
  {
    id: "clean-rotate",
    name: "Clean Rotate",
    description: "Rotates one message at a time.",
    patch: {
      displayMode: "rotate",
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      rotateIntervalMs: 2800,
      messages: ["Welcome to our store", "New arrivals are live", "Shop bestsellers now"],
    },
  },
  {
    id: "sale-marquee",
    name: "Sale Marquee",
    description: "Continuous ticker with separator.",
    patch: {
      displayMode: "marquee",
      backgroundColor: "#111827",
      textColor: "#fbbf24",
      marqueeDurationSeconds: 16,
      marqueeSeparator: "•",
      messages: ["MEGA SALE LIVE", "USE CODE SAVE20", "LIMITED TIME ONLY"],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a flat editor state object from a raw config.
 * All fields have safe defaults so the form never renders undefined values.
 */
function buildEditorState(config) {
  return {
    sectionId: config.sectionId || generateSectionId(),
    displayMode: config.displayMode || "stack",
    rotateIntervalMs: config.rotateIntervalMs || 3000,
    rotateDirection: config.rotateDirection || "forward",
    rotateAutoplay: config.rotateAutoplay !== false,
    rotatePauseOnHover: config.rotatePauseOnHover !== false,
    marqueeDurationSeconds: config.marqueeDurationSeconds || 18,
    marqueeDirection: config.marqueeDirection || "rtl",
    marqueeSeparator: config.marqueeSeparator || "•",
    marqueeSeparatorRepeat: config.marqueeSeparatorRepeat || 1,
    marqueeTrailingSeparator: config.marqueeTrailingSeparator !== false,
    marqueeFullWidth: config.marqueeFullWidth !== false,
    gapPx: config.gapPx || 24,
    fontSizePx: config.fontSizePx || 22,
    paddingYpx: config.paddingYpx || 14,
    paddingXpx: config.paddingXpx || 16,
    backgroundColor: config.backgroundColor || "#b8f441",
    textColor: config.textColor || "#0f172a",
    messages: Array.isArray(config.messages) ? config.messages : ["BLACK FRIDAY SALE!"],
    // Policy attestation fields
    policyContentSafe: config.policyContentSafe !== false,
    policyNoFalseClaims: config.policyNoFalseClaims !== false,
    policyAccessibilityReady: config.policyAccessibilityReady !== false,
    // Internal reviewer notes
    comments: String(config.comments || ""),
  };
}

/**
 * Mirrors `normalizeItems` in extensions/smart-cart-experience/assets/additional-ui.js.
 * Trims whitespace, skips empty rows, and falls back to a default message.
 */
function normalizeStorefrontItems(messages) {
  const raw = Array.isArray(messages) ? messages : [];
  const items = [];
  for (let j = 0; j < raw.length; j += 1) {
    const row = raw[j];
    let text = "";
    if (row && typeof row === "object") {
      text = String(row.text || row.message || "").trim();
    } else {
      text = String(row || "").trim();
    }
    if (text) items.push(text);
  }
  if (!items.length) items.push("BLACK FRIDAY SALE!");
  return items;
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || "").trim();
  const shortMatch = /^#([0-9a-fA-F]{3})$/;
  const fullMatch = /^#([0-9a-fA-F]{6})$/;
  if (fullMatch.test(raw)) return raw.toLowerCase();
  if (shortMatch.test(raw)) {
    const short = raw.slice(1).toLowerCase();
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`;
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader - fetch all additional-UI bars for the authenticated shop
// ─────────────────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const blocks = await loadAnnouncementBodyAdminBlocks(shop);
  const bodyEditId = url.searchParams.get("kind") === "body" ? url.searchParams.get("edit") || "" : "";
  const pendingBodyCreate =
    url.searchParams.get("kind") === "body" && url.searchParams.get("create") === "1";
  return { blocks, bodyEditId, pendingBodyCreate };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  return handleAnnouncementBodyAdminAction(session.shop, form);
};

export function AnnouncementBodyAdmin({
  loaderData,
  showTable = true,
  routePrefix = "/app/additional",
  navigateQueryStyle = "standalone",
}) {
  const { blocks, bodyEditId = "", pendingBodyCreate = false } = loaderData;
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();
  const { onboarding } = useOutletContext() || {};

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

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState("");
  const [editor, setEditor] = useState(buildEditorState(defaultAdditionalConfig()));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editorStep, setEditorStep] = useState("template");
  const [editorTab, setEditorTab] = useState("content");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ── Navigation flags ───────────────────────────────────────────────────────
  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "save";
  const isDeleting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "delete";

  // Close modal after a successful save action
  useEffect(() => {
    if (actionData?.ok && actionData?.intent === "save") {
      setIsEditorOpen(false);
    }
  }, [actionData]);

  // ── Table data enrichment ──────────────────────────────────────────────────

  /** Pre-computed rows with display-ready derived values */
  const tableRows = useMemo(
    () =>
      blocks.map((row) => {
        const cfg = buildEditorState(row.config || {});
        const msgCount = normalizeStorefrontItems(cfg.messages).length;
        // A block is "compliant" only if all three policy boxes are checked
        const policyPassed =
          cfg.policyContentSafe &&
          cfg.policyNoFalseClaims &&
          cfg.policyAccessibilityReady;
        return {
          ...row,
          cfg,
          msgCount,
          policyPassed,
          // Truncate long comments for the table cell
          commentsShort: String(cfg.comments || "").slice(0, 72),
        };
      }),
    [blocks],
  );

  // ── Pagination arithmetic ──────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pagedRows = tableRows.slice(pageStart, pageStart + rowsPerPage);

  // Clamp current page when rows/page changes or rows are deleted
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // ── Preview computed values ────────────────────────────────────────────────
  const previewItems = useMemo(
    () => normalizeStorefrontItems(editor.messages),
    [editor.messages],
  );
  const previewItemsSig = previewItems.join("\u001e");

  const gapPxClamped = Math.max(8, Number(editor.gapPx) || 24);
  const fontSizePxClamped = Math.max(12, Number(editor.fontSizePx) || 22);
  const paddingYpxClamped = Math.max(0, Number(editor.paddingYpx) || 14);
  const paddingXpxClamped = Math.max(0, Number(editor.paddingXpx) || 16);
  const marqueeDurationSecondsClamped = Math.max(4, Number(editor.marqueeDurationSeconds) || 18);
  const marqueeDirectionClamped = editor.marqueeDirection === "ltr" ? "ltr" : "rtl";
  const marqueeSepRepeatClamped = Math.max(1, Math.min(6, Number(editor.marqueeSeparatorRepeat) || 1));
  const rotateIntervalMsClamped = Math.max(1000, Number(editor.rotateIntervalMs) || 3000);
  const rotateDirectionClamped = editor.rotateDirection === "backward" ? "backward" : "forward";
  const safeBackgroundColor = normalizeHexColor(editor.backgroundColor, "#b8f441");
  const safeTextColor = normalizeHexColor(editor.textColor, "#0f172a");

  /** Full marquee loop string with trailing separator */
  const marqueeLoopText = useMemo(() => {
    const sepToken = String(editor.marqueeSeparator || "•").repeat(marqueeSepRepeatClamped);
    const sep = ` ${sepToken} `;
    const baseText = previewItems.join(sep);
    return editor.marqueeTrailingSeparator !== false ? baseText + sep : baseText;
  }, [editor.marqueeSeparator, editor.marqueeTrailingSeparator, marqueeSepRepeatClamped, previewItems]);

  // ── Rotate preview ticker ──────────────────────────────────────────────────
  const [rotIdx, setRotIdx] = useState(0);
  const previewBarRef = useRef(null);
  const rotateTimerRef = useRef(null);
  const rotateKickRef = useRef(null);

  // Reset rotation index when mode or messages change
  useEffect(() => {
    setRotIdx(0);
  }, [editor.displayMode, previewItemsSig]);

  // Manage the rotate autoplay interval
  useEffect(() => {
    if (
      editor.displayMode !== "rotate" ||
      previewItems.length <= 1 ||
      !editor.rotateAutoplay
    ) {
      return undefined;
    }
    const el = previewBarRef.current;
    const items = previewItems;

    const advance = () => {
      setRotIdx((i) =>
        rotateDirectionClamped === "backward"
          ? (i - 1 + items.length) % items.length
          : (i + 1) % items.length,
      );
    };

    const startRotateTimer = () => {
      if (rotateTimerRef.current || items.length <= 1) return;
      rotateTimerRef.current = setInterval(advance, rotateIntervalMsClamped);
    };

    const stopRotateTimer = () => {
      if (!rotateTimerRef.current) return;
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    };

    // Kick the first advance sooner than the full interval for better UX
    rotateKickRef.current = setTimeout(() => {
      rotateKickRef.current = null;
      if (!rotateTimerRef.current) advance();
      startRotateTimer();
    }, Math.min(rotateIntervalMsClamped, 1200));

    const onEnter = () => { if (!editor.rotatePauseOnHover) return; stopRotateTimer(); };
    const onLeave = () => { if (!editor.rotatePauseOnHover || !editor.rotateAutoplay) return; startRotateTimer(); };

    if (el && editor.rotatePauseOnHover) {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    }

    return () => {
      if (rotateKickRef.current) { clearTimeout(rotateKickRef.current); rotateKickRef.current = null; }
      stopRotateTimer();
      if (el) { el.removeEventListener("mouseenter", onEnter); el.removeEventListener("mouseleave", onLeave); }
    };
  }, [
    editor.displayMode,
    editor.rotateAutoplay,
    editor.rotatePauseOnHover,
    previewItems,
    previewItemsSig,
    rotateDirectionClamped,
    rotateIntervalMsClamped,
  ]);

  /** Stable item style object to avoid re-renders on every keystroke */
  const itemStyle = useMemo(
    () => ({
      fontWeight: 800,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      width: "fit-content",
      maxWidth: "100%",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      fontSize: fontSizePxClamped,
    }),
    [fontSizePxClamped],
  );

  // ── Editor open/close handlers ─────────────────────────────────────────────

  const openCreate = () => {
    const cfg = buildEditorState(defaultAdditionalConfig());
    setEditingRowId("");
    setEditor({ ...cfg, sectionId: generateSectionId() });
    setEditorStep("template");
    setEditorTab("content");
    setIsEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditingRowId(row.rowId);
    setEditor(buildEditorState(row.config));
    setEditorStep("tabs");
    setEditorTab("content");
    setIsEditorOpen(true);
  };

  const applyTemplateAndContinue = (templateId) => {
    const tpl = ADDITIONAL_TEMPLATES.find((item) => item.id === templateId);
    if (!tpl) return;
    setEditor((prev) => ({ ...prev, ...tpl.patch }));
    setEditorStep("tabs");
    setEditorTab("content");
  };

  const requestDelete = (row) => {
    setDeleteTarget(row);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget?.rowId) return;
    submit(
      { intent: "delete", rowId: deleteTarget.rowId, recordKind: "body" },
      { method: "post" },
    );
    setDeleteTarget(null);
  };

  // ── Editor field mutation helpers ──────────────────────────────────────────

  const updateField = (key, value) =>
    setEditor((prev) => ({ ...prev, [key]: value }));

  const updateMessage = (index, value) =>
    setEditor((prev) => {
      const next = [...prev.messages];
      next[index] = value;
      return { ...prev, messages: next };
    });

  const addMessage = () =>
    setEditor((prev) => ({ ...prev, messages: [...prev.messages, "NEW MESSAGE"] }));

  const removeMessage = (index) =>
    setEditor((prev) => {
      const next = prev.messages.filter((_, i) => i !== index);
      return { ...prev, messages: next.length ? next : [""] };
    });

  const lastBodyUrlOpenRef = useRef("");
  useEffect(() => {
    if (!bodyEditId) lastBodyUrlOpenRef.current = "";
  }, [bodyEditId]);

  useEffect(() => {
    if (navigateQueryStyle !== "unified" || !bodyEditId || !blocks.length) return;
    if (lastBodyUrlOpenRef.current === bodyEditId) return;
    const row = blocks.find((b) => b.rowId === bodyEditId);
    if (!row) return;
    lastBodyUrlOpenRef.current = bodyEditId;
    setEditingRowId(row.rowId);
    setEditor(buildEditorState(row.config));
    setEditorStep("tabs");
    setEditorTab("content");
    setIsEditorOpen(true);
  }, [bodyEditId, blocks, navigateQueryStyle]);

  useEffect(() => {
    if (!pendingBodyCreate || navigateQueryStyle !== "unified") return;
    const cfg = buildEditorState(defaultAdditionalConfig());
    setEditingRowId("");
    setEditor({ ...cfg, sectionId: generateSectionId() });
    setEditorStep("template");
    setEditorTab("content");
    setIsEditorOpen(true);
    navigate(withShopifyParams(`${routePrefix}?kind=body`), { replace: true });
  }, [pendingBodyCreate, navigateQueryStyle, navigate, routePrefix, withShopifyParams]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    {showTable ? (
    <s-page heading="Geekify: Upsells, Progress Bar">
      <s-stack direction="block" gap="base">

        {/* ── Missing API key warning ─────────────────────────────────────── */}
        {!onboarding?.clientIdConfigured ? (
          <s-banner tone="critical" heading="Missing API Key">
            Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> to enable direct
            add-block deep links.
          </s-banner>
        ) : null}

        {/* ── Action feedback banners ─────────────────────────────────────── */}
        {actionData?.ok ? (
          <s-banner
            tone="success"
            heading={actionData.intent === "delete" ? "Block deleted" : "Block saved"}
          >
            {actionData.intent === "delete"
              ? "Record removed instantly."
              : "Changes are now live on storefront polling."}
          </s-banner>
        ) : null}

        {actionData?.ok === false && actionData?.error ? (
          <s-banner tone="critical" heading="Action failed">
            {actionData.error}
          </s-banner>
        ) : null}

        {/* ── Main table card ─────────────────────────────────────────────── */}
        <div className="sce-card">

          {/* Card header: title + rows-per-page + create button */}
          <div className="sce-card-header">
            <div className="sce-card-header-left">
              <span className="sce-card-title">Configured blocks</span>
              <span className="sce-card-subtitle">
                {tableRows.length} block{tableRows.length !== 1 ? "s" : ""} · each maps to a unique section ID in your theme
              </span>
            </div>
            <div className="sce-card-header-right">
              {/* Rows per page selector */}
              <div className="sce-rpp-wrap">
                <label className="sce-rpp-label" htmlFor="sce-rpp">Rows</label>
                <select
                  id="sce-rpp"
                  className="sce-rpp-select"
                  value={String(rowsPerPage)}
                  onChange={(e) => {
                    setRowsPerPage(Math.max(1, Number(e.target.value) || 5));
                    setCurrentPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </div>
              <button type="button" className="sce-btn sce-btn-primary" onClick={openCreate}>
                + Create block
              </button>
            </div>
          </div>

          {/* Data table */}
          <div className="sce-table-wrap">
            <table className="sce-data-table">
              <thead>
                <tr>
                  <th>Block ID</th>
                  <th>Mode</th>
                  <th>Messages</th>
                  <th>Colors</th>
                  <th>Comments</th>
                  {/* <th>Updated</th>/ */}
                  <th  >Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length > 0 ? (
                  pagedRows.map((row) => (
                    <tr key={row.rowId}>

                      {/* Block ID - monospace, highlighted */}
                      <td>
                        <span className="sce-mono-id">{row.cfg.sectionId}</span>
                      </td>

                      {/* Display mode badge */}
                      <td>
                        <span className={`sce-mode-badge sce-mode-${row.cfg.displayMode}`}>
                          {row.cfg.displayMode === "stack"
                            ? "Normal"
                            : row.cfg.displayMode.charAt(0).toUpperCase() +
                            row.cfg.displayMode.slice(1)}
                        </span>
                      </td>

                      {/* Message count */}
                      <td  >{row.msgCount}</td>

                      {/* Color swatches */}
                      <td>
                        <div className="sce-swatch-row">
                          <span
                            className="sce-swatch"
                            style={{ background: row.cfg.backgroundColor }}
                            title={`BG: ${row.cfg.backgroundColor}`}
                          />
                          <span
                            className="sce-swatch"
                            style={{ background: row.cfg.textColor }}
                            title={`Text: ${row.cfg.textColor}`}
                          />
                        </div>
                      </td>



                      {/* Internal comments - truncated, full text on hover */}
                      <td title={row.cfg.comments || ""} className="sce-td-comment">
                        {row.commentsShort
                          ? <>
                            {row.commentsShort}
                            {row.cfg.comments.length > 72 ? "…" : ""}
                          </>
                          : <span className="sce-td-empty">-</span>}
                      </td>

                      {/* ISO timestamp */}
                      {/* <td className="sce-td-ts">
                        {new Date(row.updatedAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td> */}

                      {/* Actions */}
                      <td>
                        <div className="sce-td-actions">
                          <s-button
                            type="button"
                            variant="secondary"
                            icon="edit"
                            // className="sce-btn sce-btn-sm sce-btn-secondary"
                            onClick={() => openEdit(row)}
                          >

                          </s-button>
                          <s-button
                            type="button"
                            variant="secondary"
                            tone="critical"
                            icon="delete"
                            // className="sce-btn sce-btn-sm sce-btn-danger"
                            disabled={isDeleting}
                            onClick={() => requestDelete(row)}
                          >

                          </s-button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="sce-empty-row">
                      <div className="sce-empty-icon">◻</div>
                      <div className="sce-empty-title">No blocks yet</div>
                      <div className="sce-empty-sub">
                        Create your first 12-character ID block using the button above.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {tableRows.length > 0 && (
            <div className="sce-pagination">
              <span className="sce-pagination-info">
                Showing {pageStart + 1}–{Math.min(pageStart + rowsPerPage, tableRows.length)} of{" "}
                {tableRows.length} block{tableRows.length !== 1 ? "s" : ""}
              </span>
              <div className="sce-pagination-btns">
                <button
                  type="button"
                  className="sce-page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    className={`sce-page-btn ${safePage === i + 1 ? "sce-page-btn-active" : ""}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="sce-page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Policy reference box ────────────────────────────────────────── */}
        {/* <div className="sce-policy-ref">
          <div className="sce-policy-ref-title">Policy &amp; usage notes</div>
          <ul className="sce-policy-list">
            <li>
              <strong>Block IDs</strong> must be exactly 12 lowercase alphanumeric characters and
              globally unique per shop. They map to <code>sectionId</code> in your Liquid theme.
            </li>
            <li>
              <strong>Storefront polling</strong> - saved configs propagate within ~30 s. Avoid
              last-second edits before time-sensitive campaigns.
            </li>
            <li>
              <strong>Empty messages</strong> are silently skipped at render time. If all messages
              are empty the storefront falls back to "BLACK FRIDAY SALE!".
            </li>
            <li>
              <strong>Deleting</strong> a block is irreversible. The storefront stops rendering it
              after the next poll cycle.
            </li>
            <li>
              <strong>Policies</strong> - all three checkboxes should be confirmed before a block
              goes live. Unchecked items display a "Needs review" badge in the table.
            </li>
            <li>
              <strong>Marquee speed</strong> is measured in seconds per full loop. Minimum: 4 s.
              Lower values increase scroll speed.
            </li>
          </ul>
        </div> */}
      </s-stack>
    </s-page>
    ) : null}

      {/* ── Editor modal ─────────────────────────────────────────────────────── */}
      {isEditorOpen && (
        <div
          className="sce-modal-backdrop"
          onMouseDown={(e) => {
            // Close on backdrop click, not on modal click
            if (e.target === e.currentTarget) setIsEditorOpen(false);
          }}
        >
          <div className="sce-modal" role="dialog" aria-modal="true">
            <s-stack direction="block" gap="base">

              {/* Modal header */}
              <div className="sce-modal-header">
                <div>

                  <span className="sce-modal-title">
                    {editingRowId ? "Edit block" : "Create block"}
                  </span>
                  {/* <span className="sce-modal-subtitle">
                    {editingRowId
                      ? "Modify configuration - changes deploy on next poll cycle"
                      : `Configure a new announcement bar Bloack id : <b>${editor.sectionId}</b>`}  
                  </span> */}

                  <span className="sce-modal-subtitle">
                    {editingRowId ? (
                      "Modify configuration - changes deploy on next poll cycle"
                    ) : (
                      <>
                        Configure a new announcement bar Block id :{" "}
                        <b>{editor.sectionId}</b>
                      </>
                    )}
                  </span>
                </div>
                <s-button
                  type="button"
                  // className="sce-close-btn"

                  variant="secondary"
                  // icon="delete"
                  tone="critical"
                  aria-label="Close editor"
                  onClick={() => setIsEditorOpen(false)}
                >
                  ×
                </s-button>
              </div>

              {editorStep === "template" ? (
                <div className="sce-section-box">
                  <div className="sce-section-title">Select a template</div>
                  <p className="sce-section-desc">Choose one starter template to load its default options.</p>
                  <div className="sce-template-grid">
                    {ADDITIONAL_TEMPLATES.map((tpl) => {
                      const bg = tpl.patch.backgroundColor || "#b8f441";
                      const fg = tpl.patch.textColor || "#0f172a";
                      const sample = (tpl.patch.messages && tpl.patch.messages[0]) || "Preview";
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          className="sce-template-card"
                          onClick={() => applyTemplateAndContinue(tpl.id)}
                        >
                          <div className="sce-template-thumb" style={{ background: bg, color: fg }}>
                            <span>{sample}</span>
                          </div>
                          <div className="sce-template-title">{tpl.name}</div>
                          <div className="sce-template-desc">{tpl.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="sce-editor-tabs">
                    <button type="button" className={`sce-tab-btn${editorTab === "content" ? " sce-tab-btn--active" : ""}`} onClick={() => setEditorTab("content")}>Content</button>
                    <button type="button" className={`sce-tab-btn${editorTab === "color" ? " sce-tab-btn--active" : ""}`} onClick={() => setEditorTab("color")}>Color</button>
                    <button type="button" className={`sce-tab-btn${editorTab === "contact" ? " sce-tab-btn--active" : ""}`} onClick={() => setEditorTab("contact")}>Contact</button>
                    <button type="button" className={`sce-tab-btn${editorTab === "behavior" ? " sce-tab-btn--active" : ""}`} onClick={() => setEditorTab("behavior")}>Behavior</button>
                  </div>

                  {editorTab === "content" ? (
                    <div className="sce-section-box">
                      <div className="sce-section-header-row">
                        <div className="sce-section-title">Messages</div>
                        <button type="button" className="sce-btn sce-btn-sm sce-btn-secondary" onClick={addMessage}>
                          + Add message
                        </button>
                      </div>
                      <div className="sce-msg-list">
                        {editor.messages.map((message, index) => (
                          <div key={index} className="sce-msg-row">
                            <span className="sce-msg-idx">{index + 1}</span>
                            <input
                              className="sce-msg-input"
                              type="text"
                              value={message}
                              onChange={(e) => updateMessage(index, e.target.value)}
                              placeholder="Enter message text…"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              className="sce-btn sce-btn-sm sce-btn-danger"
                              onClick={() => removeMessage(index)}
                              aria-label={`Remove message ${index + 1}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {editorTab === "color" ? (
                    <div className="sce-section-box">
                      <div className="sce-section-title">Color settings</div>
                      <div className="sce-form-grid">
                        <div className="sce-field">
                          <label className="sce-field-label">Background color</label>
                          <div className="sce-color-row">
                            <input type="color" className="sce-color-picker" value={safeBackgroundColor} aria-label="Pick background color" onChange={(e) => updateField("backgroundColor", e.target.value)} />
                            <input className="sce-field-input sce-field-input-mono" type="text" value={editor.backgroundColor} onChange={(e) => updateField("backgroundColor", e.target.value || "#b8f441")} placeholder="#b8f441" />
                          </div>
                        </div>
                        <div className="sce-field">
                          <label className="sce-field-label">Text color</label>
                          <div className="sce-color-row">
                            <input type="color" className="sce-color-picker" value={safeTextColor} aria-label="Pick text color" onChange={(e) => updateField("textColor", e.target.value)} />
                            <input className="sce-field-input sce-field-input-mono" type="text" value={editor.textColor} onChange={(e) => updateField("textColor", e.target.value || "#0f172a")} placeholder="#0f172a" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {editorTab === "contact" ? (
                    <div className="sce-section-box">
                      <div className="sce-section-title">Contact / Notes</div>
                      <p className="sce-section-desc">Use this for support details or internal notes.</p>
                      <textarea
                        className="sce-comments-input"
                        value={editor.comments}
                        onChange={(e) => updateField("comments", e.target.value)}
                        placeholder="e.g. support@yourstore.com | +1-000-000-0000"
                        rows={4}
                      />
                    </div>
                  ) : null}

                  {editorTab === "behavior" ? (
                    <>
                      <s-select
                        label="Display mode"
                        value={editor.displayMode}
                        onChange={(e) => updateField("displayMode", e.target?.value ?? "stack")}
                      >
                        <s-option value="stack">Normal (stack all messages)</s-option>
                        <s-option value="rotate">Rotate (cycle one at a time)</s-option>
                        <s-option value="marquee">Marquee (scrolling ticker)</s-option>
                      </s-select>
                      <div className="sce-section-box">
                        <div className="sce-section-title">Appearance</div>
                        <div className="sce-form-grid">
                          <div className="sce-field">
                            <label className="sce-field-label">Font size (px)</label>
                            <input className="sce-field-input" type="number" min={12} value={editor.fontSizePx} onChange={(e) => updateField("fontSizePx", Math.max(12, Number(e.target.value) || 12))} />
                          </div>
                          <div className="sce-field">
                            <label className="sce-field-label">Gap between items (px)</label>
                            <input className="sce-field-input" type="number" min={8} value={editor.gapPx} onChange={(e) => updateField("gapPx", Math.max(8, Number(e.target.value) || 8))} />
                          </div>
                          <div className="sce-field">
                            <label className="sce-field-label">Vertical padding (px)</label>
                            <input className="sce-field-input" type="number" min={0} value={editor.paddingYpx} onChange={(e) => updateField("paddingYpx", Math.max(0, Number(e.target.value) || 0))} />
                          </div>
                          <div className="sce-field">
                            <label className="sce-field-label">Horizontal padding (px)</label>
                            <input className="sce-field-input" type="number" min={0} value={editor.paddingXpx} onChange={(e) => updateField("paddingXpx", Math.max(0, Number(e.target.value) || 0))} />
                          </div>
                        </div>
                      </div>
                      {editor.displayMode === "marquee" ? (
                        <div className="sce-section-box">
                          <div className="sce-section-title">Marquee settings</div>
                          <div className="sce-form-grid">
                            <div className="sce-field">
                              <label className="sce-field-label">Scroll speed (seconds)</label>
                              <input className="sce-field-input" type="number" min={4} value={editor.marqueeDurationSeconds} onChange={(e) => updateField("marqueeDurationSeconds", Math.max(4, Number(e.target.value) || 4))} />
                            </div>
                            <div className="sce-field">
                              <label className="sce-field-label">Scroll direction</label>
                              <select className="sce-field-select" value={editor.marqueeDirection} onChange={(e) => updateField("marqueeDirection", e.target.value)}>
                                <option value="rtl">Right → Left</option>
                                <option value="ltr">Left → Right</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {editor.displayMode === "rotate" ? (
                        <div className="sce-section-box">
                          <div className="sce-section-title">Rotate settings</div>
                          <div className="sce-form-grid">
                            <div className="sce-field">
                              <label className="sce-field-label">Interval (ms)</label>
                              <input className="sce-field-input" type="number" min={1000} value={editor.rotateIntervalMs} onChange={(e) => updateField("rotateIntervalMs", Math.max(1000, Number(e.target.value) || 1000))} />
                            </div>
                            <div className="sce-field">
                              <label className="sce-field-label">Direction</label>
                              <select className="sce-field-select" value={editor.rotateDirection} onChange={(e) => updateField("rotateDirection", e.target.value)}>
                                <option value="forward">Forward</option>
                                <option value="backward">Backward</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </>
              )}

              {/* ── Live preview ──────────────────────────────────────────── */}
              <div className="sce-section-box">
                <div className="sce-section-title">Storefront preview</div>

                <div
                  ref={previewBarRef}
                  className="sce-extra-bar sce-extra-bar--inline sce-extra-preview-root"
                  style={{
                    background: safeBackgroundColor,
                    color: safeTextColor,
                    padding: `${paddingYpxClamped}px ${paddingXpxClamped}px`,
                    borderRadius: 8,
                    ...(editor.displayMode === "marquee" && !editor.marqueeFullWidth
                      ? { width: "fit-content" }
                      : {}),
                  }}
                >
                  <div
                    className={
                      editor.displayMode === "marquee"
                        ? "sce-extra-bar__track-wrap sce-extra-bar__track-wrap--marquee"
                        : "sce-extra-bar__track-wrap"
                    }
                  >
                    <div
                      className={
                        editor.displayMode === "marquee"
                          ? "sce-extra-bar__track sce-extra-bar__track--marquee"
                          : "sce-extra-bar__track"
                      }
                      style={
                        editor.displayMode === "marquee"
                          ? {
                            gap: 0,
                            animationDuration: `${marqueeDurationSecondsClamped}s`,
                            animationDirection:
                              marqueeDirectionClamped === "ltr" ? "reverse" : "normal",
                          }
                          : { gap: gapPxClamped }
                      }
                    >
                      {editor.displayMode === "marquee" ? (
                        <>
                          <span className="sce-extra-bar__item" style={itemStyle}>
                            {marqueeLoopText}
                          </span>
                          <span className="sce-extra-bar__item" style={itemStyle}>
                            {marqueeLoopText}
                          </span>
                        </>
                      ) : editor.displayMode === "rotate" ? (
                        <span className="sce-extra-bar__item" style={itemStyle}>
                          {previewItems[rotIdx % previewItems.length] ?? ""}
                        </span>
                      ) : (
                        previewItems.map((msg, i) => (
                          <span key={i} className="sce-extra-bar__item" style={itemStyle}>
                            {msg}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Hidden form + submit ───────────────────────────────────── */}
              <Form method="post">
                <input type="hidden" name="recordKind" value="body" />
                {/* Core identifiers */}
                <input type="hidden" name="intent" value="save" />
                <input type="hidden" name="rowId" value={editingRowId} />
                <input type="hidden" name="sectionId" value={editor.sectionId} />
                <input
                  type="hidden"
                  name="templateJson"
                  value={String(
                    blocks.find((b) => b.rowId === editingRowId)?.templateJson || "{}",
                  )}
                />

                {/* Messages as JSON blob to preserve array structure */}
                <input
                  type="hidden"
                  name="messagesJson"
                  value={JSON.stringify(editor.messages)}
                />

                {/* Display mode + mode-specific options */}
                <input type="hidden" name="displayMode" value={editor.displayMode} />
                <input type="hidden" name="rotateIntervalMs" value={String(editor.rotateIntervalMs)} />
                <input type="hidden" name="rotateDirection" value={editor.rotateDirection} />
                <input type="hidden" name="rotateAutoplay" value={editor.rotateAutoplay ? "true" : "false"} />
                <input type="hidden" name="rotatePauseOnHover" value={editor.rotatePauseOnHover ? "true" : "false"} />
                <input type="hidden" name="marqueeDurationSeconds" value={String(editor.marqueeDurationSeconds)} />
                <input type="hidden" name="marqueeDirection" value={editor.marqueeDirection} />
                <input type="hidden" name="marqueeSeparator" value={editor.marqueeSeparator} />
                <input type="hidden" name="marqueeSeparatorRepeat" value={String(editor.marqueeSeparatorRepeat)} />
                <input type="hidden" name="marqueeTrailingSeparator" value={editor.marqueeTrailingSeparator ? "true" : "false"} />
                <input type="hidden" name="marqueeFullWidth" value={editor.marqueeFullWidth ? "true" : "false"} />

                {/* Appearance */}
                <input type="hidden" name="gapPx" value={String(editor.gapPx)} />
                <input type="hidden" name="fontSizePx" value={String(editor.fontSizePx)} />
                <input type="hidden" name="paddingYpx" value={String(editor.paddingYpx)} />
                <input type="hidden" name="paddingXpx" value={String(editor.paddingXpx)} />
                <input type="hidden" name="backgroundColor" value={editor.backgroundColor} />
                <input type="hidden" name="textColor" value={editor.textColor} />

                {/* Policy attestation */}
                <input type="hidden" name="policyContentSafe" value={editor.policyContentSafe ? "true" : "false"} />
                <input type="hidden" name="policyNoFalseClaims" value={editor.policyNoFalseClaims ? "true" : "false"} />
                <input type="hidden" name="policyAccessibilityReady" value={editor.policyAccessibilityReady ? "true" : "false"} />

                {/* Internal comments */}
                <input type="hidden" name="comments" value={editor.comments} />

                {/* Footer action bar */}
                <div className="sce-modal-footer">
                  <span className="sce-footer-hint">
                    {editorStep === "template"
                      ? "Select a template to continue."
                      : "Changes propagate to storefront on next poll (~30 s)"}
                  </span>
                  <div className="sce-footer-actions">
                    <button
                      type="button"
                      className="sce-btn sce-btn-secondary"
                      onClick={() => setIsEditorOpen(false)}
                    >
                      Cancel
                    </button>
                    {editorStep !== "template" ? (
                      <button
                        type="submit"
                        className="sce-btn sce-btn-primary"
                        disabled={isSaving || editor.sectionId.length !== 12}
                      >
                        {isSaving ? "Saving…" : editingRowId ? "Update" : "Save"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Form>

            </s-stack>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ───────────────────────────────────────── */}
      {deleteTarget ? (
        <div
          className="sce-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelDelete();
          }}
        >
          <div className="sce-modal sce-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="sce-delete-title">
            <div className="sce-modal-header">
              <div>
                <span id="sce-delete-title" className="sce-modal-title">Delete block?</span>
                <span className="sce-modal-subtitle">
                  This will permanently remove block <b>{deleteTarget.cfg?.sectionId || deleteTarget.rowId}</b>.
                </span>
              </div>
            </div>
            <div className="sce-modal-footer">
              <span className="sce-footer-hint">This action cannot be undone.</span>
              <div className="sce-footer-actions">
                <button type="button" className="sce-btn sce-btn-secondary" onClick={cancelDelete}>
                  Cancel
                </button>
                <button type="button" className="sce-btn sce-btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Global styles ──────────────────────────────────────────────────── */}
      <style>{`

        /* ── Design tokens ─────────────────────────────────────────────────── */
        :root {
          --sce-accent: #16a34a;
          --sce-accent-light: #dcfce7;
          --sce-accent-text: #166534;
          --sce-danger: #ef4444;
          --sce-danger-light: #fef2f2;
          --sce-danger-text: #b91c1c;
          --sce-warn-light: #fffbeb;
          --sce-warn-text: #92400e;
          --sce-border: #e5e7eb;
          --sce-border-focus: #6ee7b7;
          --sce-surface: #ffffff;
          --sce-surface-sub: #f8fafc;
          --sce-surface-3: #f1f5f9;
          --sce-ink: rgb(0 123 96 / 10%);
          --sce-ink-2: #334155;
          --sce-ink-3: #64748b;
          --sce-ink-4: rgb(0 123 96);
          --sce-radius: 10px;
          --sce-radius-lg: 14px;
          --sce-font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          --sce-shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --sce-shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05);
          --sce-shadow-xl: 0 20px 60px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08);
        }

        /* ── Card ──────────────────────────────────────────────────────────── */
        .sce-card {
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: var(--sce-radius-lg);
          box-shadow: var(--sce-shadow-sm);
          overflow: hidden;
        }
        .sce-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--sce-border);
          background: var(--sce-surface-sub);
        }
        .sce-card-header-left {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .sce-card-title {
          font-size: 15px;
          font-weight: 600;
          // color: var(--sce-ink);
        }
        .sce-card-subtitle {
          font-size: 12px;
          color: var(--sce-ink-3);
        }
        .sce-card-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ── Rows per page ─────────────────────────────────────────────────── */
        .sce-rpp-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sce-rpp-label {
          font-size: 12px;
          color: var(--sce-ink-3);
          font-weight: 500;
          white-space: nowrap;
        }
        .sce-rpp-select {
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: 7px;
          padding: 5px 10px;
          font-size: 13px;
          color: var(--sce-ink-2);
          cursor: pointer;
          outline: none;
        }
        .sce-rpp-select:focus {
          // border-color: var(--sce-border-focus);
          box-shadow: 0 0 0 3px rgba(110,231,183,0.2);
        }

        /* ── Buttons ───────────────────────────────────────────────────────── */
        .sce-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.13s, border-color 0.13s, transform 0.1s;
          white-space: nowrap;
          line-height: 1.4;
        }
        .sce-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none !important;
        }
        .sce-btn-primary {
          background: var(--sce-ink);
          color: rgb(0 123 96);
          border-color: var(--sce-ink);
        }
        .sce-btn-primary:not(:disabled):hover {
          background:var(--sce-ink);
          transform: translateY(-1px);
        }
        .sce-btn-secondary {
          background: var(--sce-surface);
          color: var(--sce-ink-2);
          border-color: var(--sce-border);
        }
        .sce-btn-secondary:not(:disabled):hover {
          background: var(--sce-surface-3);
          border-color: #cbd5e1;
        }
        .sce-btn-danger {
          background: var(--sce-danger-light);
          color: var(--sce-danger-text);
          border-color: #fecaca;
        }
        .sce-btn-danger:not(:disabled):hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }
        .sce-btn-sm {
          padding: 5px 11px;
          font-size: 12px;
          border-radius: 6px;
        }

        /* ── Data table ────────────────────────────────────────────────────── */
        .sce-table-wrap {
          overflow-x: auto;
        }
        .sce-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          color: var(--sce-ink-2);
        }
        .sce-data-table thead {
          background: var(--sce-surface-sub);
          border-bottom: 1px solid var(--sce-border);
        }
        .sce-data-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--sce-ink-3);
          white-space: nowrap;
        }
        .sce-data-table td {
          padding: 13px 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .sce-data-table tbody tr:last-child td {
          border-bottom: none;
        }
        .sce-data-table tbody tr {
          transition: background 0.1s;
        }
        .sce-data-table tbody tr:hover {
          background: #fafbfc;
        }

        /* Table cell helpers */
        .sce-td-center { text-align: center; }
        .sce-td-ts {
          font-size: 12px;
          color: var(--sce-ink-4);
          white-space: nowrap;
          font-family: var(--sce-font-mono);
        }
        .sce-td-comment {
          font-size: 12px;
          color: var(--sce-ink-3);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sce-td-empty { color: var(--sce-ink-4); }
        .sce-td-actions {
          display: flex;
          align-items: center;
          gap: 7px; 
        }

        /* Block ID pill */
        .sce-mono-id {
          font-size: 12px;
          letter-spacing: 0.06em;
          color:rgb(0, 0, 0);   
          display: inline-block;
          font-weight: 600;
        }

        /* Mode badges */
        .sce-mode-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          // padding: 3px 9px;
          border-radius: 20px;
          letter-spacing: 0.02em;
          text-transform: capitalize;
        }
        .sce-mode-marquee { 
          color:rgba(19, 23, 31, 0.83); 
        }
        .sce-mode-rotate {
         color:rgba(19, 23, 31, 0.83); 
        }
        .sce-mode-stack {
        color:rgba(19, 23, 31, 0.83); 
        }

        /* Color swatches in table */
        .sce-swatch-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .sce-swatch {
          display: inline-block;
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1px solid rgba(0,0,0,0.1);
          flex-shrink: 0;
        }

        /* Status pills */
        .sce-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .sce-pill-ok {
          background: var(--sce-accent-light);
          color: var(--sce-accent-text);
          border: 1px solid #a7f3d0;
        }
        .sce-pill-warn {
          background: var(--sce-warn-light);
          color: var(--sce-warn-text);
          border: 1px solid #fde68a;
        }

        /* Empty state */
        .sce-empty-row {
          text-align: center;
          padding: 48px 24px !important;
        }
        .sce-empty-icon { font-size: 28px; opacity: 0.2; margin-bottom: 10px; }
        .sce-empty-title { font-size: 14px; font-weight: 600; color: var(--sce-ink-3); margin-bottom: 4px; }
        .sce-empty-sub { font-size: 12px; color: var(--sce-ink-4); }

        /* ── Pagination ─────────────────────────────────────────────────────── */
        .sce-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--sce-border);
          background: var(--sce-surface-sub);
        }
        .sce-pagination-info {
          font-size: 12px;
          color: var(--sce-ink-3);
          font-family: var(--sce-font-mono);
        }
        .sce-pagination-btns {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sce-page-btn {
          min-width: 30px;
          height: 30px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid var(--sce-border);
          background: var(--sce-surface);
          color: var(--sce-ink-2);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.1s;
          font-family: var(--sce-font-mono);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .sce-page-btn:hover:not(:disabled) {
          background: var(--sce-surface-3);
          border-color: #cbd5e1;
        }
        .sce-page-btn-active {
          background: white !important;
          color: black !important;
          border-color: var(--sce-ink) !important;
          font-weight: 600;
        }
        .sce-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Policy reference box ───────────────────────────────────────────── */
        .sce-policy-ref {
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: var(--sce-radius-lg);
          padding: 18px 22px;
          box-shadow: var(--sce-shadow-sm);
        }
        .sce-policy-ref-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--sce-ink-3);
          margin-bottom: 12px;
        }
        .sce-policy-list {
          list-style: none;
          display: grid;
          gap: 8px;
          padding: 0;
        }
        .sce-policy-list li {
          font-size: 12px;
          color: var(--sce-ink-3);
          line-height: 1.55;
          padding-left: 16px;
          position: relative;
        }
        .sce-policy-list li::before {
          content: '·';
          position: absolute;
          left: 4px;
          color: var(--sce-accent);
          font-weight: 700;
        }
        .sce-policy-list li strong { color: var(--sce-ink-2); }
        .sce-policy-list li code {
          font-family: var(--sce-font-mono);
          font-size: 11px;
          background: var(--sce-surface-3);
          padding: 1px 5px;
          border-radius: 4px;
          color: var(--sce-ink-2);
        }

        /* ── Modal ──────────────────────────────────────────────────────────── */
        .sce-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 10000;
          padding: 24px 16px 40px;
          overflow-y: auto;
        }
        .sce-modal {
          width: min(920px, 100%);
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: 18px;
          box-shadow: var(--sce-shadow-xl);
          overflow: hidden;
          margin: auto;
        }
        .sce-confirm-modal {
          width: min(520px, 100%);
        }

        /* Modal header */
        .sce-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 22px 28px 18px;
          border-bottom: 1px solid var(--sce-border);
          background: var(--sce-surface-sub);
          gap: 16px;
        }
        .sce-modal-title {
          display: block;
          font-size: 18px;
          font-weight: 700;
          // color: var(--sce-ink);
          letter-spacing: -0.2px;
        }
        .sce-modal-subtitle {
          display: block;
          font-size: 12px;
          color: var(--sce-ink-3);
          margin-top: 3px;
        }
        .sce-close-btn {
          flex-shrink: 0;
          background: rgb(0 123 96 / 10%);
          border: none;
          font-size: 22px;
          color: var(--sce-ink-4);
          cursor: pointer;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s, color 0.12s;
          line-height: 1;
        }
        .sce-close-btn:hover {
          background: rgb(0 123 96 / 10%);
          color: rgb(0 123 96);
        }

        /* Modal body padding - s-stack children get their own gap */
        .sce-modal > s-stack {
          padding: 24px 28px 0;
          display: grid;
          gap: 16px;
        }

        /* Modal footer */
        .sce-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 18px 28px;
          
        }
        .sce-footer-hint {
          font-size: 12px;
          color: var(--sce-ink-4);
        }
        .sce-footer-actions {
          display: flex;
          gap: 10px;
        }

        /* ── Section boxes inside modal ─────────────────────────────────────── */
        .sce-section-box {
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: var(--sce-radius);
          padding: 18px 20px;
          display: grid;
          gap: 12px;
        }
        .sce-section-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--sce-ink-3);
          padding-bottom: 10px;
          border-bottom: 1px solid var(--sce-border);
        }
        .sce-section-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--sce-border);
        }
        .sce-section-header-row .sce-section-title {
          padding-bottom: 0;
          border-bottom: none;
        }
        .sce-section-desc {
          font-size: 12px;
          color: var(--sce-ink-3);
          line-height: 1.5;
          margin: -4px 0;
        }

        /* Block ID display */
        .sce-id-display {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 9px;
          padding: 12px 16px;
        }
        .sce-id-value {
          font-family: var(--sce-font-mono);
          font-size: 20px;
          font-weight: 600;
          color: #15803d;
          letter-spacing: 0.12em;
          flex: 1;
        }
        .sce-id-hint {
          font-size: 11px;
          color: #4ade80;
          white-space: nowrap;
        }

        /* ── Form grid + fields ─────────────────────────────────────────────── */
        .sce-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 14px;
          align-items: start;
        }
        @media (max-width: 560px) {
          .sce-form-grid { grid-template-columns: 1fr; }
        }
        .sce-field {
          display: grid;
          gap: 6px;
        }
        .sce-field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--sce-ink-2);
          letter-spacing: 0.01em;
        }
        .sce-field-input,
        .sce-field-select {
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: 8px;
          padding: 8px 11px;
          min-height: 34px;
          font-size: 13px;
          color: black;
          outline: none;
          transition: border-color 0.14s, box-shadow 0.14s;
          width: 100%;
          font-family: inherit;
          box-sizing: border-box;
        }
        .sce-field-input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .sce-field-input[type="number"]::-webkit-outer-spin-button,
        .sce-field-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .sce-field-input:focus,
        .sce-field-select:focus {
          border-color: var(--sce-border-focus);
          box-shadow: 0 0 0 3px rgba(110,231,183,0.2);
        }
        .sce-field-input-mono {
          font-family: var(--sce-font-mono);
          font-size: 12px;
          letter-spacing: 0.04em;
        }
        .sce-field-hint {
          font-size: 11px;
          color: var(--sce-ink-4);
          line-height: 1.4;
        }

        /* Color row: swatch + input */
        .sce-color-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .sce-color-picker {
          width: 34px;
          min-width: 34px;
          height: 34px;
          border: 1px solid var(--sce-border);
          border-radius: 8px;
          padding: 2px;
          background: var(--sce-surface);
          cursor: pointer;
          flex-shrink: 0;
        }
        .sce-color-row .sce-field-input {
          min-width: 0;
        }

        /* ── Toggles / checkboxes ───────────────────────────────────────────── */
        .sce-toggle-group {
          display: grid;
          gap: 8px;
        }
        .sce-toggle-row,
        .sce-check-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 13px;
          background: var(--sce-surface-sub);
          border: 1px solid var(--sce-border);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .sce-toggle-row:hover,
        .sce-check-row:hover {
          background: var(--sce-surface-3);
        }
        .sce-toggle-label {
          font-size: 13px;
          color: var(--sce-ink-2);
          flex: 1;
        }
        .sce-checkbox {
          accent-color: var(--sce-accent);
          width: 16px;
          height: 16px;
          margin-top: 2px;
          cursor: pointer;
          flex-shrink: 0;
        }

        /* Policy-specific check rows */
        .sce-policy-checks {
          display: grid;
          gap: 8px;
        }
        .sce-check-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--sce-ink-2);
        }
        .sce-check-sub {
          display: block;
          font-size: 11px;
          color: var(--sce-ink-4);
          margin-top: 2px;
        }

        /* ── Comments textarea ──────────────────────────────────────────────── */
        .sce-comments-input {
          width: 100%;
          min-height: 90px;
          border: 1px solid var(--sce-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          line-height: 1.5; 
          background: var(--sce-surface);
          resize: vertical;
          outline: none;
          transition: border-color 0.14s, box-shadow 0.14s;
        }
        .sce-comments-input:focus {
          // border-color: var(--sce-border-focus);
          box-shadow: 0 0 0 3px rgba(110,231,183,0.2);
        }
        .sce-comments-input::placeholder { color: var(--sce-ink-4); }

        /* ── Template picker + tabs ─────────────────────────────────────────── */
        .sce-template-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 860px) {
          .sce-template-grid { grid-template-columns: 1fr; }
        }
        .sce-template-card {
          border: 1px solid var(--sce-border);
          border-radius: 10px;
          background: var(--sce-surface);
          padding: 10px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.12s, box-shadow 0.12s, transform 0.12s;
        }
        .sce-template-card:hover {
          border-color: var(--sce-border-focus);
          box-shadow: var(--sce-shadow-sm);
          transform: translateY(-1px);
        }
        .sce-template-thumb {
          height: 66px;
          border-radius: 8px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .sce-template-title {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 700;
          color: black;
        }
        .sce-template-desc {
          margin-top: 3px;
          font-size: 12px;
          color: black;
          line-height: 1.35;
        }
        .sce-editor-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--sce-border);
          border-radius: 10px;
          background: var(--sce-surface-sub);
        }
        .sce-tab-btn {
          border: 1px solid var(--sce-border);
             background: white;
          color: black;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .sce-tab-btn--active {
          background: white;
          color: black;
          border-color: rgb(0 123 96);
        }

        /* ── Messages list ──────────────────────────────────────────────────── */
        .sce-msg-list {
          display: grid;
          gap: 8px;
        }
        .sce-msg-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .sce-msg-idx {
          font-family: var(--sce-font-mono);
          font-size: 11px;
          color: var(--sce-ink-4);
          width: 18px;
          text-align: right;
          flex-shrink: 0;
        }
        .sce-msg-input {
          flex: 1;
          background: var(--sce-surface);
          border: 1px solid var(--sce-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: black;
          font-family: inherit;
          outline: none;
          transition: border-color 0.14s, box-shadow 0.14s;
          min-width: 0;
        }
        .sce-msg-input:focus {
          border-color: var(--sce-border-focus);
          box-shadow: 0 0 0 3px rgba(110,231,183,0.2);
        }
        .sce-msg-input::placeholder { color: var(--sce-ink-4); }

        /* ── Storefront preview ─────────────────────────────────────────────── */
        /* Mirrors extensions/smart-cart-experience/assets/additional-ui.css */
        .sce-extra-preview-root.sce-extra-bar {
          box-sizing: border-box;
          display: block;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .sce-extra-bar--inline.sce-extra-preview-root {
          position: relative;
        }
        .sce-extra-preview-root .sce-extra-bar__track-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .sce-extra-preview-root .sce-extra-bar__track-wrap--marquee {
          width: 100%;
          overflow: hidden;
        }
        .sce-extra-preview-root .sce-extra-bar__track {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-width: max-content;
        }
        .sce-extra-preview-root .sce-extra-bar__track--marquee {
          display: inline-flex;
          white-space: nowrap;
          will-change: transform;
          animation-name: sceExtraMarquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          gap: 0;
        }
        @keyframes sceExtraMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .sce-extra-preview-root .sce-extra-bar__item {
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
          width: fit-content;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>
    </>
  );
}

export default function AdditionalPage() {
  const data = useLoaderData();
  return (
    <AnnouncementBodyAdmin
      loaderData={data}
      showTable
      routePrefix="/app/additional"
      navigateQueryStyle="standalone"
    />
  );
}