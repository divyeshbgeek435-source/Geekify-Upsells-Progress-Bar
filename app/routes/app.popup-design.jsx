// import { useEffect, useMemo, useState } from "react";
// import { Form, useActionData, useLoaderData, useOutletContext } from "react-router";
// import {
//   defaultPopupDesignConfig,
//   generatePopupDesignId,
//   parsePopupDesignConfig,
//   resolvePopupDesignId,
// } from "../lib/popup-design-config.js";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// const POPUP_BAR_TYPE = "popup_design";

// function toDatetimeLocalValue(iso) {
//   if (!iso) return "";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }

// function fromDatetimeLocalValue(local) {
//   if (!local) return "";
//   const d = new Date(local);
//   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
// }

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const row = await prisma.announcementBar.findFirst({
//     where: { shop, barType: POPUP_BAR_TYPE },
//     orderBy: { updatedAt: "desc" },
//     select: { id: true, configJson: true, updatedAt: true },
//   });
//   const raw = row ? parsePopupDesignConfig(row.configJson) : defaultPopupDesignConfig();
//   const config = row ? { ...raw, popupDesignId: resolvePopupDesignId(raw, row.id) } : raw;
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

//   const config = parsePopupDesignConfig(
//     JSON.stringify({
//       popupDesignId: String(form.get("popupDesignId") || "").trim(),
//       headline: String(form.get("headline") || ""),
//       subheadline: String(form.get("subheadline") || ""),
//       couponCode: String(form.get("couponCode") || ""),
//       ctaText: String(form.get("ctaText") || ""),
//       ctaHref: String(form.get("ctaHref") || ""),
//       countdownEndAt: String(form.get("countdownEndAt") || "").trim(),
//       showDelayMs: Number(form.get("showDelayMs") || 1200),
//       leftPanelBg: String(form.get("leftPanelBg") || ""),
//       rightPanelBg: String(form.get("rightPanelBg") || ""),
//       accentGold: String(form.get("accentGold") || ""),
//       headlineColor: String(form.get("headlineColor") || ""),
//       subheadlineColor: String(form.get("subheadlineColor") || ""),
//       buttonBg: String(form.get("buttonBg") || ""),
//       buttonText: String(form.get("buttonText") || ""),
//       overlayBg: String(form.get("overlayBg") || ""),
//     }),
//   );

//   const configJson = JSON.stringify(config);
//   const existing = await prisma.announcementBar.findFirst({
//     where: { shop, barType: POPUP_BAR_TYPE },
//     select: { id: true },
//   });

//   if (existing) {
//     const updated = await prisma.announcementBar.update({
//       where: { id: existing.id },
//       data: {
//         name: "Popup design",
//         barType: POPUP_BAR_TYPE,
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
//       name: "Popup design",
//       barType: POPUP_BAR_TYPE,
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

// function CountdownPreview({ endAtIso }) {
//   const [now, setNow] = useState(() => Date.now());
//   useEffect(() => {
//     const t = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, []);

//   const parts = useMemo(() => {
//     if (!endAtIso) return { d: "00", h: "00", m: "00", s: "00" };
//     const end = new Date(endAtIso).getTime();
//     if (Number.isNaN(end)) return { d: "00", h: "00", m: "00", s: "00" };
//     let sec = Math.max(0, Math.floor((end - now) / 1000));
//     const d = Math.floor(sec / 86400);
//     sec -= d * 86400;
//     const h = Math.floor(sec / 3600);
//     sec -= h * 3600;
//     const m = Math.floor(sec / 60);
//     sec -= m * 60;
//     const pad = (n) => String(n).padStart(2, "0");
//     return { d: pad(d), h: pad(h), m: pad(m), s: pad(sec) };
//   }, [endAtIso, now]);

//   const box = (v) => (
//     <span
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         justifyContent: "center",
//         minWidth: 36,
//         height: 36,
//         background: "#e2e8f0",
//         borderRadius: 8,
//         fontWeight: 700,
//         fontSize: 14,
//         color: "#0f172a",
//         padding: "0 6px",
//       }}
//     >
//       {v}
//     </span>
//   );

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
//       {box(parts.d)}
//       {box(parts.h)}
//       <span style={{ fontWeight: 800 }}>:</span>
//       {box(parts.m)}
//       <span style={{ fontWeight: 800 }}>:</span>
//       {box(parts.s)}
//     </div>
//   );
// }

// export default function PopupDesignPage() {
//   const { config: loadedConfig, savedAt: loadedSavedAt } = useLoaderData();
//   const actionData = useActionData();
//   const { onboarding } = useOutletContext() || {};

//   const [popupDesignId, setPopupDesignId] = useState(loadedConfig.popupDesignId || "");
//   const [headline, setHeadline] = useState(loadedConfig.headline);
//   const [subheadline, setSubheadline] = useState(loadedConfig.subheadline);
//   const [couponCode, setCouponCode] = useState(loadedConfig.couponCode);
//   const [ctaText, setCtaText] = useState(loadedConfig.ctaText);
//   const [ctaHref, setCtaHref] = useState(loadedConfig.ctaHref);
//   const [countdownEndAt, setCountdownEndAt] = useState(loadedConfig.countdownEndAt);
//   const [countdownLocal, setCountdownLocal] = useState(() => toDatetimeLocalValue(loadedConfig.countdownEndAt));
//   const [showDelayMs, setShowDelayMs] = useState(loadedConfig.showDelayMs);
//   const [leftPanelBg, setLeftPanelBg] = useState(loadedConfig.leftPanelBg);
//   const [rightPanelBg, setRightPanelBg] = useState(loadedConfig.rightPanelBg);
//   const [accentGold, setAccentGold] = useState(loadedConfig.accentGold);
//   const [headlineColor, setHeadlineColor] = useState(loadedConfig.headlineColor);
//   const [subheadlineColor, setSubheadlineColor] = useState(loadedConfig.subheadlineColor);
//   const [buttonBg, setButtonBg] = useState(loadedConfig.buttonBg);
//   const [buttonText, setButtonText] = useState(loadedConfig.buttonText);
//   const [overlayBg, setOverlayBg] = useState(loadedConfig.overlayBg);

//   const syncCountdownFromLocal = (local) => {
//     setCountdownLocal(local);
//     setCountdownEndAt(fromDatetimeLocalValue(local));
//   };

//   return (
//     <s-page heading="Popup design">
//       <s-stack direction="block" gap="base">
//         {!onboarding?.clientIdConfigured ? (
//           <s-paragraph>
//             <s-text tone="critical">
//               Set <code>SHOPIFY_API_KEY</code> in <code>.env</code> to enable direct &quot;add block&quot; deep links.
//             </s-text>
//           </s-paragraph>
//         ) : null}
//         {actionData?.ok ? (
//           <s-banner tone="success" heading="Saved to Prisma">
//             Saved at {new Date(actionData.savedAt || Date.now()).toLocaleString()}.
//           </s-banner>
//         ) : null}
//         {actionData?.ok === false && actionData?.error ? (
//           <s-banner tone="critical" heading="Save failed">
//             {actionData.error}
//           </s-banner>
//         ) : null}
//         {!actionData?.ok && loadedSavedAt ? (
//           <s-paragraph>
//             <s-text tone="subdued">Last saved at {new Date(loadedSavedAt).toLocaleString()}.</s-text>
//           </s-paragraph>
//         ) : null}

//         <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
//           <s-stack direction="block" gap="small">
//             <s-text type="strong">Live preview</s-text>
//             <div
//               style={{
//                 maxWidth: 560,
//                 margin: "0 auto",
//                 borderRadius: 12,
//                 overflow: "hidden",
//                 boxShadow: "0 12px 40px rgba(15,23,42,0.15)",
//                 display: "flex",
//                 minHeight: 260,
//                 fontFamily: "system-ui, sans-serif",
//               }}
//             >
//               <div
//                 style={{
//                   flex: 1,
//                   background: leftPanelBg,
//                   position: "relative",
//                   minWidth: 120,
//                 }}
//               >
//                 <div
//                   style={{
//                     position: "absolute",
//                     width: 72,
//                     height: 72,
//                     borderRadius: "50%",
//                     background: `radial-gradient(circle at 30% 30%, ${accentGold}, #8a7020)`,
//                     opacity: 0.85,
//                     top: 16,
//                     left: 12,
//                   }}
//                 />
//                 <div
//                   style={{
//                     position: "absolute",
//                     width: 96,
//                     height: 96,
//                     borderRadius: "50%",
//                     background: `radial-gradient(circle at 40% 35%, ${accentGold}, #6b5a18)`,
//                     opacity: 0.75,
//                     top: 8,
//                     left: "42%",
//                   }}
//                 />
//                 <div
//                   style={{
//                     position: "absolute",
//                     bottom: 28,
//                     left: "50%",
//                     transform: "translateX(-50%)",
//                     width: 88,
//                     height: 44,
//                     borderRadius: "40% 40% 12px 12px",
//                     background: `linear-gradient(180deg, ${accentGold}, #7a6318)`,
//                     boxShadow: "0 6px 0 rgba(0,0,0,0.12)",
//                   }}
//                 />
//                 <div
//                   style={{
//                     position: "absolute",
//                     bottom: 62,
//                     left: "50%",
//                     transform: "translateX(-50%)",
//                     width: 36,
//                     height: 28,
//                     borderRadius: "8px 8px 16px 16px",
//                     background: "#15803d",
//                   }}
//                 />
//               </div>
//               <div
//                 style={{
//                   flex: 1,
//                   background: rightPanelBg,
//                   padding: "24px 20px",
//                   position: "relative",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 12,
//                 }}
//               >
//                 <div style={{ position: "absolute", top: 10, right: 12, fontSize: 20, color: headlineColor }}>
//                   ×
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 20,
//                     fontWeight: 800,
//                     color: headlineColor,
//                     letterSpacing: "0.02em",
//                     lineHeight: 1.15,
//                     paddingRight: 20,
//                   }}
//                 >
//                   {headline}
//                 </div>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     fontWeight: 700,
//                     color: subheadlineColor,
//                     letterSpacing: "0.12em",
//                   }}
//                 >
//                   {subheadline}
//                 </div>
//                 <CountdownPreview endAtIso={countdownEndAt} />
//                 <div
//                   style={{
//                     border: "2px dashed #64748b",
//                     borderRadius: 6,
//                     padding: "10px 12px",
//                     textAlign: "center",
//                     fontWeight: 700,
//                     fontSize: 13,
//                     letterSpacing: "0.08em",
//                     color: headlineColor,
//                   }}
//                 >
//                   {couponCode}
//                 </div>
//                 <button
//                   type="button"
//                   style={{
//                     marginTop: 4,
//                     background: buttonBg,
//                     color: buttonText,
//                     border: "none",
//                     borderRadius: 6,
//                     padding: "12px 16px",
//                     fontWeight: 600,
//                     fontSize: 14,
//                     cursor: "default",
//                   }}
//                 >
//                   {ctaText}
//                 </button>
//               </div>
//             </div>
//           </s-stack>
//         </s-box>

//         <s-text type="strong">Connect to the theme</s-text>
//         <s-paragraph>
//           <s-text tone="subdued">
//             Copy the Popup design ID into the &quot;Popup design&quot; app block in the theme editor. The storefront
//             loads this page&apos;s saved design only when the ID matches exactly (same idea as the Announcement UI lab
//             Section ID).
//           </s-text>
//         </s-paragraph>
//         <s-stack direction="inline" gap="small">
//           <s-text-field
//             label="Popup design ID"
//             value={popupDesignId}
//             onChange={(e) => setPopupDesignId(e.currentTarget.value)}
//             autocomplete="off"
//           />
//           <s-button type="button" variant="secondary" onClick={() => setPopupDesignId(generatePopupDesignId())}>
//             Generate new ID
//           </s-button>
//         </s-stack>

//         <s-divider />

//         <s-grid gridTemplateColumns="repeat(2, minmax(220px, 1fr))" gap="base">
//           <s-text-field label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} />
//           <s-text-field label="Sub-headline" value={subheadline} onChange={(e) => setSubheadline(e.currentTarget.value)} />
//           <s-text-field label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.currentTarget.value)} />
//           <s-text-field label="CTA label" value={ctaText} onChange={(e) => setCtaText(e.currentTarget.value)} />
//           <s-text-field
//             label="CTA link (optional)"
//             value={ctaHref}
//             onChange={(e) => setCtaHref(e.currentTarget.value)}
//             placeholder="https://..."
//           />
//           <s-text-field
//             label="Show delay (ms)"
//             type="number"
//             min={0}
//             max={60000}
//             value={String(showDelayMs)}
//             onChange={(e) => setShowDelayMs(Math.max(0, Number(e.currentTarget.value) || 0))}
//           />
//           <s-text-field
//             label="Countdown end"
//             type="datetime-local"
//             value={countdownLocal}
//             onChange={(e) => syncCountdownFromLocal(e.currentTarget.value)}
//           />
//         </s-grid>

//         <s-text type="strong">Colors</s-text>
//         <s-grid gridTemplateColumns="repeat(2, minmax(220px, 1fr))" gap="base">
//           <s-text-field label="Left panel" value={leftPanelBg} onChange={(e) => setLeftPanelBg(e.currentTarget.value)} />
//           <s-text-field
//             label="Right panel"
//             value={rightPanelBg}
//             onChange={(e) => setRightPanelBg(e.currentTarget.value)}
//           />
//           <s-text-field label="Gold accents" value={accentGold} onChange={(e) => setAccentGold(e.currentTarget.value)} />
//           <s-text-field
//             label="Headline color"
//             value={headlineColor}
//             onChange={(e) => setHeadlineColor(e.currentTarget.value)}
//           />
//           <s-text-field
//             label="Sub-headline color"
//             value={subheadlineColor}
//             onChange={(e) => setSubheadlineColor(e.currentTarget.value)}
//           />
//           <s-text-field label="Button background" value={buttonBg} onChange={(e) => setButtonBg(e.currentTarget.value)} />
//           <s-text-field label="Button text" value={buttonText} onChange={(e) => setButtonText(e.currentTarget.value)} />
//           <s-text-field label="Overlay" value={overlayBg} onChange={(e) => setOverlayBg(e.currentTarget.value)} />
//         </s-grid>

//         <Form method="post">
//           <input type="hidden" name="intent" value="save" />
//           <input type="hidden" name="popupDesignId" value={popupDesignId} />
//           <input type="hidden" name="headline" value={headline} />
//           <input type="hidden" name="subheadline" value={subheadline} />
//           <input type="hidden" name="couponCode" value={couponCode} />
//           <input type="hidden" name="ctaText" value={ctaText} />
//           <input type="hidden" name="ctaHref" value={ctaHref} />
//           <input type="hidden" name="countdownEndAt" value={countdownEndAt} />
//           <input type="hidden" name="showDelayMs" value={String(showDelayMs)} />
//           <input type="hidden" name="leftPanelBg" value={leftPanelBg} />
//           <input type="hidden" name="rightPanelBg" value={rightPanelBg} />
//           <input type="hidden" name="accentGold" value={accentGold} />
//           <input type="hidden" name="headlineColor" value={headlineColor} />
//           <input type="hidden" name="subheadlineColor" value={subheadlineColor} />
//           <input type="hidden" name="buttonBg" value={buttonBg} />
//           <input type="hidden" name="buttonText" value={buttonText} />
//           <input type="hidden" name="overlayBg" value={overlayBg} />
//           <s-button type="submit" variant="primary">
//             Save to Prisma
//           </s-button>
//         </Form>
//       </s-stack>
//     </s-page>
//   );
// }




















// import { useEffect, useMemo, useState, useCallback } from "react";
// import { Form, useActionData, useLoaderData, useOutletContext } from "react-router";
// import {
//   defaultPopupDesignConfig,
//   generatePopupDesignId,
//   parsePopupDesignConfig,
//   resolvePopupDesignId,
// } from "../lib/popup-design-config.js";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// /* ─── Fonts injected once ─────────────────────────────────────────────────── */
// const fontStyle = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`;

// /* ─── Preset themes ───────────────────────────────────────────────────────── */
// const PRESETS = [
//   {
//     name: "Midnight Gold",
//     emoji: "✦",
//     leftPanelBg: "#0f0e1a",
//     rightPanelBg: "#1a1728",
//     accentGold: "#c9a84c",
//     headlineColor: "#f0ede8",
//     subheadlineColor: "#c9a84c",
//     buttonBg: "#c9a84c",
//     buttonText: "#0f0e1a",
//     overlayBg: "rgba(15,14,26,0.82)",
//   },
//   {
//     name: "Ivory Rose",
//     emoji: "❋",
//     leftPanelBg: "#f8f0ec",
//     rightPanelBg: "#fff8f5",
//     accentGold: "#d4787a",
//     headlineColor: "#2d1b1c",
//     subheadlineColor: "#9c5c5e",
//     buttonBg: "#d4787a",
//     buttonText: "#fff8f5",
//     overlayBg: "rgba(240,230,225,0.85)",
//   },
//   {
//     name: "Forest Mist",
//     emoji: "◈",
//     leftPanelBg: "#12261e",
//     rightPanelBg: "#1a3028",
//     accentGold: "#6aaa6a",
//     headlineColor: "#e8f4e8",
//     subheadlineColor: "#6aaa6a",
//     buttonBg: "#6aaa6a",
//     buttonText: "#0d1f16",
//     overlayBg: "rgba(12,26,20,0.82)",
//   },
//   {
//     name: "Ocean Slate",
//     emoji: "◇",
//     leftPanelBg: "#0d1b2a",
//     rightPanelBg: "#152235",
//     accentGold: "#4a9eca",
//     headlineColor: "#dff0fa",
//     subheadlineColor: "#4a9eca",
//     buttonBg: "#4a9eca",
//     buttonText: "#0d1b2a",
//     overlayBg: "rgba(13,27,42,0.82)",
//   },
//   {
//     name: "Linen Sand",
//     emoji: "◉",
//     leftPanelBg: "#f5efe6",
//     rightPanelBg: "#faf6f0",
//     accentGold: "#b8860b",
//     headlineColor: "#2c2416",
//     subheadlineColor: "#8a6820",
//     buttonBg: "#2c2416",
//     buttonText: "#faf6f0",
//     overlayBg: "rgba(245,239,230,0.88)",
//   },
// ];

// /* ─── Helpers ─────────────────────────────────────────────────────────────── */
// function toDatetimeLocalValue(iso) {
//   if (!iso) return "";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }
// function fromDatetimeLocalValue(local) {
//   if (!local) return "";
//   const d = new Date(local);
//   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
// }

// /* ─── Loader / Action ─────────────────────────────────────────────────────── */
// const POPUP_BAR_TYPE = "popup_design";

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const row = await prisma.announcementBar.findFirst({
//     where: { shop, barType: POPUP_BAR_TYPE },
//     orderBy: { updatedAt: "desc" },
//     select: { id: true, configJson: true, updatedAt: true },
//   });
//   const raw = row ? parsePopupDesignConfig(row.configJson) : defaultPopupDesignConfig();
//   const config = row ? { ...raw, popupDesignId: resolvePopupDesignId(raw, row.id) } : raw;
//   return { config, savedId: row?.id ?? null, savedAt: row?.updatedAt?.toISOString?.() || null };
// };

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   if (String(form.get("intent") || "") !== "save") return { ok: false, error: "Unknown action." };
//   const config = parsePopupDesignConfig(
//     JSON.stringify({
//       popupDesignId: String(form.get("popupDesignId") || "").trim(),
//       headline: String(form.get("headline") || ""),
//       subheadline: String(form.get("subheadline") || ""),
//       couponCode: String(form.get("couponCode") || ""),
//       ctaText: String(form.get("ctaText") || ""),
//       ctaHref: String(form.get("ctaHref") || ""),
//       countdownEndAt: String(form.get("countdownEndAt") || "").trim(),
//       showDelayMs: Number(form.get("showDelayMs") || 1200),
//       leftPanelBg: String(form.get("leftPanelBg") || ""),
//       rightPanelBg: String(form.get("rightPanelBg") || ""),
//       accentGold: String(form.get("accentGold") || ""),
//       headlineColor: String(form.get("headlineColor") || ""),
//       subheadlineColor: String(form.get("subheadlineColor") || ""),
//       buttonBg: String(form.get("buttonBg") || ""),
//       buttonText: String(form.get("buttonText") || ""),
//       overlayBg: String(form.get("overlayBg") || ""),
//     }),
//   );
//   const configJson = JSON.stringify(config);
//   const existing = await prisma.announcementBar.findFirst({ where: { shop, barType: POPUP_BAR_TYPE }, select: { id: true } });
//   if (existing) {
//     const updated = await prisma.announcementBar.update({
//       where: { id: existing.id },
//       data: { name: "Popup design", barType: POPUP_BAR_TYPE, configJson, active: false },
//       select: { id: true, updatedAt: true },
//     });
//     return { ok: true, savedId: updated.id, savedAt: updated.updatedAt.toISOString() };
//   }
//   const created = await prisma.announcementBar.create({
//     data: { shop, name: "Popup design", barType: POPUP_BAR_TYPE, configJson, active: false, customHtml: "", customLiquid: "", customCss: "" },
//     select: { id: true, updatedAt: true },
//   });
//   return { ok: true, savedId: created.id, savedAt: created.updatedAt.toISOString() };
// };

// /* ─── Countdown ───────────────────────────────────────────────────────────── */
// function CountdownPreview({ endAtIso, accent, textColor }) {
//   const [now, setNow] = useState(() => Date.now());
//   useEffect(() => {
//     const t = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, []);
//   const parts = useMemo(() => {
//     if (!endAtIso) return { d: "00", h: "00", m: "00", s: "00" };
//     const end = new Date(endAtIso).getTime();
//     if (Number.isNaN(end)) return { d: "00", h: "00", m: "00", s: "00" };
//     let sec = Math.max(0, Math.floor((end - now) / 1000));
//     const d = Math.floor(sec / 86400); sec -= d * 86400;
//     const h = Math.floor(sec / 3600); sec -= h * 3600;
//     const m = Math.floor(sec / 60); sec -= m * 60;
//     const pad = (n) => String(n).padStart(2, "0");
//     return { d: pad(d), h: pad(h), m: pad(m), s: pad(sec) };
//   }, [endAtIso, now]);

//   const unit = (val, label) => (
//     <div style={{ textAlign: "center", minWidth: 38 }}>
//       <div style={{
//         background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
//         borderRadius: 6, padding: "5px 2px",
//         fontWeight: 700, fontSize: 15, letterSpacing: "0.04em",
//         color: accent, fontFamily: "'DM Sans', sans-serif",
//       }}>{val}</div>
//       <div style={{ fontSize: 9, color: textColor, opacity: 0.55, marginTop: 2, letterSpacing: "0.1em" }}>{label}</div>
//     </div>
//   );
//   const sep = <div style={{ color: accent, fontWeight: 700, fontSize: 14, marginTop: -6 }}>:</div>;

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
//       {unit(parts.d, "DAYS")}{sep}{unit(parts.h, "HRS")}{sep}{unit(parts.m, "MIN")}{sep}{unit(parts.s, "SEC")}
//     </div>
//   );
// }

// /* ─── Color Field ─────────────────────────────────────────────────────────── */
// function ColorField({ label, value, onChange }) {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
//       <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
//         {label}
//       </label>
//       <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//         <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
//           <div style={{
//             width: 36, height: 36, borderRadius: 8, background: value,
//             border: "2px solid rgba(255,255,255,0.15)", cursor: "pointer",
//             boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
//           }} />
//           <input type="color" value={value.startsWith("#") ? value : "#ffffff"}
//             onChange={(e) => onChange(e.target.value)}
//             style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
//         </div>
//         <input
//           type="text" value={value} onChange={(e) => onChange(e.currentTarget.value)}
//           style={{
//             flex: 1, background: "var(--surface)", border: "1.5px solid var(--border)",
//             borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text)",
//             fontFamily: "'DM Sans', monospace", outline: "none",
//             transition: "border-color 0.2s",
//           }}
//           onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
//           onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
//         />
//       </div>
//     </div>
//   );
// }

// /* ─── Text Field ──────────────────────────────────────────────────────────── */
// function TextField({ label, value, onChange, type = "text", placeholder, min, max }) {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
//       <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
//         {label}
//       </label>
//       <input
//         type={type} value={value} onChange={onChange} placeholder={placeholder}
//         min={min} max={max}
//         style={{
//           background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 8,
//           padding: "9px 12px", fontSize: 13, color: "var(--text)", fontFamily: "'DM Sans', sans-serif",
//           outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", width: "100%", boxSizing: "border-box",
//         }}
//         onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.15)"; }}
//         onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
//       />
//     </div>
//   );
// }

// /* ─── Section Label ───────────────────────────────────────────────────────── */
// function SectionLabel({ children, accent }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 14px" }}>
//       <div style={{ width: 3, height: 16, borderRadius: 2, background: accent || "var(--accent)" }} />
//       <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>
//         {children}
//       </span>
//     </div>
//   );
// }

// /* ─── Main Page ───────────────────────────────────────────────────────────── */
// export default function PopupDesignPage() {
//   const { config: loadedConfig, savedAt: loadedSavedAt } = useLoaderData();
//   const actionData = useActionData();
//   const { onboarding } = useOutletContext() || {};

//   const [popupDesignId, setPopupDesignId] = useState(loadedConfig.popupDesignId || "");
//   const [headline, setHeadline] = useState(loadedConfig.headline);
//   const [subheadline, setSubheadline] = useState(loadedConfig.subheadline);
//   const [couponCode, setCouponCode] = useState(loadedConfig.couponCode);
//   const [ctaText, setCtaText] = useState(loadedConfig.ctaText);
//   const [ctaHref, setCtaHref] = useState(loadedConfig.ctaHref);
//   const [countdownEndAt, setCountdownEndAt] = useState(loadedConfig.countdownEndAt);
//   const [countdownLocal, setCountdownLocal] = useState(() => toDatetimeLocalValue(loadedConfig.countdownEndAt));
//   const [showDelayMs, setShowDelayMs] = useState(loadedConfig.showDelayMs);
//   const [leftPanelBg, setLeftPanelBg] = useState(loadedConfig.leftPanelBg);
//   const [rightPanelBg, setRightPanelBg] = useState(loadedConfig.rightPanelBg);
//   const [accentGold, setAccentGold] = useState(loadedConfig.accentGold);
//   const [headlineColor, setHeadlineColor] = useState(loadedConfig.headlineColor);
//   const [subheadlineColor, setSubheadlineColor] = useState(loadedConfig.subheadlineColor);
//   const [buttonBg, setButtonBg] = useState(loadedConfig.buttonBg);
//   const [buttonText, setButtonText] = useState(loadedConfig.buttonText);
//   const [overlayBg, setOverlayBg] = useState(loadedConfig.overlayBg);
//   const [activePreset, setActivePreset] = useState(null);
//   const [copied, setCopied] = useState(false);

//   const applyPreset = useCallback((preset, idx) => {
//     setActivePreset(idx);
//     setLeftPanelBg(preset.leftPanelBg);
//     setRightPanelBg(preset.rightPanelBg);
//     setAccentGold(preset.accentGold);
//     setHeadlineColor(preset.headlineColor);
//     setSubheadlineColor(preset.subheadlineColor);
//     setButtonBg(preset.buttonBg);
//     setButtonText(preset.buttonText);
//     setOverlayBg(preset.overlayBg);
//   }, []);

//   const syncCountdownFromLocal = (local) => {
//     setCountdownLocal(local);
//     setCountdownEndAt(fromDatetimeLocalValue(local));
//   };

//   const handleCopyId = () => {
//     navigator.clipboard?.writeText(popupDesignId);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 1800);
//   };

//   /* ── CSS vars injected via a <style> tag ── */
//   const cssVars = `
//     ${fontStyle}
//     :root {
//       --bg: #0a0a10;
//       --panel: #111118;
//       --surface: #18181f;
//       --surface2: #1f1f28;
//       --border: rgba(255,255,255,0.09);
//       --border2: rgba(255,255,255,0.15);
//       --text: #f0ede8;
//       --muted: #7a798e;
//       --accent: #c9a84c;
//       --accent-dim: rgba(201,168,76,0.12);
//       --radius: 12px;
//     }
//   `;

//   return (
//     <>
//       <style>{cssVars}</style>
//       <div style={{
//         fontFamily: "'DM Sans', system-ui, sans-serif",
//         background: "var(--bg)",
//         minHeight: "100vh",
//         color: "var(--text)",
//         padding: "0 0 80px",
//       }}>

//         {/* ── Header ─────────────────────────────────────────────────── */}
//         <div style={{
//           borderBottom: "1px solid var(--border)",
//           padding: "28px 40px 22px",
//           background: "var(--panel)",
//           position: "sticky", top: 0, zIndex: 50,
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//         }}>
//           <div>
//             <div style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--accent)", fontWeight: 600, marginBottom: 4 }}>
//               POPUP DESIGNER
//             </div>
//             <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.01em" }}>
//               Design Studio
//             </h1>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             {actionData?.ok && (
//               <div style={{
//                 display: "flex", alignItems: "center", gap: 7,
//                 background: "rgba(106,170,106,0.12)", border: "1px solid rgba(106,170,106,0.3)",
//                 borderRadius: 8, padding: "7px 14px", fontSize: 12, color: "#6aaa6a",
//               }}>
//                 <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6aaa6a", display: "inline-block" }} />
//                 Saved {new Date(actionData.savedAt || Date.now()).toLocaleTimeString()}
//               </div>
//             )}
//             {!actionData?.ok && loadedSavedAt && (
//               <div style={{ fontSize: 12, color: "var(--muted)" }}>
//                 Last saved {new Date(loadedSavedAt).toLocaleString()}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ── Alerts ─────────────────────────────────────────────────── */}
//         {actionData?.ok === false && actionData?.error && (
//           <div style={{
//             margin: "20px 40px 0", padding: "14px 18px",
//             background: "rgba(226,75,74,0.1)", border: "1px solid rgba(226,75,74,0.3)",
//             borderRadius: 10, color: "#e87575", fontSize: 13,
//           }}>
//             ⚠ {actionData.error}
//           </div>
//         )}

//         {/* ── Main Layout ────────────────────────────────────────────── */}
//         <div style={{ display: "grid", gridTemplateColumns: "460px 1fr", gap: 0, maxWidth: 1400, margin: "0 auto", padding: "32px 40px", alignItems: "start" }}>

//           {/* LEFT: Controls ─────────────────────────────────────────── */}
//           <div style={{ paddingRight: 36 }}>

//             {/* Preset Themes */}
//             <SectionLabel>Preset Themes</SectionLabel>
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
//               {PRESETS.map((p, i) => (
//                 <button
//                   key={p.name} type="button"
//                   onClick={() => applyPreset(p, i)}
//                   style={{
//                     background: p.leftPanelBg,
//                     border: activePreset === i
//                       ? `2px solid ${p.accentGold}`
//                       : "2px solid transparent",
//                     borderRadius: 10, padding: "10px 6px", cursor: "pointer",
//                     display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
//                     transition: "transform 0.15s, border-color 0.2s",
//                     transform: activePreset === i ? "scale(1.04)" : "scale(1)",
//                   }}
//                   onMouseEnter={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1.03)"; }}
//                   onMouseLeave={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1)"; }}
//                 >
//                   <span style={{ fontSize: 16, color: p.accentGold }}>{p.emoji}</span>
//                   <span style={{ fontSize: 9, color: p.headlineColor, fontWeight: 600, letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.2 }}>
//                     {p.name}
//                   </span>
//                 </button>
//               ))}
//             </div>

//             {/* Design ID */}
//             <SectionLabel>Popup Design ID</SectionLabel>
//             <div style={{ display: "flex", gap: 8 }}>
//               <div style={{ flex: 1, position: "relative" }}>
//                 <input
//                   type="text" value={popupDesignId}
//                   onChange={(e) => setPopupDesignId(e.currentTarget.value)}
//                   placeholder="e.g. popup_summer_2025"
//                   style={{
//                     width: "100%", boxSizing: "border-box",
//                     background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 8,
//                     padding: "9px 12px", fontSize: 12, color: "var(--text)",
//                     fontFamily: "monospace", outline: "none",
//                   }}
//                 />
//               </div>
//               <button type="button" onClick={handleCopyId}
//                 style={{
//                   background: copied ? "rgba(106,170,106,0.15)" : "var(--accent-dim)",
//                   border: `1.5px solid ${copied ? "rgba(106,170,106,0.4)" : "rgba(201,168,76,0.3)"}`,
//                   color: copied ? "#6aaa6a" : "var(--accent)",
//                   borderRadius: 8, padding: "9px 13px", fontSize: 11, fontWeight: 600,
//                   cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.2s",
//                 }}
//               >
//                 {copied ? "✓ COPIED" : "COPY"}
//               </button>
//               <button type="button" onClick={() => setPopupDesignId(generatePopupDesignId())}
//                 style={{
//                   background: "var(--surface)", border: "1.5px solid var(--border)",
//                   color: "var(--muted)", borderRadius: 8, padding: "9px 12px",
//                   fontSize: 11, cursor: "pointer", fontWeight: 600, letterSpacing: "0.06em",
//                   transition: "color 0.2s",
//                 }}
//                 onMouseEnter={(e) => (e.target.style.color = "var(--text)")}
//                 onMouseLeave={(e) => (e.target.style.color = "var(--muted)")}
//               >
//                 ↻ NEW
//               </button>
//             </div>

//             {/* Content */}
//             <SectionLabel>Content</SectionLabel>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//               <TextField label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} />
//               <TextField label="Sub-headline" value={subheadline} onChange={(e) => setSubheadline(e.currentTarget.value)} />
//               <TextField label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.currentTarget.value)} />
//               <TextField label="CTA label" value={ctaText} onChange={(e) => setCtaText(e.currentTarget.value)} />
//             </div>
//             <div style={{ marginTop: 12 }}>
//               <TextField label="CTA link (optional)" value={ctaHref} onChange={(e) => setCtaHref(e.currentTarget.value)} placeholder="https://..." />
//             </div>

//             {/* Timing */}
//             <SectionLabel>Timing</SectionLabel>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//               <TextField
//                 label="Show delay (ms)" type="number" min={0} max={60000}
//                 value={String(showDelayMs)}
//                 onChange={(e) => setShowDelayMs(Math.max(0, Number(e.currentTarget.value) || 0))}
//               />
//               <TextField
//                 label="Countdown end" type="datetime-local"
//                 value={countdownLocal}
//                 onChange={(e) => syncCountdownFromLocal(e.currentTarget.value)}
//               />
//             </div>
//             <div style={{ marginTop: 10 }}>
//               <input type="range" min={0} max={10000} step={100} value={showDelayMs}
//                 onChange={(e) => setShowDelayMs(Number(e.target.value))}
//                 style={{ width: "100%", accentColor: "var(--accent)" }}
//               />
//               <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
//                 <span>Instant</span>
//                 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{showDelayMs}ms</span>
//                 <span>10s</span>
//               </div>
//             </div>

//             {/* Colors */}
//             <SectionLabel>Color Palette</SectionLabel>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
//               <ColorField label="Left panel" value={leftPanelBg} onChange={setLeftPanelBg} />
//               <ColorField label="Right panel" value={rightPanelBg} onChange={setRightPanelBg} />
//               <ColorField label="Accent / Gold" value={accentGold} onChange={setAccentGold} />
//               <ColorField label="Headline" value={headlineColor} onChange={setHeadlineColor} />
//               <ColorField label="Sub-headline" value={subheadlineColor} onChange={setSubheadlineColor} />
//               <ColorField label="Button BG" value={buttonBg} onChange={setButtonBg} />
//               <ColorField label="Button text" value={buttonText} onChange={setButtonText} />
//               <ColorField label="Overlay" value={overlayBg} onChange={setOverlayBg} />
//             </div>

//             {/* Save */}
//             <div style={{ marginTop: 28 }}>
//               <Form method="post">
//                 <input type="hidden" name="intent" value="save" />
//                 <input type="hidden" name="popupDesignId" value={popupDesignId} />
//                 <input type="hidden" name="headline" value={headline} />
//                 <input type="hidden" name="subheadline" value={subheadline} />
//                 <input type="hidden" name="couponCode" value={couponCode} />
//                 <input type="hidden" name="ctaText" value={ctaText} />
//                 <input type="hidden" name="ctaHref" value={ctaHref} />
//                 <input type="hidden" name="countdownEndAt" value={countdownEndAt} />
//                 <input type="hidden" name="showDelayMs" value={String(showDelayMs)} />
//                 <input type="hidden" name="leftPanelBg" value={leftPanelBg} />
//                 <input type="hidden" name="rightPanelBg" value={rightPanelBg} />
//                 <input type="hidden" name="accentGold" value={accentGold} />
//                 <input type="hidden" name="headlineColor" value={headlineColor} />
//                 <input type="hidden" name="subheadlineColor" value={subheadlineColor} />
//                 <input type="hidden" name="buttonBg" value={buttonBg} />
//                 <input type="hidden" name="buttonText" value={buttonText} />
//                 <input type="hidden" name="overlayBg" value={overlayBg} />
//                 <button type="submit"
//                   style={{
//                     width: "100%", background: "var(--accent)", color: "#0a0a10",
//                     border: "none", borderRadius: 10, padding: "14px 24px",
//                     fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
//                     cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
//                     transition: "opacity 0.2s, transform 0.15s",
//                     boxShadow: "0 4px 24px rgba(201,168,76,0.35)",
//                   }}
//                   onMouseEnter={(e) => { e.target.style.opacity = "0.88"; e.target.style.transform = "translateY(-1px)"; }}
//                   onMouseLeave={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }}
//                 >
//                   SAVE TO DATABASE
//                 </button>
//               </Form>
//             </div>
//           </div>

//           {/* RIGHT: Live Preview ─────────────────────────────────────── */}
//           <div style={{ position: "sticky", top: 96 }}>
//             <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--muted)", fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
//               LIVE PREVIEW
//             </div>

//             {/* Backdrop simulation */}
//             <div style={{
//               borderRadius: 16, overflow: "hidden",
//               background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
//               padding: "60px 40px",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               minHeight: 400,
//               position: "relative",
//             }}>
//               {/* Fake page content behind */}
//               <div style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
//                 {[...Array(5)].map((_, i) => (
//                   <div key={i} style={{ height: 8, background: "rgba(255,255,255,0.3)", borderRadius: 4, margin: "20px 30px", width: `${60 + i * 8}%` }} />
//                 ))}
//               </div>

//               {/* Overlay */}
//               <div style={{
//                 position: "absolute", inset: 0,
//                 background: overlayBg,
//                 borderRadius: 16,
//               }} />

//               {/* Popup modal */}
//               <div style={{
//                 position: "relative", zIndex: 2,
//                 width: "100%", maxWidth: 520,
//                 borderRadius: 16,
//                 overflow: "hidden",
//                 display: "flex",
//                 boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
//               }}>
//                 {/* Left decorative panel */}
//                 <div style={{
//                   width: 160, flexShrink: 0,
//                   background: leftPanelBg,
//                   position: "relative",
//                   overflow: "hidden",
//                 }}>
//                   {/* Decorative orbs */}
//                   <div style={{
//                     position: "absolute", width: 90, height: 90, borderRadius: "50%",
//                     background: accentGold, opacity: 0.35,
//                     top: -20, left: -20,
//                   }} />
//                   <div style={{
//                     position: "absolute", width: 70, height: 70, borderRadius: "50%",
//                     background: accentGold, opacity: 0.2,
//                     top: 50, left: 50,
//                   }} />
//                   <div style={{
//                     position: "absolute", width: 120, height: 120, borderRadius: "50%",
//                     background: accentGold, opacity: 0.15,
//                     bottom: -30, left: -20,
//                   }} />
//                   {/* Bottle silhouette */}
//                   <div style={{
//                     position: "absolute", bottom: 32, left: "50%",
//                     transform: "translateX(-50%)",
//                   }}>
//                     <div style={{ width: 30, height: 20, background: accentGold, opacity: 0.7, borderRadius: "4px 4px 0 0", margin: "0 auto 0" }} />
//                     <div style={{ width: 44, height: 56, background: accentGold, opacity: 0.7, borderRadius: "6px 6px 10px 10px" }} />
//                   </div>
//                 </div>

//                 {/* Right content panel */}
//                 <div style={{
//                   flex: 1,
//                   background: rightPanelBg,
//                   padding: "28px 24px 24px",
//                   display: "flex", flexDirection: "column", gap: 14,
//                   position: "relative",
//                 }}>
//                   {/* Close button */}
//                   <button type="button" style={{
//                     position: "absolute", top: 12, right: 14,
//                     background: "rgba(255,255,255,0.1)", border: "none",
//                     width: 24, height: 24, borderRadius: "50%",
//                     fontSize: 13, color: headlineColor, cursor: "pointer",
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     opacity: 0.7,
//                   }}>×</button>

//                   {/* Badge */}
//                   <div style={{
//                     display: "inline-flex", alignItems: "center", gap: 5,
//                     background: `${accentGold}22`, border: `1px solid ${accentGold}44`,
//                     borderRadius: 20, padding: "3px 10px", alignSelf: "flex-start",
//                     fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
//                     color: accentGold,
//                   }}>
//                     ✦ LIMITED OFFER
//                   </div>

//                   {/* Headline */}
//                   <div style={{
//                     fontFamily: "'Playfair Display', serif",
//                     fontSize: 22, fontWeight: 700,
//                     color: headlineColor,
//                     lineHeight: 1.2, letterSpacing: "-0.01em",
//                     paddingRight: 12,
//                   }}>
//                     {headline || "Your Headline Here"}
//                   </div>

//                   {/* Sub-headline */}
//                   <div style={{
//                     fontSize: 10, fontWeight: 700,
//                     color: subheadlineColor,
//                     letterSpacing: "0.14em",
//                     textTransform: "uppercase",
//                   }}>
//                     {subheadline || "Subheadline text"}
//                   </div>

//                   {/* Countdown */}
//                   <CountdownPreview endAtIso={countdownEndAt} accent={accentGold} textColor={headlineColor} />

//                   {/* Coupon */}
//                   {couponCode && (
//                     <div style={{
//                       border: `1.5px dashed ${accentGold}80`,
//                       borderRadius: 8,
//                       padding: "10px 14px",
//                       textAlign: "center",
//                       fontWeight: 700, fontSize: 14,
//                       letterSpacing: "0.14em",
//                       color: headlineColor,
//                       background: `${accentGold}08`,
//                       fontFamily: "monospace",
//                     }}>
//                       {couponCode}
//                     </div>
//                   )}

//                   {/* CTA */}
//                   <button type="button" style={{
//                     background: buttonBg,
//                     color: buttonText,
//                     border: "none", borderRadius: 8,
//                     padding: "13px 16px",
//                     fontWeight: 700, fontSize: 12,
//                     letterSpacing: "0.08em",
//                     cursor: "default",
//                     textTransform: "uppercase",
//                     fontFamily: "'DM Sans', sans-serif",
//                   }}>
//                     {ctaText || "Shop Now"}
//                   </button>

//                   {/* Footer note */}
//                   <div style={{ fontSize: 9, color: subheadlineColor, opacity: 0.6, textAlign: "center", letterSpacing: "0.06em" }}>
//                     No thanks, I'll pay full price
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Info card */}
//             <div style={{
//               marginTop: 16,
//               background: "var(--panel)",
//               border: "1px solid var(--border)",
//               borderRadius: 10,
//               padding: "14px 18px",
//               display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
//               gap: 12,
//             }}>
//               {[
//                 ["DELAY", `${(showDelayMs / 1000).toFixed(1)}s`],
//                 ["COUNTDOWN", countdownEndAt ? "Active" : "Off"],
//                 ["COUPON", couponCode || "-"],
//               ].map(([label, val]) => (
//                 <div key={label} style={{ textAlign: "center" }}>
//                   <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600, marginBottom: 3 }}>{label}</div>
//                   <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{val}</div>
//                 </div>
//               ))}
//             </div>

//             {/* Theme ID chip */}
//             {popupDesignId && (
//               <div style={{
//                 marginTop: 12, padding: "10px 16px",
//                 background: "var(--accent-dim)", border: "1px solid rgba(201,168,76,0.2)",
//                 borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
//               }}>
//                 <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.08em" }}>DESIGN ID</span>
//                 <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "monospace", fontWeight: 600 }}>
//                   {popupDesignId}
//                 </span>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }





























































































// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Form, useActionData, useFetcher, useLoaderData, useOutletContext, useRevalidator, useSearchParams } from "react-router";
// import {
//   defaultPopupDesignConfig,
//   generatePopupDesignId,
//   parsePopupDesignConfig,
//   parsePopupContentAlign,
//   parsePopupCountdownStyle,
//   parsePopupCouponVariant,
//   parsePopupCloseButtonPosition,
//   parsePopupModalBackgroundImageFit,
//   parsePopupLayoutMode,
//   parsePopupVisualStyle,
//   resolvePopupDesignId,
// } from "../lib/popup-design-config.js";
// import {
//   POPUP_READY_TEMPLATES,
//   getEditorKeysForTemplateId,
//   getPopupTemplateMeta,
// } from "../lib/popup-design-templates.js";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// const POPUP_BAR_TYPE = "popup_design";

// const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');`;

// const PRESETS = [
//   { key: "bloom", name: "Bloom", dot: "#e8a0b0", leftPanelBg: "#fde8ef", rightPanelBg: "#fff5f8", accentGold: "#d4607a", headlineColor: "#3a1520", subheadlineColor: "#b04060", buttonBg: "#d4607a", buttonText: "#fff5f8", overlayBg: "rgba(253,232,239,0.88)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
//   { key: "sage", name: "Sage", dot: "#7baa7b", leftPanelBg: "#eaf4ea", rightPanelBg: "#f6faf6", accentGold: "#4a8c5c", headlineColor: "#1a3020", subheadlineColor: "#3a7050", buttonBg: "#4a8c5c", buttonText: "#f6faf6", overlayBg: "rgba(234,244,234,0.88)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
//   { key: "sand", name: "Sand", dot: "#c9a96e", leftPanelBg: "#faf3e8", rightPanelBg: "#fffbf4", accentGold: "#b8860b", headlineColor: "#2c1e08", subheadlineColor: "#9a6e20", buttonBg: "#2c1e08", buttonText: "#fffbf4", overlayBg: "rgba(250,243,232,0.9)", visualStyle: "editorial", modalBorderRadius: 16, titleBadgeText: "NEW - JUST IN" },
//   { key: "sky", name: "Sky", dot: "#6aaee8", leftPanelBg: "#e8f3fd", rightPanelBg: "#f4f9ff", accentGold: "#2e7ec8", headlineColor: "#0c2240", subheadlineColor: "#2860a8", buttonBg: "#2e7ec8", buttonText: "#f4f9ff", overlayBg: "rgba(232,243,253,0.9)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
//   { key: "slate", name: "Slate", dot: "#8898aa", leftPanelBg: "#eef0f4", rightPanelBg: "#f8f9fb", accentGold: "#445566", headlineColor: "#1a222c", subheadlineColor: "#445566", buttonBg: "#1a222c", buttonText: "#f8f9fb", overlayBg: "rgba(238,240,244,0.9)", visualStyle: "minimal", modalBorderRadius: 20, titleBadgeText: "SAVE TODAY" },
//   { key: "frost", name: "Frost", dot: "#93c5fd", leftPanelBg: "#bfdbfe", rightPanelBg: "#eff6ff", accentGold: "#2563eb", headlineColor: "#0f172a", subheadlineColor: "#475569", buttonBg: "#1d4ed8", buttonText: "#f8fafc", overlayBg: "rgba(15,23,42,0.35)", visualStyle: "glass", modalBorderRadius: 24, titleBadgeText: "WELCOME OFFER" },
//   { key: "noir", name: "Noir", dot: "#a78bfa", leftPanelBg: "#111827", rightPanelBg: "#1e293b", accentGold: "#a78bfa", headlineColor: "#f8fafc", subheadlineColor: "#94a3b8", buttonBg: "#f8fafc", buttonText: "#0f172a", overlayBg: "rgba(2,6,23,0.72)", visualStyle: "minimal", modalBorderRadius: 20, titleBadgeText: "MEMBER DROP" },
//   { key: "linen", name: "Linen", dot: "#d6d3d1", leftPanelBg: "#e7e5e4", rightPanelBg: "#fafaf9", accentGold: "#57534e", headlineColor: "#1c1917", subheadlineColor: "#78716c", buttonBg: "#292524", buttonText: "#fafaf9", overlayBg: "rgba(28,25,23,0.25)", visualStyle: "editorial", modalBorderRadius: 18, titleBadgeText: "CURATED FOR YOU" },
// ];

// const LAYOUT_LABELS = {
//   split_image_left: "Split - image left",
//   split_image_right: "Split - image right",
//   stacked: "Stacked - image on top",
//   content_only: "Content only",
// };

// const VISUAL_STYLE_LABELS = {
//   classic: "Classic - serif headline, balanced",
//   glass: "Glass - frosted content panel (on-trend)",
//   minimal: "Minimal - bold sans, pill button",
//   editorial: "Editorial - large type, softer label",
// };

// const CLOSE_BUTTON_LABELS = {
//   top_left: "Top left",
//   top_right: "Top right",
//   bottom_left: "Bottom left",
//   bottom_right: "Bottom right",
// };

// const MODAL_BG_FIT_LABELS = {
//   cover: "Cover (fill card)",
//   contain: "Contain (full image visible)",
// };

// const MODAL_BG_IMAGE_OPTIONS = [
//   { key: "none", name: "None", url: "" },
//   {
//     key: "mint_shapes",
//     name: "Mint shapes",
//     url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80",
//   },
//   {
//     key: "pastel_abstract",
//     name: "Pastel abstract",
//     url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=1200&q=80",
//   },
//   {
//     key: "fashion_neutral",
//     name: "Fashion neutral",
//     url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
//   },
//   {
//     key: "mountains_sunset",
//     name: "Mountains sunset",
//     url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
//   },
//   {
//     key: "soft_studio",
//     name: "Soft studio",
//     url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
//   },
// ];

// /** Plain-language copy for merchants: what URL rules mean + when the theme must load the app embed. */
// function getStorefrontTargetingExplainer(pageTarget, customPathContains) {
//   const c = String(customPathContains || "").trim();
//   const bullets = [];
//   let needsSiteWideEmbed = false;

//   switch (pageTarget) {
//     case "all":
//       bullets.push("Opens on any page, as long as the theme loads the popup script (section block and/or site-wide app embed).");
//       bullets.push("Example paths: /, /products/…, /collections/…, /cart");
//       break;
//     case "home":
//       bullets.push("Opens only on the homepage path: /, or a single market prefix like /en or /en-us, or /pages/home.");
//       bullets.push("Does not open on /products/… or other inner pages.");
//       break;
//     case "product":
//       needsSiteWideEmbed = true;
//       bullets.push("Opens when the URL path includes a product segment (standard Shopify), for example:");
//       bullets.push("• /products/gift-card");
//       bullets.push("• /en/products/gift-card (Markets)");
//       bullets.push("Your Gift Card URL matches this rule - if you still see nothing, the script is probably not loaded on product templates (see yellow box below).");
//       break;
//     case "collection":
//       needsSiteWideEmbed = true;
//       bullets.push("Opens when the path includes a collection segment, e.g. /collections/summer-sale or /fr/collections/summer-sale.");
//       break;
//     case "cart":
//       needsSiteWideEmbed = true;
//       bullets.push("Opens on the cart page path, e.g. /cart or /en/cart (last segment must be cart).");
//       break;
//     case "custom":
//       needsSiteWideEmbed = true;
//       bullets.push(
//         c
//           ? `Opens only when the path contains “${c}” (case-insensitive), e.g. any URL with ${c} in it.`
//           : "Set “URL must contain” above - otherwise this mode will not open the popup.",
//       );
//       break;
//     default:
//       bullets.push("Opens according to the selected page targeting.");
//   }

//   return { bullets, needsSiteWideEmbed };
// }

// function toDatetimeLocalValue(iso) {
//   if (!iso) return "";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }
// function fromDatetimeLocalValue(local) {
//   if (!local) return "";
//   const d = new Date(local);
//   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
// }

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const rows = await prisma.announcementBar.findMany({
//     where: { shop, barType: POPUP_BAR_TYPE },
//     orderBy: { updatedAt: "desc" },
//     select: { id: true, name: true, configJson: true, updatedAt: true },
//   });
//   const popups = rows.map((row) => {
//     const raw = parsePopupDesignConfig(row.configJson);
//     const config = { ...raw, popupDesignId: resolvePopupDesignId(raw, row.id) };
//     return {
//       id: row.id,
//       name: row.name,
//       savedAt: row.updatedAt.toISOString(),
//       config,
//     };
//   });
//   return { popups };
// };

// function buildConfigPayload(form) {
//   return parsePopupDesignConfig(
//     JSON.stringify({
//       popupDesignId: String(form.get("popupDesignId") || "").trim(),
//       designTemplateId: String(form.get("designTemplateId") || "").trim(),
//       headline: String(form.get("headline") || ""),
//       subheadline: String(form.get("subheadline") || ""),
//       couponCode: String(form.get("couponCode") || ""),
//       ctaText: String(form.get("ctaText") || ""),
//       ctaHref: String(form.get("ctaHref") || ""),
//       countdownEndAt: String(form.get("countdownEndAt") || "").trim(),
//       showDelayMs: Number(form.get("showDelayMs") || 1200),
//       displayTrigger: String(form.get("displayTrigger") || "delay"),
//       showMode: String(form.get("showMode") || "repeat"),
//       repeatFrequencyMinutes: Number(form.get("repeatFrequencyMinutes") || 60),
//       maxImpressions: Number(form.get("maxImpressions") || 0),
//       pageTarget: String(form.get("pageTarget") || "all"),
//       customPathContains: String(form.get("customPathContains") || ""),
//       leftImageUrl: String(form.get("leftImageUrl") || ""),
//       leftImageAlt: String(form.get("leftImageAlt") || ""),
//       copyCouponButtonText: String(form.get("copyCouponButtonText") || ""),
//       copyCouponSuccessText: String(form.get("copyCouponSuccessText") || ""),
//       showDismissFootnote: String(form.get("showDismissFootnote") || "") === "1",
//       dismissFootnoteText: String(form.get("dismissFootnoteText") || ""),
//       layoutMode: String(form.get("layoutMode") || ""),
//       dimOverlay: String(form.get("dimOverlay") || "") === "1",
//       showTitle: String(form.get("showTitle") || "") === "1",
//       titleBadgeText: String(form.get("titleBadgeText") || ""),
//       visualStyle: String(form.get("visualStyle") || ""),
//       showHeadline: String(form.get("showHeadline") || "") === "1",
//       showSubheadline: String(form.get("showSubheadline") || "") === "1",
//       showContent: String(form.get("showContent") || "") === "1",
//       showTiming: String(form.get("showTiming") || "") === "1",
//       modalTransparentShell: String(form.get("modalTransparentShell") || "") === "1",
//       modalBorderRadius: Number(form.get("modalBorderRadius") || 12),
//       modalMaxWidthPx: Number(form.get("modalMaxWidthPx") || 0),
//       leftPanelBg: String(form.get("leftPanelBg") || ""),
//       rightPanelBg: String(form.get("rightPanelBg") || ""),
//       accentGold: String(form.get("accentGold") || ""),
//       headlineColor: String(form.get("headlineColor") || ""),
//       subheadlineColor: String(form.get("subheadlineColor") || ""),
//       buttonBg: String(form.get("buttonBg") || ""),
//       buttonText: String(form.get("buttonText") || ""),
//       overlayBg: String(form.get("overlayBg") || ""),
//       bodyText: String(form.get("bodyText") || ""),
//       contentAlign: String(form.get("contentAlign") || ""),
//       countdownStyle: String(form.get("countdownStyle") || ""),
//       couponVariant: String(form.get("couponVariant") || ""),
//       emailCaptureEnabled: String(form.get("emailCaptureEnabled") || "") === "1",
//       emailPlaceholder: String(form.get("emailPlaceholder") || ""),
//       subscriberSignupEnabled: String(form.get("subscriberSignupEnabled") || "") === "1",
//       shopifyCustomerCreateEnabled: String(form.get("shopifyCustomerCreateEnabled") || "") === "1",
//       customerCreateMarketingOptIn: String(form.get("customerCreateMarketingOptIn") || "") === "1",
//       customerCreateSuccessMessage: String(form.get("customerCreateSuccessMessage") || ""),
//       customerCreateSuccessImageUrl: String(form.get("customerCreateSuccessImageUrl") || ""),
//       customerCreateStayInPopup: String(form.get("customerCreateStayInPopup") || "") === "1",
//       modalBackgroundImageUrl: String(form.get("modalBackgroundImageUrl") || ""),
//       modalBackgroundImageAlt: String(form.get("modalBackgroundImageAlt") || ""),
//       modalBackgroundImageFit: String(form.get("modalBackgroundImageFit") || ""),
//       closeButtonPosition: String(form.get("closeButtonPosition") || ""),
//     }),
//   );
// }

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   const intent = String(form.get("intent") || "");

//   if (intent === "create") {
//     const name = String(form.get("popupName") || "Untitled popup").trim() || "Untitled popup";
//     const cfg = defaultPopupDesignConfig();
//     const row = await prisma.announcementBar.create({
//       data: {
//         shop,
//         name,
//         barType: POPUP_BAR_TYPE,
//         configJson: JSON.stringify(cfg),
//         active: false,
//         customHtml: "",
//         customLiquid: "",
//         customCss: "",
//       },
//       select: { id: true, updatedAt: true },
//     });
//     return { ok: true, intent: "create", rowId: row.id, savedAt: row.updatedAt.toISOString() };
//   }

//   if (intent === "create_with_config") {
//     const name = String(form.get("popupName") || "Untitled popup").trim() || "Untitled popup";
//     const rawJson = String(form.get("configJson") || "{}");
//     let cfg;
//     try {
//       cfg = parsePopupDesignConfig(rawJson);
//     } catch {
//       return { ok: false, error: "Invalid popup configuration." };
//     }
//     cfg.popupDesignId = String(cfg.popupDesignId || "").trim() || generatePopupDesignId();
//     const row = await prisma.announcementBar.create({
//       data: {
//         shop,
//         name,
//         barType: POPUP_BAR_TYPE,
//         configJson: JSON.stringify(cfg),
//         active: false,
//         customHtml: "",
//         customLiquid: "",
//         customCss: "",
//       },
//       select: { id: true, updatedAt: true },
//     });
//     return { ok: true, intent: "create_with_config", rowId: row.id, savedAt: row.updatedAt.toISOString() };
//   }

//   if (intent === "delete") {
//     const rowId = String(form.get("rowId") || "").trim();
//     const existing = await prisma.announcementBar.findFirst({
//       where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
//       select: { id: true },
//     });
//     if (!existing) return { ok: false, error: "Popup not found." };
//     await prisma.announcementBar.delete({ where: { id: existing.id } });
//     return { ok: true, intent: "delete", deletedId: rowId };
//   }

//   if (intent === "duplicate") {
//     const rowId = String(form.get("rowId") || "").trim();
//     const src = await prisma.announcementBar.findFirst({
//       where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
//     });
//     if (!src) return { ok: false, error: "Popup not found." };
//     const parsed = parsePopupDesignConfig(src.configJson);
//     const next = { ...parsed, popupDesignId: generatePopupDesignId() };
//     const config = parsePopupDesignConfig(JSON.stringify(next));
//     const row = await prisma.announcementBar.create({
//       data: {
//         shop,
//         name: `${src.name} (copy)`.slice(0, 120),
//         barType: POPUP_BAR_TYPE,
//         configJson: JSON.stringify(config),
//         active: false,
//         customHtml: "",
//         customLiquid: "",
//         customCss: "",
//       },
//       select: { id: true, updatedAt: true },
//     });
//     return { ok: true, intent: "duplicate", rowId: row.id, savedAt: row.updatedAt.toISOString() };
//   }

//   if (intent !== "save") {
//     return { ok: false, error: "Unknown action." };
//   }

//   const rowId = String(form.get("rowId") || "").trim();
//   if (!rowId) return { ok: false, error: "Select a popup to save." };

//   const owned = await prisma.announcementBar.findFirst({
//     where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
//     select: { id: true },
//   });
//   if (!owned) return { ok: false, error: "Popup not found." };

//   const config = buildConfigPayload(form);
//   const configJson = JSON.stringify(config);
//   const popupName = String(form.get("popupName") || "").trim() || "Popup";

//   const updated = await prisma.announcementBar.update({
//     where: { id: owned.id },
//     data: { name: popupName, barType: POPUP_BAR_TYPE, configJson, active: false },
//     select: { id: true, updatedAt: true },
//   });
//   return { ok: true, intent: "save", rowId: updated.id, savedAt: updated.updatedAt.toISOString() };
// };

// function CountdownPreview({ endAtIso, accent, bg, compact }) {
//   const [now, setNow] = useState(() => Date.now());
//   useEffect(() => {
//     const t = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(t);
//   }, []);
//   const parts = useMemo(() => {
//     if (!endAtIso) return { d: "00", h: "00", m: "00", s: "00" };
//     const end = new Date(endAtIso).getTime();
//     if (Number.isNaN(end)) return { d: "00", h: "00", m: "00", s: "00" };
//     let sec = Math.max(0, Math.floor((end - now) / 1000));
//     const d = Math.floor(sec / 86400); sec -= d * 86400;
//     const h = Math.floor(sec / 3600); sec -= h * 3600;
//     const m = Math.floor(sec / 60); sec -= m * 60;
//     const pad = (n) => String(n).padStart(2, "0");
//     return { d: pad(d), h: pad(h), m: pad(m), s: pad(sec) };
//   }, [endAtIso, now]);

//   const unit = (val, lbl) => (
//     <div style={{ textAlign: "center" }}>
//       <div style={{ background: bg || "rgba(0,0,0,0.06)", borderRadius: 6, padding: "5px 8px", fontWeight: 700, fontSize: 14, color: accent, minWidth: 34, border: `1px solid ${accent}22`, fontFamily: "monospace" }}>{val}</div>
//       <div style={{ fontSize: 8, color: accent, opacity: 0.6, marginTop: 2, letterSpacing: "0.08em", fontWeight: 600 }}>{lbl}</div>
//     </div>
//   );
//   const sep = <div style={{ color: accent, fontWeight: 700, fontSize: 13, paddingBottom: 10 }}>:</div>;
//   const sepTight = <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>:</div>;
//   const boxOnly = (val) => (
//     <div style={{ background: bg || "rgba(0,0,0,0.06)", borderRadius: 8, padding: "6px 8px", fontWeight: 700, fontSize: 14, color: accent, minWidth: 32, border: `1px solid ${accent}22`, fontFamily: "monospace" }}>{val}</div>
//   );
//   if (compact) {
//     return (
//       <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
//         {boxOnly(parts.d)}{sepTight}{boxOnly(parts.h)}{sepTight}{boxOnly(parts.m)}{sepTight}{boxOnly(parts.s)}
//       </div>
//     );
//   }
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//       {unit(parts.d, "DAYS")}{sep}{unit(parts.h, "HRS")}{sep}{unit(parts.m, "MINS")}{sep}{unit(parts.s, "SECS")}
//     </div>
//   );
// }

// function clamp255(n) {
//   const x = Math.round(Number(n));
//   if (Number.isNaN(x)) return 0;
//   return Math.min(255, Math.max(0, x));
// }

// function expandHex(raw) {
//   let s = String(raw || "").trim();
//   if (!s.startsWith("#")) s = `#${s}`;
//   s = s.slice(1);
//   if (s.length === 3) {
//     s = s
//       .split("")
//       .map((c) => c + c)
//       .join("");
//   }
//   if (s.length !== 6 || !/^[0-9a-fA-F]+$/.test(s)) return null;
//   return `#${s.toLowerCase()}`;
// }

// function hexToRgb(hex) {
//   const e = expandHex(hex);
//   if (!e) return null;
//   const n = parseInt(e.slice(1), 16);
//   return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
// }

// function rgbToHex(r, g, b) {
//   return `#${[r, g, b]
//     .map((x) => clamp255(x).toString(16).padStart(2, "0"))
//     .join("")}`;
// }

// function formatCssAlpha(a) {
//   const n = Math.min(1, Math.max(0, Number(a)));
//   if (Number.isNaN(n)) return "1";
//   const t = n.toFixed(4).replace(/\.?0+$/, "");
//   return t === "" ? "0" : t;
// }

// /** Parse hex, rgb(), or rgba() for a native color input + text field. */
// function parseCssColorForPicker(raw) {
//   const v = String(raw || "").trim();
//   const hexDirect = v.startsWith("#") ? expandHex(v) : /^[0-9a-fA-F]{3,8}$/.test(v) ? expandHex(`#${v}`) : null;
//   if (hexDirect) {
//     return { outputKind: "hex", pickerHex: hexDirect, rgbAlpha: null };
//   }
//   const rgba = v.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
//   if (rgba) {
//     const r = clamp255(rgba[1]);
//     const g = clamp255(rgba[2]);
//     const b = clamp255(rgba[3]);
//     const a = Math.min(1, Math.max(0, Number(rgba[4])));
//     return { outputKind: "rgba", pickerHex: rgbToHex(r, g, b), rgbAlpha: Number.isNaN(a) ? 1 : a };
//   }
//   const rgb = v.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
//   if (rgb) {
//     const r = clamp255(rgb[1]);
//     const g = clamp255(rgb[2]);
//     const b = clamp255(rgb[3]);
//     return { outputKind: "rgb", pickerHex: rgbToHex(r, g, b), rgbAlpha: null };
//   }
//   return { outputKind: "hex", pickerHex: "#ffffff", rgbAlpha: null };
// }

// function colorStringFromPicker(parsed, newHex) {
//   const norm = expandHex(newHex);
//   if (!norm) return null;
//   const rgb = hexToRgb(norm);
//   if (!rgb) return null;
//   if (parsed.outputKind === "rgba" && parsed.rgbAlpha != null) {
//     return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatCssAlpha(parsed.rgbAlpha)})`;
//   }
//   if (parsed.outputKind === "rgb") {
//     return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
//   }
//   return norm;
// }

// const colorValueInputStyle = {
//   width: "100%",
//   boxSizing: "border-box",
//   minHeight: 36,
//   padding: "8px 12px",
//   borderRadius: 8,
//   border: "1px solid #c9cccf",
//   fontSize: 13,
//   fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
//   color: "#202223",
//   background: "#fff",
// };

// function ColorRow({ label, value, onChange }) {
//   const parsed = useMemo(() => parseCssColorForPicker(value), [value]);
//   const handlePicker = (e) => {
//     const next = colorStringFromPicker(parsed, String(e.target?.value ?? ""));
//     if (next != null) onChange(next);
//   };
//   return (
//     <s-stack direction="block" gap="small-100">
//       <s-text type="strong">{label}</s-text>
//       <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//         <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
//           <div
//             aria-hidden
//             style={{
//               width: 36,
//               height: 36,
//               borderRadius: 8,
//               background: parsed.pickerHex,
//               border: "1px solid rgba(0, 0, 0, 0.12)",
//               boxSizing: "border-box",
//             }}
//           />
//           <input
//             type="color"
//             value={parsed.pickerHex}
//             onChange={handlePicker}
//             aria-label={`${label} color picker`}
//             style={{
//               position: "absolute",
//               inset: 0,
//               opacity: 0,
//               cursor: "pointer",
//               width: "100%",
//               height: "100%",
//             }}
//           />
//         </div>
//         <input
//           type="text"
//           value={value}
//           onChange={(e) => onChange(e.currentTarget.value)}
//           autoComplete="off"
//           aria-label={`${label} color value`}
//           placeholder="#000000 or rgba(0,0,0,0.5)"
//           style={{ ...colorValueInputStyle, flex: "1 1 160px", minWidth: 0 }}
//         />
//       </div>
//     </s-stack>
//   );
// }

// function Field({ label, value, onChange, type = "text", placeholder, min, max }) {
//   const relay = (e) => {
//     const v = e.target?.value ?? "";
//     onChange({ currentTarget: { value: v } });
//   };
//   if (type === "number") {
//     return (
//       <s-number-field
//         label={label}
//         value={String(value)}
//         onChange={relay}
//         placeholder={placeholder || ""}
//         min={min}
//         max={max}
//         autocomplete="off"
//       />
//     );
//   }
//   /* Native control: Polaris s-text-field does not wire up datetime-local pickers reliably. */
//   if (type === "datetime-local") {
//     return (
//       <s-stack direction="block" gap="small-100">
//         <s-text type="strong">{label}</s-text>
//         <input
//           type="datetime-local"
//           value={value == null ? "" : String(value)}
//           onChange={relay}
//           min={min != null ? String(min) : undefined}
//           max={max != null ? String(max) : undefined}
//           step={60}
//           autoComplete="off"
//           aria-label={label}
//           style={{
//             width: "100%",
//             boxSizing: "border-box",
//             minHeight: 36,
//             padding: "8px 12px",
//             borderRadius: 8,
//             border: "1px solid #c9cccf",
//             fontSize: 13,
//             fontFamily: "inherit",
//             color: "#202223",
//             background: "#fff",
//           }}
//         />
//       </s-stack>
//     );
//   }
//   return (
//     <s-text-field
//       label={label}
//       type={type}
//       value={value}
//       onChange={relay}
//       placeholder={placeholder || ""}
//       min={min}
//       max={max}
//       autocomplete="off"
//     />
//   );
// }

// function SectionDivider({ title }) {
//   return (
//     <s-stack direction="block" gap="small-100" paddingBlockStart="base" paddingBlockEnd="small-100">
//       <s-text tone="subdued" type="strong">
//         {title}
//       </s-text>
//       <s-divider />
//     </s-stack>
//   );
// }

// function hydrateFromConfig(c) {
//   const cfg = c || defaultPopupDesignConfig();
//   return {
//     designTemplateId: String(cfg.designTemplateId ?? "").trim(),
//     popupDesignId: cfg.popupDesignId || "",
//     headline: cfg.headline,
//     subheadline: cfg.subheadline,
//     couponCode: cfg.couponCode,
//     ctaText: cfg.ctaText,
//     ctaHref: cfg.ctaHref,
//     countdownEndAt: cfg.countdownEndAt,
//     countdownLocal: toDatetimeLocalValue(cfg.countdownEndAt),
//     showDelayMs: cfg.showDelayMs,
//     displayTrigger: cfg.displayTrigger || "delay",
//     showMode: cfg.showMode || "repeat",
//     repeatFrequencyMinutes: cfg.repeatFrequencyMinutes ?? 60,
//     maxImpressions: cfg.maxImpressions ?? 0,
//     pageTarget: cfg.pageTarget || "all",
//     customPathContains: cfg.customPathContains || "",
//     leftPanelBg: cfg.leftPanelBg,
//     rightPanelBg: cfg.rightPanelBg,
//     accentGold: cfg.accentGold,
//     headlineColor: cfg.headlineColor,
//     subheadlineColor: cfg.subheadlineColor,
//     buttonBg: cfg.buttonBg,
//     buttonText: cfg.buttonText,
//     overlayBg: cfg.overlayBg,
//     leftImageUrl: cfg.leftImageUrl || "",
//     leftImageAlt: cfg.leftImageAlt || "",
//     copyCouponButtonText: cfg.copyCouponButtonText,
//     copyCouponSuccessText: cfg.copyCouponSuccessText,
//     showDismissFootnote: cfg.showDismissFootnote !== false,
//     dismissFootnoteText: cfg.dismissFootnoteText || "No thanks, I'll pay full price",
//     layoutMode: parsePopupLayoutMode(cfg.layoutMode),
//     dimOverlay: cfg.dimOverlay !== false,
//     showTitle: cfg.showTitle !== false,
//     titleBadgeText: cfg.titleBadgeText || "✦ LIMITED OFFER",
//     visualStyle: parsePopupVisualStyle(cfg.visualStyle),
//     showHeadline: cfg.showHeadline !== false,
//     showSubheadline: cfg.showSubheadline !== false,
//     showContent: cfg.showContent !== false,
//     showTiming: cfg.showTiming !== false,
//     modalTransparentShell: cfg.modalTransparentShell === true,
//     modalBorderRadius: cfg.modalBorderRadius ?? 12,
//     modalMaxWidthPx: cfg.modalMaxWidthPx ?? 0,
//     bodyText: cfg.bodyText || "",
//     contentAlign: parsePopupContentAlign(cfg.contentAlign),
//     countdownStyle: parsePopupCountdownStyle(cfg.countdownStyle),
//     couponVariant: parsePopupCouponVariant(cfg.couponVariant),
//     emailCaptureEnabled: cfg.emailCaptureEnabled === true,
//     emailPlaceholder: cfg.emailPlaceholder || "Enter your email",
//     subscriberSignupEnabled: cfg.subscriberSignupEnabled === true,
//     shopifyCustomerCreateEnabled: cfg.shopifyCustomerCreateEnabled === true,
//     customerCreateMarketingOptIn: cfg.customerCreateMarketingOptIn !== false,
//     customerCreateSuccessMessage: cfg.customerCreateSuccessMessage || "You are subscribed. Thank you!",
//     customerCreateSuccessImageUrl: cfg.customerCreateSuccessImageUrl || "",
//     customerCreateStayInPopup: cfg.customerCreateStayInPopup !== false,
//     modalBackgroundImageUrl: cfg.modalBackgroundImageUrl || "",
//     modalBackgroundImageAlt: cfg.modalBackgroundImageAlt || "",
//     modalBackgroundImageFit: parsePopupModalBackgroundImageFit(cfg.modalBackgroundImageFit),
//     closeButtonPosition: parsePopupCloseButtonPosition(cfg.closeButtonPosition),
//   };
// }

// export default function PopupDesignPage() {
//   const { popups } = useLoaderData();
//   const actionData = useActionData();
//   const fetcher = useFetcher();
//   const revalidator = useRevalidator();
//   const [searchParams, setSearchParams] = useSearchParams();
//   const { onboarding } = useOutletContext() || {};
//   const fetchHandledKey = useRef("");

//   const urlPopupId = String(searchParams.get("popup") || "").trim();
//   const initialSelected =
//     urlPopupId && popups.some((p) => p.id === urlPopupId) ? urlPopupId : null;
//   const [selectedPopupId, setSelectedPopupId] = useState(initialSelected);
//   const selectedPopup = useMemo(() => popups.find((p) => p.id === selectedPopupId) ?? null, [popups, selectedPopupId]);

//   const [popupName, setPopupName] = useState(() => selectedPopup?.name || "Untitled popup");
//   const h0 = hydrateFromConfig(selectedPopup?.config);
//   const [designTemplateId, setDesignTemplateId] = useState(h0.designTemplateId);
//   const [popupDesignId, setPopupDesignId] = useState(h0.popupDesignId);
//   const [headline, setHeadline] = useState(h0.headline);
//   const [subheadline, setSubheadline] = useState(h0.subheadline);
//   const [couponCode, setCouponCode] = useState(h0.couponCode);
//   const [ctaText, setCtaText] = useState(h0.ctaText);
//   const [ctaHref, setCtaHref] = useState(h0.ctaHref);
//   const [countdownEndAt, setCountdownEndAt] = useState(h0.countdownEndAt);
//   const [countdownLocal, setCountdownLocal] = useState(h0.countdownLocal);
//   const [showDelayMs, setShowDelayMs] = useState(h0.showDelayMs);
//   const [displayTrigger, setDisplayTrigger] = useState(h0.displayTrigger);
//   const [showMode, setShowMode] = useState(h0.showMode);
//   const [repeatFrequencyMinutes, setRepeatFrequencyMinutes] = useState(h0.repeatFrequencyMinutes);
//   const [maxImpressions, setMaxImpressions] = useState(h0.maxImpressions);
//   const [pageTarget, setPageTarget] = useState(h0.pageTarget);
//   const [customPathContains, setCustomPathContains] = useState(h0.customPathContains);
//   const [leftPanelBg, setLeftPanelBg] = useState(h0.leftPanelBg);
//   const [rightPanelBg, setRightPanelBg] = useState(h0.rightPanelBg);
//   const [accentGold, setAccentGold] = useState(h0.accentGold);
//   const [headlineColor, setHeadlineColor] = useState(h0.headlineColor);
//   const [subheadlineColor, setSubheadlineColor] = useState(h0.subheadlineColor);
//   const [buttonBg, setButtonBg] = useState(h0.buttonBg);
//   const [buttonText, setButtonText] = useState(h0.buttonText);
//   const [overlayBg, setOverlayBg] = useState(h0.overlayBg);
//   const [leftImageUrl, setLeftImageUrl] = useState(h0.leftImageUrl);
//   const [leftImageAlt, setLeftImageAlt] = useState(h0.leftImageAlt);
//   const [copyCouponButtonText, setCopyCouponButtonText] = useState(h0.copyCouponButtonText);
//   const [copyCouponSuccessText, setCopyCouponSuccessText] = useState(h0.copyCouponSuccessText);
//   const [showDismissFootnote, setShowDismissFootnote] = useState(h0.showDismissFootnote);
//   const [dismissFootnoteText, setDismissFootnoteText] = useState(h0.dismissFootnoteText);
//   const [layoutMode, setLayoutMode] = useState(h0.layoutMode);
//   const [dimOverlay, setDimOverlay] = useState(h0.dimOverlay);
//   const [showTitle, setShowTitle] = useState(h0.showTitle);
//   const [titleBadgeText, setTitleBadgeText] = useState(h0.titleBadgeText);
//   const [visualStyle, setVisualStyle] = useState(h0.visualStyle);
//   const [showHeadline, setShowHeadline] = useState(h0.showHeadline);
//   const [showSubheadline, setShowSubheadline] = useState(h0.showSubheadline);
//   const [showContent, setShowContent] = useState(h0.showContent);
//   const [showTiming, setShowTiming] = useState(h0.showTiming);
//   const [modalTransparentShell, setModalTransparentShell] = useState(h0.modalTransparentShell);
//   const [modalBorderRadius, setModalBorderRadius] = useState(h0.modalBorderRadius);
//   const [modalMaxWidthPx, setModalMaxWidthPx] = useState(h0.modalMaxWidthPx);
//   const [bodyText, setBodyText] = useState(h0.bodyText);
//   const [contentAlign, setContentAlign] = useState(h0.contentAlign);
//   const [countdownStyle, setCountdownStyle] = useState(h0.countdownStyle);
//   const [couponVariant, setCouponVariant] = useState(h0.couponVariant);
//   const [emailCaptureEnabled, setEmailCaptureEnabled] = useState(h0.emailCaptureEnabled);
//   const [emailPlaceholder, setEmailPlaceholder] = useState(h0.emailPlaceholder);
//   const [subscriberSignupEnabled, setSubscriberSignupEnabled] = useState(h0.subscriberSignupEnabled);
//   const [shopifyCustomerCreateEnabled, setShopifyCustomerCreateEnabled] = useState(h0.shopifyCustomerCreateEnabled);
//   const [customerCreateMarketingOptIn, setCustomerCreateMarketingOptIn] = useState(h0.customerCreateMarketingOptIn);
//   const [customerCreateSuccessMessage, setCustomerCreateSuccessMessage] = useState(h0.customerCreateSuccessMessage);
//   const [customerCreateSuccessImageUrl, setCustomerCreateSuccessImageUrl] = useState(h0.customerCreateSuccessImageUrl);
//   const [customerCreateStayInPopup, setCustomerCreateStayInPopup] = useState(h0.customerCreateStayInPopup);
//   const [modalBackgroundImageUrl, setModalBackgroundImageUrl] = useState(h0.modalBackgroundImageUrl);
//   const [modalBackgroundImageAlt, setModalBackgroundImageAlt] = useState(h0.modalBackgroundImageAlt);
//   const [modalBackgroundImageFit, setModalBackgroundImageFit] = useState(h0.modalBackgroundImageFit);
//   const [closeButtonPosition, setCloseButtonPosition] = useState(h0.closeButtonPosition);
//   const [activePreset, setActivePreset] = useState(null);
//   const [copied, setCopied] = useState(false);
//   const [previewCouponCopied, setPreviewCouponCopied] = useState(false);
//   const [templateModalOpen, setTemplateModalOpen] = useState(false);
//   const [configModal, setConfigModal] = useState(/** @type {null | { mode: "create", templateId: string } | { mode: "edit", rowId: string }} */ (null));
//   /** Delete confirmation: `exiting` drives fade-out before unmount. */
//   const [deleteConfirm, setDeleteConfirm] = useState(/** @type {null | { id: string }} */ (null));
//   const [deleteConfirmExiting, setDeleteConfirmExiting] = useState(false);
//   const TABLE_PAGE_SIZE = 8;
//   const [tablePage, setTablePage] = useState(1);

//   const targetingExplainer = useMemo(
//     () => getStorefrontTargetingExplainer(pageTarget, customPathContains),
//     [pageTarget, customPathContains],
//   );

//   const activeTemplateForKeys =
//     configModal?.mode === "create" ? configModal.templateId : designTemplateId;
//   const editorKeyList = useMemo(
//     () => getEditorKeysForTemplateId(activeTemplateForKeys),
//     [activeTemplateForKeys],
//   );

//   const showEditorKey = useCallback(
//     (...keys) => {
//       if (!editorKeyList) return true;
//       return keys.some((k) => editorKeyList.includes(k));
//     },
//     [editorKeyList],
//   );

//   const totalTablePages = Math.max(1, Math.ceil(popups.length / TABLE_PAGE_SIZE));
//   const paginatedPopups = useMemo(() => {
//     const start = (tablePage - 1) * TABLE_PAGE_SIZE;
//     return popups.slice(start, start + TABLE_PAGE_SIZE);
//   }, [popups, tablePage]);

//   useEffect(() => {
//     setTablePage((prev) => Math.min(prev, totalTablePages));
//   }, [totalTablePages]);

//   const serializeEditorToParsedConfig = useCallback(() => {
//     return parsePopupDesignConfig(
//       JSON.stringify({
//         designTemplateId,
//         popupDesignId,
//         headline,
//         subheadline,
//         couponCode,
//         ctaText,
//         ctaHref,
//         countdownEndAt,
//         showDelayMs,
//         displayTrigger,
//         showMode,
//         repeatFrequencyMinutes,
//         maxImpressions,
//         pageTarget,
//         customPathContains,
//         leftImageUrl,
//         leftImageAlt,
//         copyCouponButtonText,
//         copyCouponSuccessText,
//         showDismissFootnote,
//         dismissFootnoteText,
//         layoutMode,
//         dimOverlay,
//         showTitle,
//         titleBadgeText,
//         visualStyle,
//         showHeadline,
//         showSubheadline,
//         showContent,
//         showTiming,
//         modalTransparentShell,
//         modalBorderRadius,
//         modalMaxWidthPx,
//         leftPanelBg,
//         rightPanelBg,
//         accentGold,
//         headlineColor,
//         subheadlineColor,
//         buttonBg,
//         buttonText,
//         overlayBg,
//         bodyText,
//         contentAlign,
//         countdownStyle,
//         couponVariant,
//         emailCaptureEnabled,
//         emailPlaceholder,
//         subscriberSignupEnabled,
//         shopifyCustomerCreateEnabled,
//         customerCreateMarketingOptIn,
//         customerCreateSuccessMessage,
//         customerCreateSuccessImageUrl,
//         customerCreateStayInPopup,
//         modalBackgroundImageUrl,
//         modalBackgroundImageAlt,
//         modalBackgroundImageFit,
//         closeButtonPosition,
//       }),
//     );
//   }, [
//     designTemplateId,
//     popupDesignId,
//     headline,
//     subheadline,
//     couponCode,
//     ctaText,
//     ctaHref,
//     countdownEndAt,
//     showDelayMs,
//     displayTrigger,
//     showMode,
//     repeatFrequencyMinutes,
//     maxImpressions,
//     pageTarget,
//     customPathContains,
//     leftImageUrl,
//     leftImageAlt,
//     copyCouponButtonText,
//     copyCouponSuccessText,
//     showDismissFootnote,
//     dismissFootnoteText,
//     layoutMode,
//     dimOverlay,
//     showTitle,
//     titleBadgeText,
//     visualStyle,
//     showHeadline,
//     showSubheadline,
//     showContent,
//     showTiming,
//     modalTransparentShell,
//     modalBorderRadius,
//     modalMaxWidthPx,
//     leftPanelBg,
//     rightPanelBg,
//     accentGold,
//     headlineColor,
//     subheadlineColor,
//     buttonBg,
//     buttonText,
//     overlayBg,
//     bodyText,
//     contentAlign,
//     countdownStyle,
//     couponVariant,
//     emailCaptureEnabled,
//     emailPlaceholder,
//     subscriberSignupEnabled,
//     shopifyCustomerCreateEnabled,
//     customerCreateMarketingOptIn,
//     customerCreateSuccessMessage,
//     customerCreateSuccessImageUrl,
//     customerCreateStayInPopup,
//     modalBackgroundImageUrl,
//     modalBackgroundImageAlt,
//     modalBackgroundImageFit,
//     closeButtonPosition,
//   ]);

//   const previewHeadlineFont =
//     visualStyle === "minimal" ? "'DM Sans', 'Inter', sans-serif" : "'Cormorant Garamond', serif";
//   const previewHeadlineSize =
//     visualStyle === "editorial" ? 24 : visualStyle === "minimal" ? 20 : 22;
//   const previewSubStyle =
//     visualStyle === "editorial"
//       ? { fontSize: 11, textTransform: "none", letterSpacing: "0.04em", fontWeight: 500 }
//       : { fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
//   const previewCtaRadius = visualStyle === "minimal" ? 999 : 8;
//   const previewRightPanelStyle = useMemo(() => {
//     let pt = 24;
//     let pr = 20;
//     let pb = 20;
//     let pl = 20;
//     if (closeButtonPosition === "top_right") pr = 44;
//     if (closeButtonPosition === "top_left") pl = 44;
//     if (closeButtonPosition === "bottom_right") {
//       pr = 44;
//       pb = 48;
//     }
//     if (closeButtonPosition === "bottom_left") {
//       pl = 44;
//       pb = 48;
//     }
//     const base = {
//       flex: 1,
//       minWidth: 0,
//       padding: `${pt}px ${pr}px ${pb}px ${pl}px`,
//       display: "flex",
//       flexDirection: "column",
//       gap: 12,
//       position: "relative",
//       zIndex: 1,
//       ...(contentAlign === "center" ? { alignItems: "center", textAlign: "center" } : {}),
//     };
//     if (visualStyle !== "glass") return { ...base, background: rightPanelBg };
//     const glassBg = {
//       background: `linear-gradient(145deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 100%), ${rightPanelBg}`,
//       backdropFilter: "blur(14px)",
//       WebkitBackdropFilter: "blur(14px)",
//     };
//     if (layoutMode === "content_only") {
//       return { ...base, ...glassBg, border: "1px solid rgba(255,255,255,0.45)" };
//     }
//     if (layoutMode === "stacked") {
//       return { ...base, ...glassBg, borderTop: "1px solid rgba(255,255,255,0.5)" };
//     }
//     return {
//       ...base,
//       ...glassBg,
//       borderLeft: layoutMode === "split_image_right" ? undefined : "1px solid rgba(255,255,255,0.55)",
//       borderRight: layoutMode === "split_image_right" ? "1px solid rgba(255,255,255,0.55)" : undefined,
//     };
//   }, [visualStyle, rightPanelBg, layoutMode, contentAlign, closeButtonPosition]);

//   const previewCloseBtnStyle = useMemo(() => {
//     const s = {
//       position: "absolute",
//       zIndex: 8,
//       width: 26,
//       height: 26,
//       borderRadius: "50%",
//       border: "none",
//       fontSize: 14,
//       cursor: "default",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       background: "rgba(255,255,255,0.85)",
//       color: headlineColor,
//       boxShadow: "0 1px 4px rgba(15,23,42,0.12)",
//     };
//     if (closeButtonPosition === "top_left") return { ...s, top: 8, left: 10 };
//     if (closeButtonPosition === "bottom_right") return { ...s, bottom: 8, right: 10 };
//     if (closeButtonPosition === "bottom_left") return { ...s, bottom: 8, left: 10 };
//     return { ...s, top: 8, right: 10 };
//   }, [closeButtonPosition, headlineColor]);

//   useEffect(() => {
//     if (selectedPopupId && !popups.some((p) => p.id === selectedPopupId)) {
//       setSelectedPopupId(null);
//       setSearchParams({});
//     }
//   }, [popups, selectedPopupId, setSearchParams]);

//   const hydrateVersion = useRef("");
//   const applyEditorRef = useRef((/** @type {any} */ _h, /** @type {string} */ _n) => {});
//   applyEditorRef.current = (h, name) => {
//     setPopupName(name);
//     setDesignTemplateId(h.designTemplateId || "");
//     setPopupDesignId(h.popupDesignId);
//     setHeadline(h.headline);
//     setSubheadline(h.subheadline);
//     setCouponCode(h.couponCode);
//     setCtaText(h.ctaText);
//     setCtaHref(h.ctaHref);
//     setCountdownEndAt(h.countdownEndAt);
//     setCountdownLocal(h.countdownLocal);
//     setShowDelayMs(h.showDelayMs);
//     setDisplayTrigger(h.displayTrigger);
//     setShowMode(h.showMode);
//     setRepeatFrequencyMinutes(h.repeatFrequencyMinutes);
//     setMaxImpressions(h.maxImpressions);
//     setPageTarget(h.pageTarget);
//     setCustomPathContains(h.customPathContains);
//     setLeftPanelBg(h.leftPanelBg);
//     setRightPanelBg(h.rightPanelBg);
//     setAccentGold(h.accentGold);
//     setHeadlineColor(h.headlineColor);
//     setSubheadlineColor(h.subheadlineColor);
//     setButtonBg(h.buttonBg);
//     setButtonText(h.buttonText);
//     setOverlayBg(h.overlayBg);
//     setLeftImageUrl(h.leftImageUrl);
//     setLeftImageAlt(h.leftImageAlt);
//     setCopyCouponButtonText(h.copyCouponButtonText);
//     setCopyCouponSuccessText(h.copyCouponSuccessText);
//     setShowDismissFootnote(h.showDismissFootnote);
//     setDismissFootnoteText(h.dismissFootnoteText);
//     setLayoutMode(h.layoutMode);
//     setDimOverlay(h.dimOverlay);
//     setShowTitle(h.showTitle);
//     setTitleBadgeText(h.titleBadgeText);
//     setVisualStyle(h.visualStyle);
//     setShowHeadline(h.showHeadline);
//     setShowSubheadline(h.showSubheadline);
//     setShowContent(h.showContent);
//     setShowTiming(h.showTiming);
//     setModalTransparentShell(h.modalTransparentShell);
//     setModalBorderRadius(h.modalBorderRadius);
//     setModalMaxWidthPx(h.modalMaxWidthPx);
//     setBodyText(h.bodyText);
//     setContentAlign(h.contentAlign);
//     setCountdownStyle(h.countdownStyle);
//     setCouponVariant(h.couponVariant);
//     setEmailCaptureEnabled(h.emailCaptureEnabled);
//     setEmailPlaceholder(h.emailPlaceholder);
//     setSubscriberSignupEnabled(h.subscriberSignupEnabled);
//     setShopifyCustomerCreateEnabled(h.shopifyCustomerCreateEnabled);
//     setCustomerCreateMarketingOptIn(h.customerCreateMarketingOptIn);
//     setCustomerCreateSuccessMessage(h.customerCreateSuccessMessage);
//     setCustomerCreateSuccessImageUrl(h.customerCreateSuccessImageUrl);
//     setCustomerCreateStayInPopup(h.customerCreateStayInPopup);
//     setModalBackgroundImageUrl(h.modalBackgroundImageUrl);
//     setModalBackgroundImageAlt(h.modalBackgroundImageAlt);
//     setModalBackgroundImageFit(h.modalBackgroundImageFit);
//     setCloseButtonPosition(h.closeButtonPosition);
//   };

//   useEffect(() => {
//     if (configModal?.mode === "create" && configModal.templateId) {
//       const t = POPUP_READY_TEMPLATES.find((x) => x.id === configModal.templateId);
//       if (!t) return;
//       const v = `create:${configModal.templateId}`;
//       if (hydrateVersion.current === v) return;
//       hydrateVersion.current = v;
//       const merged = parsePopupDesignConfig(
//         JSON.stringify({
//           ...defaultPopupDesignConfig(),
//           ...t.config,
//           designTemplateId: t.id,
//           popupDesignId: generatePopupDesignId(),
//         }),
//       );
//       const shortName = (t.name.split("-")[0] || "Popup").trim();
//       applyEditorRef.current(hydrateFromConfig(merged), `${shortName} popup`);
//       return;
//     }

//     if (!selectedPopupId) {
//       const v = "__none__";
//       if (hydrateVersion.current === v) return;
//       hydrateVersion.current = v;
//       applyEditorRef.current(hydrateFromConfig(defaultPopupDesignConfig()), "Untitled popup");
//       return;
//     }

//     const p = popups.find((x) => x.id === selectedPopupId);
//     if (!p) return;
//     const v = `${p.id}:${p.savedAt}`;
//     if (hydrateVersion.current === v) return;
//     hydrateVersion.current = v;
//     applyEditorRef.current(hydrateFromConfig(p.config), p.name || "Popup");
//   }, [configModal, selectedPopupId, popups]);

//   const applyReadyTemplate = useCallback(
//     (templateId) => {
//       const t = POPUP_READY_TEMPLATES.find((x) => x.id === templateId);
//       if (!t || !selectedPopupId) return;
//       const merged = parsePopupDesignConfig(
//         JSON.stringify({
//           ...defaultPopupDesignConfig(),
//           ...t.config,
//           designTemplateId: t.id,
//           popupDesignId,
//         }),
//       );
//       setActivePreset(null);
//       applyEditorRef.current(hydrateFromConfig(merged), popupName);
//     },
//     [selectedPopupId, popupDesignId, popupName],
//   );

//   const requestDeleteConfirmClose = useCallback(() => {
//     setDeleteConfirmExiting(true);
//   }, []);

//   useEffect(() => {
//     if (!deleteConfirmExiting) return;
//     const t = globalThis.setTimeout(() => {
//       setDeleteConfirm(null);
//       setDeleteConfirmExiting(false);
//     }, 220);
//     return () => globalThis.clearTimeout(t);
//   }, [deleteConfirmExiting]);

//   useEffect(() => {
//     if (!deleteConfirm || deleteConfirmExiting) return;
//     const onKey = (e) => {
//       if (e.key === "Escape") requestDeleteConfirmClose();
//     };
//     globalThis.addEventListener?.("keydown", onKey);
//     return () => globalThis.removeEventListener?.("keydown", onKey);
//   }, [deleteConfirm, deleteConfirmExiting, requestDeleteConfirmClose]);

//   useEffect(() => {
//     const d = fetcher.data;
//     if (fetcher.state !== "idle" || !d?.ok) return;
//     const key = `${d.intent}-${d.rowId || ""}-${d.deletedId || ""}-${d.savedAt || ""}`;
//     if (fetchHandledKey.current === key) return;
//     fetchHandledKey.current = key;
//     if (d.intent === "create" || d.intent === "duplicate" || d.intent === "create_with_config") {
//       if (d.rowId) {
//         setSelectedPopupId(d.rowId);
//         setSearchParams({ popup: d.rowId });
//       }
//     }
//     if (d.intent === "create_with_config") {
//       hydrateVersion.current = "";
//       setConfigModal(null);
//     }
//     if (d.intent === "delete" && d.deletedId) {
//       hydrateVersion.current = "";
//       setConfigModal(null);
//       if (selectedPopupId === d.deletedId) setSelectedPopupId(null);
//     }
//     revalidator.revalidate();
//   }, [fetcher.state, fetcher.data, revalidator, setSearchParams, selectedPopupId]);

//   const applyPreset = useCallback((p, i) => {
//     setActivePreset(i);
//     setLeftPanelBg(p.leftPanelBg); setRightPanelBg(p.rightPanelBg);
//     setAccentGold(p.accentGold); setHeadlineColor(p.headlineColor);
//     setSubheadlineColor(p.subheadlineColor); setButtonBg(p.buttonBg);
//     setButtonText(p.buttonText); setOverlayBg(p.overlayBg);
//     if (p.visualStyle != null) setVisualStyle(parsePopupVisualStyle(p.visualStyle));
//     if (p.modalBorderRadius != null) setModalBorderRadius(Math.min(48, Math.max(0, Number(p.modalBorderRadius) || 12)));
//     if (p.titleBadgeText != null) setTitleBadgeText(String(p.titleBadgeText));
//   }, []);

//   const syncCountdown = (local) => { setCountdownLocal(local); setCountdownEndAt(fromDatetimeLocalValue(local)); };

//   const handleCopy = () => {
//     navigator.clipboard?.writeText(popupDesignId);
//     setCopied(true); setTimeout(() => setCopied(false), 1600);
//   };

//   const applyModalBackgroundOption = (key) => {
//     const picked = MODAL_BG_IMAGE_OPTIONS.find((x) => x.key === key);
//     if (!picked) return;
//     setModalBackgroundImageUrl(String(picked.url || ""));
//   };

//   return (
//     <>
//       <style>{FONT_IMPORT}{`*{box-sizing:border-box}body{margin:0}input[type=range]{accent-color:#005bd3}@keyframes sceDelOverlayIn{from{opacity:0}to{opacity:1}}@keyframes sceDelPanelIn{from{opacity:0;transform:scale(0.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
//       <s-page heading="Popup design" inlineSize="large">
//         <s-button
//           slot="primary-action"
//           type="button"
//           variant="primary"
//           icon="plus"
//           onClick={() => setTemplateModalOpen(true)}
//         >
//           Create popup
//         </s-button>
//         <s-stack slot="secondary-actions" direction="inline" gap="small-100" alignItems="center">
//           {actionData?.ok && actionData?.intent === "save" ? (
//             <s-badge tone="success" icon="check-circle">
//               Saved {new Date(actionData.savedAt || Date.now()).toLocaleTimeString()}
//             </s-badge>
//           ) : null}
//           {!(actionData?.ok && actionData?.intent === "save") && selectedPopup?.savedAt ? (
//             <s-stack direction="inline" gap="small-200" alignItems="center">
//               <s-icon type="clock" tone="subdued" size="small" />
//               <s-text tone="subdued">Last saved {new Date(selectedPopup.savedAt).toLocaleString()}</s-text>
//             </s-stack>
//           ) : null}
//         </s-stack>

//         {(actionData?.ok === false && actionData?.error) || (fetcher.data?.ok === false && fetcher.data?.error) ? (
//           <s-banner tone="critical" heading="Something went wrong">
//             {actionData?.error || fetcher.data?.error}
//           </s-banner>
//         ) : null}

//         {!configModal ? (
       
//             <div style={{ maxWidth: 1200, marginInline: "auto", width: "100%" }}>
//             <s-section heading="Popups">
//             <s-stack  direction="block" gap="base">
//               {popups.length === 0 ? (
//                 <s-box padding="large-100" borderWidth="base" borderRadius="base" background="subdued">
//                   <s-stack direction="block" gap="small-100" alignItems="center">
//                     <s-icon type="layout-popup" tone="subdued" size="large" />
//                     <s-heading>No popups yet</s-heading>
//                     <s-paragraph color="subdued">
//                       Use the primary <s-text type="strong">Create popup</s-text> action to pick a design template and configure it.
//                     </s-paragraph>
//                   </s-stack>
//                 </s-box>
//               ) : (
//                 <s-stack direction="block" gap="small-100">
//                   <s-table variant="auto" paginate={false}>
//                     <s-table-header-row>
//                       <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="hashtag" tone="subdued" size="small" />
//                           Design ID
//                         </s-stack>
//                       </s-table-header>
//                       <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="theme-template" tone="subdued" size="small" />
//                           Template
//                         </s-stack>
//                       </s-table-header>
//                       <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="note" tone="subdued" size="small" />
//                           Name
//                         </s-stack>
//                       </s-table-header>
//                       <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="text" tone="subdued" size="small" />
//                           Summary
//                         </s-stack>
//                       </s-table-header>
//                       {/* <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="calendar" tone="subdued" size="small" />
//                           Updated
//                         </s-stack>
//                       </s-table-header> */}
//                       <s-table-header listSlot="labeled" format="base">
//                         <s-stack direction="inline" gap="small-200" alignItems="center">
//                           <s-icon type="settings" tone="subdued" size="small" />
//                           Actions
//                         </s-stack>
//                       </s-table-header>
//                     </s-table-header-row>
//                     <s-table-body>
//                       {paginatedPopups.map((p) => {
//                         const meta = getPopupTemplateMeta(p.config.designTemplateId);
//                         const summary = [p.config.headline, p.config.subheadline].filter(Boolean).join(" · ").slice(0, 96);
//                         return (
//                           <s-table-row key={p.id}>
//                             <s-table-cell>
//                               <s-text tone="info">
//                                 <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", wordBreak: "break-word" }}>{p.config.popupDesignId}</span>
//                               </s-text>
//                             </s-table-cell>
//                             <s-table-cell>{meta?.name || "-"}</s-table-cell>
//                             <s-table-cell>
//                               <s-text type="strong">{p.name}</s-text>
//                             </s-table-cell>
//                             <s-table-cell>
//                               <s-text tone="subdued">{summary || "-"}</s-text>
//                             </s-table-cell>
//                             {/* <s-table-cell>
//                               <s-text tone="subdued">{new Date(p.savedAt).toLocaleString()}</s-text>
//                             </s-table-cell> */}
//                             <s-table-cell>
//                               <s-stack direction="inline" gap="small-100" alignItems="center">
//                                 <s-button
//                                   type="button"
//                                   variant="secondary"
//                                   icon="edit"
//                                   onClick={() => {
//                                     hydrateVersion.current = "";
//                                     setSelectedPopupId(p.id);
//                                     setSearchParams({ popup: p.id });
//                                     setConfigModal({ mode: "edit", rowId: p.id });
//                                   }}
//                                 >
//                                   Edit
//                                 </s-button>
//                                 <s-button
//                                   type="button"
//                                   variant="secondary"
//                                   tone="critical"
//                                   icon="delete"
//                                   disabled={fetcher.state !== "idle"}
//                                   onClick={() => {
//                                     setDeleteConfirmExiting(false);
//                                     setDeleteConfirm({ id: p.id });
//                                   }}
//                                 >
//                                   Delete
//                                 </s-button>
//                               </s-stack>
//                             </s-table-cell>
//                           </s-table-row>
//                         );
//                       })}
//                     </s-table-body>
//                   </s-table>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "flex-end",
//                       alignItems: "center",
//                       gap: 12,
//                       flexWrap: "wrap",
//                       width: "100%",
//                       paddingBlockStart: "0.5rem",
//                     }}
//                   >
//                     <s-text tone="subdued">
//                       Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, popups.length)} of {popups.length}
//                     </s-text>
//                     <s-button
//                       type="button"
//                       variant="tertiary"
//                       icon="chevron-left"
//                       disabled={tablePage === 1}
//                       onClick={() => setTablePage((pg) => Math.max(1, pg - 1))}
//                     >
//                       Previous
//                     </s-button>
//                     <s-text tone="subdued">
//                       {tablePage} / {totalTablePages}
//                     </s-text>
//                     <s-button
//                       type="button"
//                       variant="tertiary"
//                       icon="chevron-right"
//                       disabled={tablePage === totalTablePages}
//                       onClick={() => setTablePage((pg) => Math.min(totalTablePages, pg + 1))}
//                     >
//                       Next
//                     </s-button>
//                   </div>
//                 </s-stack>
//               )}
//             </s-stack>
//             </s-section>
//             </div>
          
//         ) : null}

//         {templateModalOpen ? (
//           <div
//             role="dialog"
//             aria-modal="true"
//             style={{
//               position: "fixed",
//               inset: 0,
//               zIndex: 200,
//               background: "rgba(15,23,42,0.45)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               padding: 24,
//             }}
//             onClick={(e) => {
//               if (e.target === e.currentTarget) setTemplateModalOpen(false);
//             }}
//           >
//             <div
//               style={{
//                 background: "#fff",
//                 borderRadius: 18,
//                 maxWidth: 760,
//                 width: "100%",
//                 maxHeight: "90vh",
//                 overflow: "auto",
//                 padding: "24px 28px 28px",
//                 boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
//               }}
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
//                 <div>
//                   <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#aab4c8" }}>NEW POPUP</div>
//                   <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: "#0f172a" }}>Choose a design template</div>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => setTemplateModalOpen(false)}
//                   style={{ border: "none", background: "#f1f5f9", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, color: "#475569" }}
//                 >
//                   Close
//                 </button>
//               </div>
//               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
//                 {POPUP_READY_TEMPLATES.map((t) => (
//                   <button
//                     key={t.id}
//                     type="button"
//                     onClick={() => {
//                       setTemplateModalOpen(false);
//                       setConfigModal({ mode: "create", templateId: t.id });
//                     }}
//                     style={{
//                       textAlign: "left",
//                       padding: 16,
//                       borderRadius: 14,
//                       border: "1px solid #e4e8f0",
//                       background: "#fafbfd",
//                       cursor: "pointer",
//                       transition: "border-color 0.15s",
//                     }}
//                   >
//                     <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0f172a" }}>{t.name}</div>
//                     <div style={{ fontSize: 11, color: "#8896a8", lineHeight: 1.45 }}>{t.blurb}</div>
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>
//         ) : null}

//         {configModal ? (
//           <div
//             role="dialog"
//             aria-modal="true"
//             style={{
//               position: "fixed",
//               inset: 0,
//               zIndex: 180,
//               background: "rgba(248,250,252,0.97)",
//               overflow: "auto",
//               padding: "20px 20px 48px",
//             }}
//           >
//             <div style={{ maxWidth: 1320, margin: "0 auto" }}>
//               <s-stack direction="inline" distribution="space-between" alignItems="center" paddingBlockEnd="base" gap="base">
//                 <s-stack direction="block" gap="small-200">
//                   <s-text tone="subdued">
//                     {configModal.mode === "create" ? "Create popup" : "Edit popup"}
//                   </s-text>
//                   <s-heading>
//                     {configModal.mode === "create"
//                       ? getPopupTemplateMeta(configModal.templateId)?.name || "New popup"
//                       : selectedPopup?.name || "Popup"}
//                   </s-heading>
//                 </s-stack>
//                 <s-button
//                   type="button"
//                   variant="secondary"
//                   icon="x"
//                   onClick={() => {
//                     hydrateVersion.current = "";
//                     setConfigModal(null);
//                   }}
//                 >
//                   Cancel
//                 </s-button>
//               </s-stack>
//               <s-grid gridTemplateColumns="minmax(300px, 420px) minmax(320px, 1fr)" gap="large-100" alignItems="start">
//           <s-box padding="large-100" borderRadius="large-100" borderWidth="base" background="base">

//             {!editorKeyList ? (
//               <>
//                 <SectionDivider title="Ready-made layouts" />
//                 <s-paragraph color="subdued">
//                   One click loads copy, layout, colors, and options to match common promos. Your Design ID stays the same-save when you are happy. Set a countdown end time under Timing if the template uses a timer.
//                 </s-paragraph>
//                 <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
//                   {POPUP_READY_TEMPLATES.map((t) => (
//                     <button
//                       key={t.id}
//                       type="button"
//                       disabled={!selectedPopupId}
//                       onClick={() => applyReadyTemplate(t.id)}
//                       style={{
//                         textAlign: "left",
//                         padding: "12px 14px",
//                         borderRadius: 12,
//                         border: "1px solid #e4e8f0",
//                         background: "#fafbfd",
//                         cursor: selectedPopupId ? "pointer" : "not-allowed",
//                         opacity: selectedPopupId ? 1 : 0.55,
//                         transition: "border-color 0.15s, background 0.15s",
//                       }}
//                       onMouseEnter={(e) => {
//                         if (selectedPopupId) {
//                           e.currentTarget.style.borderColor = "#6aaee8";
//                           e.currentTarget.style.background = "#f0f7ff";
//                         }
//                       }}
//                       onMouseLeave={(e) => {
//                         e.currentTarget.style.borderColor = "#e4e8f0";
//                         e.currentTarget.style.background = "#fafbfd";
//                       }}
//                     >
//                       <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2233", marginBottom: 4 }}>{t.name}</div>
//                       <div style={{ fontSize: 10, color: "#8896a8", lineHeight: 1.45 }}>{t.blurb}</div>
//                     </button>
//                   ))}
//                 </div>
//               </>
//             ) : null}

//             {showEditorKey("theme_presets") ? (
//             <>
//             <SectionDivider title="Theme Presets" />
//             <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
//               {PRESETS.map((p, i) => (
//                 <button key={p.key} type="button" onClick={() => applyPreset(p, i)} title={p.name}
//                   style={{ flex: "1 1 88px", minWidth: 72, border: activePreset === i ? `2px solid ${p.accentGold}` : "2px solid transparent", borderRadius: 12, padding: "10px 4px", cursor: "pointer", background: p.leftPanelBg, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: activePreset === i ? `0 3px 14px ${p.accentGold}44` : "0 1px 5px rgba(0,0,0,0.08)", transform: activePreset === i ? "scale(1.06)" : "scale(1)" }}
//                   onMouseEnter={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1.03)"; }}
//                   onMouseLeave={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1)"; }}
//                 >
//                   <div style={{ width: 18, height: 18, borderRadius: "50%", background: p.dot, boxShadow: `0 0 0 3px ${p.dot}33` }} />
//                   <span style={{ fontSize: 9, fontWeight: 700, color: p.headlineColor, letterSpacing: "0.05em" }}>{p.name}</span>
//                 </button>
//               ))}
//             </div>
//             </>
//             ) : null}

//             {showEditorKey("design_id") ? (
//             <>
//             <SectionDivider title="Design ID" />
//             <s-stack direction="inline" gap="small-100" alignItems="end">
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <s-text-field
//                   label="Design ID"
//                   value={popupDesignId}
//                   readOnly
//                   placeholder="popup_summer_2025"
//                   details="Paste this into your theme block or app embed."
//                 />
//               </div>
//               <s-button
//                 type="button"
//                 variant="secondary"
//                 icon={copied ? "check-circle" : "duplicate"}
//                 onClick={handleCopy}
//               >
//                 {copied ? "Copied" : "Copy"}
//               </s-button>
//             </s-stack>
//             </>
//             ) : null}

//             {showEditorKey("popup_name") ? (
//             <>
//             <SectionDivider title="This popup" />
//             <Field label="Internal name (app list only)" value={popupName} onChange={(e) => setPopupName(e.currentTarget.value)} placeholder="Spring sale modal" />
//             <s-paragraph color="subdued">
//               Not shown on the storefront. Paste the Design ID into the theme <strong>Popup design</strong> block or the <strong>Popup design (site-wide)</strong> app embed. Use the app embed (Theme → App embeds) when you target product, collection, or cart pages so the script loads on every template-not only where a section block was added.
//             </s-paragraph>
//             </>
//             ) : null}

//             {showEditorKey("layout_mode", "visual_style", "appearance_align", "appearance_countdown", "appearance_coupon") ? (
//             <>
//             <SectionDivider title="Layout & appearance" />
//             {showEditorKey("layout_mode") ? (
//             <s-select
//               label="Layout"
//               value={layoutMode}
//               onChange={(e) => setLayoutMode(parsePopupLayoutMode(e.target?.value ?? layoutMode))}
//             >
//               {Object.entries(LAYOUT_LABELS).map(([k, lab]) => (
//                 <s-option key={k} value={k}>{lab}</s-option>
//               ))}
//             </s-select>
//             ) : null}
//             {showEditorKey("visual_style") ? (
//             <s-stack direction="block" gap="small-100">
//               <s-select
//                 label="Visual style"
//                 value={visualStyle}
//                 onChange={(e) => setVisualStyle(parsePopupVisualStyle(e.target?.value ?? visualStyle))}
//               >
//                 {Object.entries(VISUAL_STYLE_LABELS).map(([k, lab]) => (
//                   <s-option key={k} value={k}>{lab}</s-option>
//                 ))}
//               </s-select>
//               <s-paragraph color="subdued">
//                 Glass works best with soft panel colors and a dimmed overlay. Minimal uses a clean sans headline on the storefront.
//               </s-paragraph>
//             </s-stack>
//             ) : null}
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               {showEditorKey("appearance_align") ? (
//               <s-select
//                 label="Content alignment"
//                 value={contentAlign}
//                 onChange={(e) => setContentAlign(parsePopupContentAlign(e.target?.value ?? contentAlign))}
//               >
//                 <s-option value="left">Left</s-option>
//                 <s-option value="center">Center</s-option>
//               </s-select>
//               ) : null}
//               {showTiming && showEditorKey("appearance_countdown") ? (
//               <s-select
//                 label="Countdown layout"
//                 value={countdownStyle}
//                 onChange={(e) => setCountdownStyle(parsePopupCountdownStyle(e.target?.value ?? countdownStyle))}
//               >
//                 <s-option value="compact">Compact (DD:HH:MM:SS)</s-option>
//                 <s-option value="labeled">Labeled boxes</s-option>
//               </s-select>
//               ) : null}
//               {showEditorKey("appearance_coupon") ? (
//               <s-grid-item gridColumn="span 2">
//                 <s-select
//                   label="Coupon style"
//                   value={couponVariant}
//                   onChange={(e) => setCouponVariant(parsePopupCouponVariant(e.target?.value ?? couponVariant))}
//                 >
//                   <s-option value="dashed">Dashed box</s-option>
//                   <s-option value="ticket">Ticket / stub</s-option>
//                 </s-select>
//               </s-grid-item>
//               ) : null}
//             </s-grid>
//             </>
//             ) : null}

//             {showEditorKey("body_text") ? (
//             <s-text-area
//               label="Body text (optional)"
//               value={bodyText}
//               rows={3}
//               minLength={0}
//               maxLength={10000}
//               placeholder="Short paragraph under the sub-headline…"
//               onChange={(e) => setBodyText(String(e.target?.value ?? ""))}
//             />
//             ) : null}

//             {showEditorKey("modal_bg", "close_button") ? (
//             <>
//             <SectionDivider title="Modal background & close button" />
//             <s-paragraph color="subdued">
//               Full-card background sits <strong>behind</strong> both columns (separate from the left-column / hero image URL in Content). Close button is anchored to the whole popup so it can sit over the image in stacked layouts.
//             </s-paragraph>
//             {/* <div style={{ marginBottom: 12 }}>
//               <Field label="Modal background image URL" value={modalBackgroundImageUrl} onChange={(e) => setModalBackgroundImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
//               <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
//                 <label style={{ fontSize: 10, fontWeight: 700, color: "#8896a8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
//                   Quick set
//                 </label>
//                 <select
//                   value={MODAL_BG_IMAGE_OPTIONS.some((x) => x.url === modalBackgroundImageUrl) ? (MODAL_BG_IMAGE_OPTIONS.find((x) => x.url === modalBackgroundImageUrl)?.key || "custom") : "custom"}
//                   onChange={(e) => applyModalBackgroundOption(e.target.value)}
//                   style={{ border: "1.5px solid #e4e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#1a2233", background: "#fff" }}
//                 >
//                   {MODAL_BG_IMAGE_OPTIONS.map((o) => (
//                     <option key={o.key} value={o.key}>{o.name}</option>
//                   ))}
//                   <option value="custom">Custom URL (manual)</option>
//                 </select>
//                 <button
//                   type="button"
//                   onClick={() => setModalBackgroundImageUrl("")}
//                   style={{ border: "1px solid #e4e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 11, background: "#f8fafc", color: "#475569", cursor: "pointer" }}
//                 >
//                   Clear
//                 </button>
//               </div>
//             </div> */}
//             {/* <div style={{ marginBottom: 12 }}>
//               <Field label="Background image alt (optional)" value={modalBackgroundImageAlt} onChange={(e) => setModalBackgroundImageAlt(e.currentTarget.value)} placeholder="Describe image for accessibility" />
//             </div> */}
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               <s-select
//                 label="Background image fit"
//                 value={modalBackgroundImageFit}
//                 onChange={(e) => setModalBackgroundImageFit(parsePopupModalBackgroundImageFit(e.target?.value ?? modalBackgroundImageFit))}
//               >
//                 {Object.entries(MODAL_BG_FIT_LABELS).map(([k, lab]) => (
//                   <s-option key={k} value={k}>{lab}</s-option>
//                 ))}
//               </s-select>
//               <s-select
//                 label="Close button position"
//                 value={closeButtonPosition}
//                 onChange={(e) => setCloseButtonPosition(parsePopupCloseButtonPosition(e.target?.value ?? closeButtonPosition))}
//               >
//                 {Object.entries(CLOSE_BUTTON_LABELS).map(([k, lab]) => (
//                   <s-option key={k} value={k}>{lab}</s-option>
//                 ))}
//               </s-select>
//             </s-grid>
//             </>
//             ) : null}

//             {showEditorKey("email_capture") ? (
//             <s-stack direction="block" gap="small-100">
//               <s-checkbox
//                 label="Show email field (CTA appends ?email=… to your link)"
//                 checked={emailCaptureEnabled}
//                 onChange={(e) => {
//                   const on = e.target?.checked ?? false;
//                   setEmailCaptureEnabled(on);
//                   if (!on) {
//                     setSubscriberSignupEnabled(false);
//                     setShopifyCustomerCreateEnabled(false);
//                   }
//                 }}
//               />
//               {emailCaptureEnabled && (
//                 <>
//                   <Field label="Email placeholder" value={emailPlaceholder} onChange={(e) => setEmailPlaceholder(e.currentTarget.value)} />
//                   <s-checkbox
//                     label="Record signups & subscriber count (server POST, then same redirect with query params)"
//                     checked={subscriberSignupEnabled}
//                     onChange={(e) => setSubscriberSignupEnabled(e.target?.checked ?? false)}
//                   />
//                   <s-checkbox
//                     label="Create Shopify customer on subscribe (Admin GraphQL; needs write_customers scope)"
//                     checked={shopifyCustomerCreateEnabled}
//                     onChange={(e) => setShopifyCustomerCreateEnabled(e.target?.checked ?? false)}
//                   />
//                   {shopifyCustomerCreateEnabled ? (
//                     <>
//                       <s-checkbox
//                         label="Subscribe customer to email marketing (single opt-in)"
//                         checked={customerCreateMarketingOptIn}
//                         onChange={(e) => setCustomerCreateMarketingOptIn(e.target?.checked ?? false)}
//                       />
//                       <s-checkbox
//                         label="Show success message in popup (no redirect). Off: send visitor to CTA link after success if a link is set."
//                         checked={customerCreateStayInPopup}
//                         onChange={(e) => setCustomerCreateStayInPopup(e.target?.checked ?? false)}
//                       />
//                       <Field label="Success message" value={customerCreateSuccessMessage} onChange={(e) => setCustomerCreateSuccessMessage(e.currentTarget.value)} />
//                       <Field label="Success image URL (optional, https or /path)" value={customerCreateSuccessImageUrl} onChange={(e) => setCustomerCreateSuccessImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
//                     </>
//                   ) : null}
//                   <s-paragraph color="subdued">
//                     Point CTA link at a page that reads query params, or your newsletter URL. Values are appended as <code style={{ fontSize: 10 }}>email</code> and <code style={{ fontSize: 10 }}>first_name</code>.
//                     {subscriberSignupEnabled ? " With recording on, a valid email is stored in the app first, then the visitor is sent to your link with the same parameters." : null}
//                     {shopifyCustomerCreateEnabled ? " Re-approve app scopes after enabling write_customers, then open the app once per shop so an offline session exists." : null}
//                   </s-paragraph>
//                 </>
//               )}
//             </s-stack>
//             ) : null}

//             {showEditorKey("toggles") ? (
//             <s-stack direction="block" gap="small-100">
//               <s-checkbox label="Dimmed page behind popup" checked={dimOverlay} onChange={(e) => setDimOverlay(e.target?.checked ?? false)} />
//               <s-checkbox label="Show title badge" checked={showTitle} onChange={(e) => setShowTitle(e.target?.checked ?? false)} />
//               <s-checkbox label="Show headline" checked={showHeadline} onChange={(e) => setShowHeadline(e.target?.checked ?? false)} />
//               <s-checkbox label="Show sub-headline" checked={showSubheadline} onChange={(e) => setShowSubheadline(e.target?.checked ?? false)} />
//               <s-checkbox label="Show content (coupon + CTA)" checked={showContent} onChange={(e) => setShowContent(e.target?.checked ?? false)} />
//               <s-checkbox label="Transparent outer shell (no card shadow)" checked={modalTransparentShell} onChange={(e) => setModalTransparentShell(e.target?.checked ?? false)} />
//             </s-stack>
//             ) : null}

//             {showEditorKey("modal_shape") ? (
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               <Field label="Modal radius (px)" type="number" min={0} max={48} value={String(modalBorderRadius)} onChange={(e) => setModalBorderRadius(Math.min(48, Math.max(0, Number(e.currentTarget.value) || 0)))} />
//               <Field label="Max width px (0 = default)" type="number" min={0} max={920} value={String(modalMaxWidthPx)} onChange={(e) => setModalMaxWidthPx(Math.max(0, Number(e.currentTarget.value) || 0))} />
//             </s-grid>
//             ) : null}
//             {showEditorKey("modal_shape", "toggles") ? (
//             <s-paragraph color="subdued">Turn off the dimmed overlay for a “floating” look; set overlay color to transparent in the palette for the same effect with custom tint.</s-paragraph>
//             ) : null}

//             {showEditorKey("content_badge", "content_headlines", "content_coupon", "content_cta", "content_cta_link", "content_hero_image", "content_copy_buttons", "content_dismiss") ? (
//             <>
//             <SectionDivider title="Content" />
//             {showEditorKey("content_badge") ? (
//             <s-stack direction="block" gap="small-100">
//               <Field label="Title badge text" value={titleBadgeText} onChange={(e) => setTitleBadgeText(e.currentTarget.value)} placeholder="✦ LIMITED OFFER" />
//               {!showTitle ? (
//                 <s-text tone="subdued">Badge is hidden; turn on “Show title badge” in Visibility to display it.</s-text>
//               ) : null}
//             </s-stack>
//             ) : null}
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               {showEditorKey("content_headlines") ? (
//               <>
//               <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} />
//               <Field label="Sub-headline" value={subheadline} onChange={(e) => setSubheadline(e.currentTarget.value)} />
//               </>
//               ) : null}
//               {showEditorKey("content_coupon") ? (
//               <Field label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.currentTarget.value)} />
//               ) : null}
//               {showEditorKey("content_cta") ? (
//               <Field label="CTA label" value={ctaText} onChange={(e) => setCtaText(e.currentTarget.value)} />
//               ) : null}
//             </s-grid>
//             {showEditorKey("content_cta_link") ? (
//             <Field label="CTA link (optional)" value={ctaHref} onChange={(e) => setCtaHref(e.currentTarget.value)} placeholder="https://..." />
//             ) : null}
//             {showEditorKey("content_hero_image") ? (
//             <s-stack direction="block" gap="base">
//               <Field label="Left panel image URL" value={leftImageUrl} onChange={(e) => setLeftImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
//               <Field label="Image alt text (optional)" value={leftImageAlt} onChange={(e) => setLeftImageAlt(e.currentTarget.value)} />
//             </s-stack>
//             ) : null}
//             {showEditorKey("content_copy_buttons") ? (
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               <Field label="Copy button label" value={copyCouponButtonText} onChange={(e) => setCopyCouponButtonText(e.currentTarget.value)} />
//               <Field label="Copied confirmation" value={copyCouponSuccessText} onChange={(e) => setCopyCouponSuccessText(e.currentTarget.value)} />
//             </s-grid>
//             ) : null}
//             {showEditorKey("content_dismiss") ? (
//             <>
//             <s-checkbox
//               label="Show dismiss line under the CTA"
//               checked={showDismissFootnote}
//               onChange={(e) => setShowDismissFootnote(e.target?.checked ?? false)}
//             />
//             {showDismissFootnote && (
//               <Field label="Dismiss line text" value={dismissFootnoteText} onChange={(e) => setDismissFootnoteText(e.currentTarget.value)} placeholder="No thanks, I'll pay full price" />
//             )}
//             </>
//             ) : null}
//             </>
//             ) : null}

//             {showEditorKey("timing") ? (
//             <>
//             <SectionDivider title="Timing" />
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               <s-select
//                 label="Display trigger"
//                 value={displayTrigger}
//                 onChange={(e) => setDisplayTrigger(String(e.target?.value ?? displayTrigger))}
//               >
//                 <s-option value="on_load">On load</s-option>
//                 <s-option value="delay">After delay</s-option>
//               </s-select>
//               <s-select
//                 label="Show mode"
//                 value={showMode}
//                 onChange={(e) => setShowMode(String(e.target?.value ?? showMode))}
//               >
//                 <s-option value="repeat">Repeat</s-option>
//                 <s-option value="once">Show once</s-option>
//               </s-select>
//             </s-grid>
//             <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//               <Field
//                 label="Repeat every (minutes)"
//                 type="number"
//                 min={1}
//                 max={10080}
//                 value={String(repeatFrequencyMinutes)}
//                 onChange={(e) => setRepeatFrequencyMinutes(Math.max(1, Number(e.currentTarget.value) || 1))}
//               />
//               <Field
//                 label="Max times to show (0 = unlimited)"
//                 type="number"
//                 min={0}
//                 max={10000}
//                 value={String(maxImpressions)}
//                 onChange={(e) => setMaxImpressions(Math.max(0, Math.min(10000, Number(e.currentTarget.value) || 0)))}
//               />
//             </s-grid>
//             <s-paragraph color="subdued">
//               Per browser: each time the modal appears counts once. After the limit, it stops until the visitor clears site data or you change the design ID.
//             </s-paragraph>

//             {maxImpressions > 0 ? (
//               <s-banner tone="caution" heading="Impression limit active">
//                 Max times to show is set to <strong>{maxImpressions}</strong>. Each full display counts for that browser. If you tested on the homepage already, the limit may be reached-try a private window, raise the limit, or clear site data for your store.
//               </s-banner>
//             ) : null}

//             <s-box padding="base" borderRadius="base" background="subdued" borderWidth="base">
//               <input type="range" min={0} max={10000} step={100} value={showDelayMs} onChange={(e) => setShowDelayMs(Number(e.target.value))} style={{ width: "100%" }} />
//               <s-stack direction="inline" distribution="space-between" paddingBlockStart="small-100">
//                 <s-text tone="subdued">Instant</s-text>
//                 <s-text type="strong">{showDelayMs} ms</s-text>
//                 <s-text tone="subdued">10 000ms</s-text>
//               </s-stack>
//             </s-box>

//             <s-stack direction="block" gap="small-100" paddingBlockStart="base">
//               <s-text type="strong">Countdown</s-text>
//               <s-paragraph color="subdued">
//                 Turn on the timer for the storefront preview, then pick when the offer ends (date and time).
//               </s-paragraph>
//               <s-checkbox
//                 label="Show timing / countdown"
//                 checked={showTiming}
//                 onChange={(e) => setShowTiming(e.target?.checked ?? false)}
//               />
//               <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                 <Field label="Show delay (ms)" type="number" min={0} max={60000} value={String(showDelayMs)} onChange={(e) => setShowDelayMs(Math.max(0, Number(e.currentTarget.value) || 0))} />
//                 {showTiming ? (
//                   <Field label="Countdown end" type="datetime-local" value={countdownLocal} onChange={(e) => syncCountdown(e.currentTarget.value)} />
//                 ) : (
//                   <s-text tone="subdued">Enable “Show timing / countdown” to open the date and time picker.</s-text>
//                 )}
//               </s-grid>
//             </s-stack>
//             </>
//             ) : null}

//             {showEditorKey("targeting") ? (
//             <>
//             <s-select
//               label="Page targeting"
//               value={pageTarget}
//               onChange={(e) => setPageTarget(String(e.target?.value ?? pageTarget))}
//             >
//               <s-option value="all">All pages</s-option>
//               <s-option value="home">Homepage</s-option>
//               <s-option value="product">Product pages</s-option>
//               <s-option value="collection">Collection pages</s-option>
//               <s-option value="cart">Cart page</s-option>
//               <s-option value="custom">URL contains</s-option>
//             </s-select>
//             {pageTarget === "custom" && (
//               <div style={{ marginBottom: 12 }}>
//                 <Field label="URL must contain" value={customPathContains} onChange={(e) => setCustomPathContains(e.currentTarget.value)} placeholder="/collections/summer" />
//               </div>
//             )}

//             {targetingExplainer.needsSiteWideEmbed ? (
//               <s-banner tone="warning" heading="Product / collection / cart / custom URLs">
//                 The section-only block often exists only on the homepage, so <strong>this script never runs on product pages</strong> unless you add it there. Turn on the app embed:{" "}
//                 <strong>Online store → Themes → Customize → App embeds → “Popup design (site-wide)”</strong>, paste Design ID{" "}
//                 <code style={{ background: "var(--p-color-bg-surface-secondary, #fff)", padding: "1px 6px", borderRadius: 4 }}>{popupDesignId || "-"}</code>, save, then open a product URL again.
//               </s-banner>
//             ) : null}

//             <s-banner tone="info" heading="Where this popup is allowed to open (storefront)">
//               <ul style={{ margin: 0, paddingLeft: 18 }}>
//                 {targetingExplainer.bullets.map((line, i) => (
//                   <li key={i} style={{ marginBottom: 4 }}>
//                     {line}
//                   </li>
//                 ))}
//               </ul>
//               <s-paragraph color="subdued">
//                 The app only checks the browser address (path). It does not replace theme placement-you still need the embed or section on templates where you want the script to load.
//               </s-paragraph>
//             </s-banner>
//             </>
//             ) : null}

//             {showEditorKey("colors") ? (
//             <>
//             <SectionDivider title="Color Palette" />
//             <s-stack direction="block" gap="base">
//               <ColorRow label="Left panel" value={leftPanelBg} onChange={setLeftPanelBg} />
//               <ColorRow label="Right panel" value={rightPanelBg} onChange={setRightPanelBg} />
//               <ColorRow label="Accent" value={accentGold} onChange={setAccentGold} />
//               <ColorRow label="Headline" value={headlineColor} onChange={setHeadlineColor} />
//               <ColorRow label="Sub-headline" value={subheadlineColor} onChange={setSubheadlineColor} />
//               <ColorRow label="Button BG" value={buttonBg} onChange={setButtonBg} />
//               <ColorRow label="Button text" value={buttonText} onChange={setButtonText} />
//               <ColorRow label="Overlay" value={overlayBg} onChange={setOverlayBg} />
//             </s-stack>
//             </>
//             ) : null}

//             <s-stack direction="block" gap="small-100" paddingBlockStart="large-100">
//               {configModal.mode === "create" ? (
//                 <s-button
//                   type="button"
//                   variant="primary"
//                   icon="plus"
//                   disabled={fetcher.state !== "idle"}
//                   loading={fetcher.state !== "idle"}
//                   onClick={() => {
//                     const fd = new FormData();
//                     fd.set("intent", "create_with_config");
//                     fd.set("popupName", popupName);
//                     fd.set("configJson", JSON.stringify(serializeEditorToParsedConfig()));
//                     fetcher.submit(fd, { method: "post" });
//                   }}
//                 >
//                   Create popup
//                 </s-button>
//               ) : (
//               <Form method="post">
//                 <input type="hidden" name="intent" value="save" />
//                 <input type="hidden" name="rowId" value={selectedPopupId || ""} />
//                 <input type="hidden" name="popupName" value={popupName} />
//                 <input type="hidden" name="designTemplateId" value={designTemplateId} />
//                 <input type="hidden" name="popupDesignId" value={popupDesignId} />
//                 <input type="hidden" name="layoutMode" value={layoutMode} />
//                 <input type="hidden" name="dimOverlay" value={dimOverlay ? "1" : "0"} />
//                 <input type="hidden" name="showTitle" value={showTitle ? "1" : "0"} />
//                 <input type="hidden" name="titleBadgeText" value={titleBadgeText} />
//                 <input type="hidden" name="visualStyle" value={visualStyle} />
//                 <input type="hidden" name="showHeadline" value={showHeadline ? "1" : "0"} />
//                 <input type="hidden" name="showSubheadline" value={showSubheadline ? "1" : "0"} />
//                 <input type="hidden" name="showContent" value={showContent ? "1" : "0"} />
//                 <input type="hidden" name="showTiming" value={showTiming ? "1" : "0"} />
//                 <input type="hidden" name="modalTransparentShell" value={modalTransparentShell ? "1" : "0"} />
//                 <input type="hidden" name="modalBorderRadius" value={String(modalBorderRadius)} />
//                 <input type="hidden" name="modalMaxWidthPx" value={String(modalMaxWidthPx)} />
//                 <input type="hidden" name="headline" value={headline} />
//                 <input type="hidden" name="subheadline" value={subheadline} />
//                 <input type="hidden" name="couponCode" value={couponCode} />
//                 <input type="hidden" name="ctaText" value={ctaText} />
//                 <input type="hidden" name="ctaHref" value={ctaHref} />
//                 <input type="hidden" name="countdownEndAt" value={countdownEndAt} />
//                 <input type="hidden" name="showDelayMs" value={String(showDelayMs)} />
//                 <input type="hidden" name="displayTrigger" value={displayTrigger} />
//                 <input type="hidden" name="showMode" value={showMode} />
//                 <input type="hidden" name="repeatFrequencyMinutes" value={String(repeatFrequencyMinutes)} />
//                 <input type="hidden" name="maxImpressions" value={String(maxImpressions)} />
//                 <input type="hidden" name="pageTarget" value={pageTarget} />
//                 <input type="hidden" name="customPathContains" value={customPathContains} />
//                 <input type="hidden" name="leftImageUrl" value={leftImageUrl} />
//                 <input type="hidden" name="leftImageAlt" value={leftImageAlt} />
//                 <input type="hidden" name="copyCouponButtonText" value={copyCouponButtonText} />
//                 <input type="hidden" name="copyCouponSuccessText" value={copyCouponSuccessText} />
//                 <input type="hidden" name="showDismissFootnote" value={showDismissFootnote ? "1" : "0"} />
//                 <input type="hidden" name="dismissFootnoteText" value={dismissFootnoteText} />
//                 <input type="hidden" name="leftPanelBg" value={leftPanelBg} />
//                 <input type="hidden" name="rightPanelBg" value={rightPanelBg} />
//                 <input type="hidden" name="accentGold" value={accentGold} />
//                 <input type="hidden" name="headlineColor" value={headlineColor} />
//                 <input type="hidden" name="subheadlineColor" value={subheadlineColor} />
//                 <input type="hidden" name="buttonBg" value={buttonBg} />
//                 <input type="hidden" name="buttonText" value={buttonText} />
//                 <input type="hidden" name="overlayBg" value={overlayBg} />
//                 <input type="hidden" name="bodyText" value={bodyText} />
//                 <input type="hidden" name="contentAlign" value={contentAlign} />
//                 <input type="hidden" name="countdownStyle" value={countdownStyle} />
//                 <input type="hidden" name="couponVariant" value={couponVariant} />
//                 <input type="hidden" name="emailCaptureEnabled" value={emailCaptureEnabled ? "1" : "0"} />
//                 <input type="hidden" name="emailPlaceholder" value={emailPlaceholder} />
//                 <input type="hidden" name="subscriberSignupEnabled" value={subscriberSignupEnabled ? "1" : "0"} />
//                 <input type="hidden" name="shopifyCustomerCreateEnabled" value={shopifyCustomerCreateEnabled ? "1" : "0"} />
//                 <input type="hidden" name="customerCreateMarketingOptIn" value={customerCreateMarketingOptIn ? "1" : "0"} />
//                 <input type="hidden" name="customerCreateSuccessMessage" value={customerCreateSuccessMessage} />
//                 <input type="hidden" name="customerCreateSuccessImageUrl" value={customerCreateSuccessImageUrl} />
//                 <input type="hidden" name="customerCreateStayInPopup" value={customerCreateStayInPopup ? "1" : "0"} />
//                 <input type="hidden" name="modalBackgroundImageUrl" value={modalBackgroundImageUrl} />
//                 <input type="hidden" name="modalBackgroundImageAlt" value={modalBackgroundImageAlt} />
//                 <input type="hidden" name="modalBackgroundImageFit" value={modalBackgroundImageFit} />
//                 <input type="hidden" name="closeButtonPosition" value={closeButtonPosition} />
//                 <s-button type="submit" variant="primary" icon="save" disabled={!selectedPopupId}>
//                   Save changes
//                 </s-button>
//               </Form>
//               )}
//             </s-stack>
//           </s-box>

//           {/* RIGHT: Live Preview */}
//           <div style={{ position: "sticky", top: 88 }}>
//             <s-stack direction="inline" gap="small-100" alignItems="center" paddingBlockEnd="base">
//               <s-icon type="view" tone="success" size="small" />
//               <s-text type="strong">Live preview</s-text>
//             </s-stack>

//             {/* Browser frame */}
//             <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e0e6f0", overflow: "hidden", boxShadow: "0 4px 36px rgba(20,40,90,0.1)" }}>
//               {/* Browser chrome */}
//               <div style={{ background: "#f2f4f8", borderBottom: "1px solid #e4e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
//                 <div style={{ display: "flex", gap: 6 }}>
//                   {["#ff6b6b", "#ffd93d", "#6bcb77"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
//                 </div>
//                 <div style={{ flex: 1, background: "#fff", border: "1px solid #dde2ec", borderRadius: 6, padding: "4px 14px", fontSize: 11, color: "#aab4c8", textAlign: "center" }}>yourstore.myshopify.com</div>
//               </div>

//               {/* Viewport */}
//               <div style={{ background: "linear-gradient(140deg, #eef2fa 0%, #e4eaf6 100%)", padding: "52px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420, position: "relative", overflow: "hidden" }}>
//                 {/* Skeleton */}
//                 <div style={{ position: "absolute", inset: 0, padding: "18px 24px" }}>
//                   {[58, 42, 66, 36, 52].map((w, i) => <div key={i} style={{ height: 7, background: "rgba(80,110,160,0.08)", borderRadius: 4, margin: "10px 0", width: `${w}%` }} />)}
//                 </div>
//                 {/* Overlay */}
//                 <div style={{ position: "absolute", inset: 0, background: dimOverlay ? overlayBg : "transparent" }} />

//                 {/* Popup */}
//                 <div style={{
//                   position: "relative",
//                   zIndex: 2,
//                   width: "100%",
//                   maxWidth: modalMaxWidthPx >= 280 ? modalMaxWidthPx : 510,
//                   borderRadius: modalBorderRadius,
//                   overflow: "hidden",
//                   display: "flex",
//                   flexDirection: layoutMode === "stacked" ? "column" : layoutMode === "split_image_right" ? "row-reverse" : "row",
//                   boxShadow: modalTransparentShell ? "none" : "0 28px 80px rgba(20,40,100,0.2), 0 0 0 1px rgba(255,255,255,0.9)",
//                 }}>
//                   {modalBackgroundImageUrl.trim() ? (
//                     <img
//                       src={modalBackgroundImageUrl.trim()}
//                       alt={modalBackgroundImageAlt.trim() || ""}
//                       style={{
//                         position: "absolute",
//                         inset: 0,
//                         zIndex: 0,
//                         width: "100%",
//                         height: "100%",
//                         objectFit: modalBackgroundImageFit === "contain" ? "contain" : "cover",
//                         objectPosition: "center",
//                         pointerEvents: "none",
//                         borderRadius: modalBorderRadius,
//                       }}
//                     />
//                   ) : null}
//                   {layoutMode !== "content_only" && (
//                   <div style={{
//                     width: layoutMode === "stacked" ? "100%" : 168,
//                     flexShrink: 0,
//                     background: leftPanelBg,
//                     position: "relative",
//                     zIndex: 1,
//                     overflow: "hidden",
//                     minHeight: layoutMode === "stacked" ? 150 : 220,
//                   }}>
//                     {leftImageUrl.trim() ? (
//                       <img src={leftImageUrl.trim()} alt={leftImageAlt || "Promotion"} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0 }} />
//                     ) : (
//                       <>
//                         <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: accentGold, opacity: 0.22, top: -22, left: -28 }} />
//                         <div style={{ position: "absolute", width: 68, height: 68, borderRadius: "50%", background: accentGold, opacity: 0.15, top: 42, left: 52 }} />
//                         <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", background: accentGold, opacity: 0.1, bottom: -40, left: -28 }} />
//                         <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)" }}>
//                           <div style={{ width: 26, height: 16, background: accentGold, opacity: 0.6, borderRadius: "4px 4px 0 0", margin: "0 auto" }} />
//                           <div style={{ width: 40, height: 50, background: accentGold, opacity: 0.6, borderRadius: "6px 6px 10px 10px" }} />
//                         </div>
//                       </>
//                     )}
//                   </div>
//                   )}

//                   {/* Right panel */}
//                   <div style={previewRightPanelStyle}>
//                     {showTitle && (
//                       <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${accentGold}18`, border: `1px solid ${accentGold}40`, borderRadius: visualStyle === "minimal" ? 6 : 20, padding: visualStyle === "editorial" ? "5px 12px" : "3px 9px", alignSelf: contentAlign === "center" ? "center" : "flex-start", fontSize: 9, fontWeight: 700, letterSpacing: visualStyle === "minimal" ? "0.14em" : "0.1em", color: accentGold }}>
//                         {titleBadgeText.trim() || "✦ LIMITED OFFER"}
//                       </div>
//                     )}

//                     {showHeadline && (
//                     <div style={{ fontFamily: previewHeadlineFont, fontSize: previewHeadlineSize, fontWeight: 700, color: headlineColor, lineHeight: 1.2, paddingRight: contentAlign === "center" ? 0 : 14, whiteSpace: headline.includes("\n") ? "pre-line" : "normal" }}>
//                       {headline || "Your Headline Here"}
//                     </div>
//                     )}

//                     {showSubheadline && (
//                     <div style={{ color: subheadlineColor, ...previewSubStyle }}>
//                       {subheadline || "Subheadline text"}
//                     </div>
//                     )}

//                     {bodyText.trim() && (
//                       <div style={{ fontSize: 12, lineHeight: 1.55, color: headlineColor, opacity: 0.85, width: contentAlign === "center" ? "100%" : "100%", maxWidth: 340 }}>
//                         {bodyText.trim()}
//                       </div>
//                     )}

//                     {showTiming && <CountdownPreview endAtIso={countdownEndAt} accent={accentGold} bg={`${accentGold}14`} compact={countdownStyle === "compact"} />}

//                     {emailCaptureEnabled && showContent && (
//                       <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 300 }}>
//                         <input readOnly placeholder={emailPlaceholder} style={{ border: "1px solid rgba(15,23,42,0.16)", borderRadius: 8, padding: "9px 11px", fontSize: 12, color: "#64748b" }} />
//                       </div>
//                     )}

//                     {showContent && couponCode && (
//                       <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch", justifyContent: contentAlign === "center" ? "center" : "flex-start", width: "100%" }}>
//                         <div style={{
//                           flex: "1 1 120px",
//                           maxWidth: couponVariant === "ticket" ? 280 : undefined,
//                           border: couponVariant === "ticket" ? "none" : `1.5px dashed ${accentGold}70`,
//                           borderRadius: couponVariant === "ticket" ? 10 : 8,
//                           padding: couponVariant === "ticket" ? "14px 28px" : "8px 12px",
//                           textAlign: "center",
//                           fontWeight: 700,
//                           fontSize: 13,
//                           letterSpacing: "0.12em",
//                           color: headlineColor,
//                           background: couponVariant === "ticket" ? "#fff" : `${accentGold}0c`,
//                           fontFamily: "monospace",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           minWidth: 0,
//                           wordBreak: "break-all",
//                           boxShadow: couponVariant === "ticket" ? "inset 0 0 0 1px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.06)" : undefined,
//                           borderTop: couponVariant === "ticket" ? "1px dashed rgba(15,23,42,0.12)" : undefined,
//                           borderBottom: couponVariant === "ticket" ? "1px dashed rgba(15,23,42,0.12)" : undefined,
//                         }}
//                         >
//                           {couponCode}
//                         </div>
//                         <button
//                           type="button"
//                           onClick={() => {
//                             navigator.clipboard?.writeText(couponCode).then(() => {
//                               setPreviewCouponCopied(true);
//                               setTimeout(() => setPreviewCouponCopied(false), 2000);
//                             });
//                           }}
//                           style={{
//                             flex: "0 0 auto",
//                             border: `1px solid ${accentGold}55`,
//                             borderRadius: 8,
//                             padding: "8px 14px",
//                             fontWeight: 600,
//                             fontSize: 12,
//                             cursor: "pointer",
//                             background: "#fff",
//                             color: headlineColor,
//                             fontFamily: "'Inter', sans-serif",
//                           }}
//                         >
//                           {previewCouponCopied ? copyCouponSuccessText : copyCouponButtonText}
//                         </button>
//                       </div>
//                     )}

//                     {showContent && (
//                       <button type="button" style={{ background: buttonBg, color: buttonText, border: "none", borderRadius: previewCtaRadius, padding: visualStyle === "minimal" ? "13px 16px" : "11px 14px", fontWeight: visualStyle === "minimal" ? 600 : 700, fontSize: 11, letterSpacing: visualStyle === "minimal" ? "0.02em" : "0.08em", textTransform: visualStyle === "minimal" ? "none" : "uppercase", cursor: "default", fontFamily: "'Inter', sans-serif" }}>
//                         {ctaText || "Shop Now"}
//                       </button>
//                     )}

//                     {showDismissFootnote && dismissFootnoteText.trim() && (
//                       <div style={{ fontSize: 9, textAlign: "center", color: subheadlineColor, opacity: 0.5, letterSpacing: "0.04em" }}>{dismissFootnoteText}</div>
//                     )}
//                   </div>
//                   <button type="button" aria-label="Close preview" style={previewCloseBtnStyle}>×</button>
//                 </div>
//               </div>
//             </div>

//             <s-grid gridTemplateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap="small-100" paddingBlockStart="base">
//               {[
//                 { label: "Show delay", value: `${(showDelayMs / 1000).toFixed(1)}s`, color: "#2e7ec8" },
//                 { label: "Countdown", value: countdownEndAt ? "Active" : "Off", color: countdownEndAt ? "#2d8a4e" : "#aab4c8" },
//                 { label: "Coupon", value: couponCode || "-", color: couponCode ? "#b8860b" : "#aab4c8" },
//                 { label: "Layout", value: (LAYOUT_LABELS[layoutMode] || layoutMode).split(" -")[0], color: "#445566" },
//                 { label: "Style", value: visualStyle, color: "#6366f1" },
//               ].map(({ label, value, color }) => (
//                 <s-box key={label} padding="base" borderRadius="base" borderWidth="base" background="base">
//                   <s-stack direction="block" gap="small-200" alignItems="center">
//                     <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
//                     <s-text tone="subdued">{label}</s-text>
//                   </s-stack>
//                 </s-box>
//               ))}
//             </s-grid>

//             {popupDesignId ? (
//               <s-box padding="base" borderRadius="base" borderWidth="base" background="subdued">
//                 <s-stack direction="inline" distribution="space-between" alignItems="center">
//                   <s-text tone="subdued">Design ID</s-text>
//                   <s-text tone="info">
//                     <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>{popupDesignId}</span>
//                   </s-text>
//                 </s-stack>
//               </s-box>
//             ) : null}
//           </div>
//               </s-grid>
//             </div>
//           </div>
//         ) : null}

//         {deleteConfirm ? (
//           <div
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="popup-delete-confirm-title"
//             style={{
//               position: "fixed",
//               inset: 0,
//               zIndex: 260,
//               background: "rgba(15,23,42,0.52)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               padding: 24,
//               pointerEvents: deleteConfirmExiting ? "none" : "auto",
//               opacity: deleteConfirmExiting ? 0 : 1,
//               transition: deleteConfirmExiting ? "opacity 0.2s ease" : "none",
//               animation: deleteConfirmExiting ? "none" : "sceDelOverlayIn 0.22s ease forwards",
//             }}
//             onClick={(e) => {
//               if (e.target === e.currentTarget && !deleteConfirmExiting) requestDeleteConfirmClose();
//             }}
//           >
//             <div
//               style={{
//                 width: "100%",
//                 maxWidth: 400,
//                 background: "#fff",
//                 borderRadius: 16,
//                 padding: "26px 28px 24px",
//                 boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
//                 opacity: deleteConfirmExiting ? 0 : 1,
//                 transform: deleteConfirmExiting ? "scale(0.96) translateY(8px)" : "scale(1) translateY(0)",
//                 transition: deleteConfirmExiting ? "opacity 0.2s ease, transform 0.2s ease" : "none",
//                 animation: deleteConfirmExiting ? "none" : "sceDelPanelIn 0.24s ease 0.04s both",
//               }}
//               onClick={(e) => e.stopPropagation()}
//             >
//               <h2
//                 id="popup-delete-confirm-title"
//                 style={{
//                   margin: "0 0 24px",
//                   fontSize: 18,
//                   fontWeight: 700,
//                   lineHeight: 1.3,
//                   color: "#0f172a",
//                   fontFamily: "inherit",
//                 }}
//               >
//                 Are you sure you want to delete this item?
//               </h2>
//               <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
//                 <s-button
//                   type="button"
//                   variant="secondary"
//                   disabled={deleteConfirmExiting}
//                   onClick={requestDeleteConfirmClose}
//                 >
//                   Cancel
//                 </s-button>
//                 <s-button
//                   type="button"
//                   variant="primary"
//                   tone="critical"
//                   icon="delete"
//                   disabled={deleteConfirmExiting || fetcher.state !== "idle"}
//                   loading={fetcher.state !== "idle"}
//                   onClick={() => {
//                     if (!deleteConfirm?.id || deleteConfirmExiting) return;
//                     const fd = new FormData();
//                     fd.set("intent", "delete");
//                     fd.set("rowId", deleteConfirm.id);
//                     fetcher.submit(fd, { method: "post" });
//                     requestDeleteConfirmClose();
//                   }}
//                 >
//                   Delete
//                 </s-button>
//               </div>
//             </div>
//           </div>
//         ) : null}
//       </s-page>
//     </>
//   );
// }




















import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, useActionData, useFetcher, useLoaderData, useRevalidator, useSearchParams } from "react-router";
import {
  defaultPopupDesignConfig,
  generatePopupDesignId,
  parsePopupDesignConfig,
  parsePopupContentAlign,
  parsePopupCountdownStyle,
  parsePopupCouponVariant,
  parsePopupCloseButtonPosition,
  parsePopupModalBackgroundImageFit,
  parsePopupLayoutMode,
  parsePopupVisualStyle,
  resolvePopupDesignId,
} from "../lib/popup-design-config.js";
import {
  POPUP_READY_TEMPLATES,
  getEditorKeysForTemplateId,
  getPopupTemplateMeta,
} from "../lib/popup-design-templates.js";
import { authenticate } from "../shopify.server";
import {
  loadShopBillingContext,
  rejectIfPopupLimitReached,
} from "../lib/app-billing.server.js";
import { getPlanLimits } from "../lib/app-plans.shared.js";
import prisma from "../db.server";
import { buildPopupTemplate } from "../lib/popup-design-template.js";

const POPUP_BAR_TYPE = "popup_design";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');`;

const PRESETS = [
  { key: "bloom", name: "Bloom", dot: "#e8a0b0", leftPanelBg: "#fde8ef", rightPanelBg: "#fff5f8", accentGold: "#d4607a", headlineColor: "#3a1520", subheadlineColor: "#b04060", buttonBg: "#d4607a", buttonText: "#fff5f8", overlayBg: "rgba(253,232,239,0.88)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
  { key: "sage", name: "Sage", dot: "#7baa7b", leftPanelBg: "#eaf4ea", rightPanelBg: "#f6faf6", accentGold: "#4a8c5c", headlineColor: "#1a3020", subheadlineColor: "#3a7050", buttonBg: "#4a8c5c", buttonText: "#f6faf6", overlayBg: "rgba(234,244,234,0.88)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
  { key: "sand", name: "Sand", dot: "#c9a96e", leftPanelBg: "#faf3e8", rightPanelBg: "#fffbf4", accentGold: "#b8860b", headlineColor: "#2c1e08", subheadlineColor: "#9a6e20", buttonBg: "#2c1e08", buttonText: "#fffbf4", overlayBg: "rgba(250,243,232,0.9)", visualStyle: "editorial", modalBorderRadius: 16, titleBadgeText: "NEW - JUST IN" },
  { key: "sky", name: "Sky", dot: "#6aaee8", leftPanelBg: "#e8f3fd", rightPanelBg: "#f4f9ff", accentGold: "#2e7ec8", headlineColor: "#0c2240", subheadlineColor: "#2860a8", buttonBg: "#2e7ec8", buttonText: "#f4f9ff", overlayBg: "rgba(232,243,253,0.9)", visualStyle: "classic", modalBorderRadius: 12, titleBadgeText: "✦ LIMITED OFFER" },
  { key: "slate", name: "Slate", dot: "#8898aa", leftPanelBg: "#eef0f4", rightPanelBg: "#f8f9fb", accentGold: "#445566", headlineColor: "#1a222c", subheadlineColor: "#445566", buttonBg: "#1a222c", buttonText: "#f8f9fb", overlayBg: "rgba(238,240,244,0.9)", visualStyle: "minimal", modalBorderRadius: 20, titleBadgeText: "SAVE TODAY" },
  { key: "frost", name: "Frost", dot: "#93c5fd", leftPanelBg: "#bfdbfe", rightPanelBg: "#eff6ff", accentGold: "#2563eb", headlineColor: "#0f172a", subheadlineColor: "#475569", buttonBg: "#1d4ed8", buttonText: "#f8fafc", overlayBg: "rgba(15,23,42,0.35)", visualStyle: "glass", modalBorderRadius: 24, titleBadgeText: "WELCOME OFFER" },
  { key: "noir", name: "Noir", dot: "#a78bfa", leftPanelBg: "#111827", rightPanelBg: "#1e293b", accentGold: "#a78bfa", headlineColor: "#f8fafc", subheadlineColor: "#94a3b8", buttonBg: "#f8fafc", buttonText: "#0f172a", overlayBg: "rgba(2,6,23,0.72)", visualStyle: "minimal", modalBorderRadius: 20, titleBadgeText: "MEMBER DROP" },
  { key: "linen", name: "Linen", dot: "#d6d3d1", leftPanelBg: "#e7e5e4", rightPanelBg: "#fafaf9", accentGold: "#57534e", headlineColor: "#1c1917", subheadlineColor: "#78716c", buttonBg: "#292524", buttonText: "#fafaf9", overlayBg: "rgba(28,25,23,0.25)", visualStyle: "editorial", modalBorderRadius: 18, titleBadgeText: "CURATED FOR YOU" },
];

const LAYOUT_LABELS = {
  split_image_left: "Split - image left",
  split_image_right: "Split - image right",
  stacked: "Stacked - image on top",
  content_only: "Content only",
};

const VISUAL_STYLE_LABELS = {
  classic: "Classic - serif headline, balanced",
  glass: "Glass - frosted content panel (on-trend)",
  minimal: "Minimal - bold sans, pill button",
  editorial: "Editorial - large type, softer label",
};

const CLOSE_BUTTON_LABELS = {
  top_left: "Top left",
  top_right: "Top right",
  bottom_left: "Bottom left",
  bottom_right: "Bottom right",
};

const MODAL_BG_FIT_LABELS = {
  cover: "Cover (fill card)",
  contain: "Contain (full image visible)",
};

const EDITOR_TABS = [
  { id: "design",    label: "Design",    icon: "layout-popup" },
  { id: "content",   label: "Content",   icon: "note" },
  { id: "timing",    label: "Timing",    icon: "clock" },
  { id: "targeting", label: "Targeting", icon: "location" },
  { id: "colors",    label: "Colors",    icon: "color" },
];

function popupLimitReachedMessage(maxPopups) {
  if (maxPopups == null) return "";
  return `Your Free plan allows up to ${maxPopups} popup design${maxPopups === 1 ? "" : "s"}. Upgrade to Premium for unlimited popups.`;
}

function getStorefrontTargetingExplainer(pageTarget, customPathContains) {
  const c = String(customPathContains || "").trim();
  const bullets = [];
  let needsSiteWideEmbed = false;
  switch (pageTarget) {
    case "all":
      bullets.push("Opens on any page, as long as the theme loads the popup script (section block and/or site-wide app embed).");
      bullets.push("Example paths: /, /products/…, /collections/…, /cart");
      break;
    case "home":
      bullets.push("Opens only on the homepage path: /, or a single market prefix like /en or /en-us, or /pages/home.");
      bullets.push("Does not open on /products/… or other inner pages.");
      break;
    case "product":
      needsSiteWideEmbed = true;
      bullets.push("Opens when the URL path includes a product segment (standard Shopify).");
      bullets.push("Example: /products/gift-card or /en/products/gift-card");
      break;
    case "collection":
      needsSiteWideEmbed = true;
      bullets.push("Opens when the path includes a collection segment, e.g. /collections/summer-sale.");
      break;
    case "cart":
      needsSiteWideEmbed = true;
      bullets.push("Opens on the cart page path, e.g. /cart or /en/cart.");
      break;
    case "custom":
      needsSiteWideEmbed = true;
      bullets.push(
        c
          ? `Opens only when the path contains "${c}" (case-insensitive).`
          : "Set \"URL must contain\" below - otherwise this mode will not open the popup."
      );      break;
    default:
      bullets.push("Opens according to the selected page targeting.");
  }
  return { bullets, needsSiteWideEmbed };
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromDatetimeLocalValue(local) {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing);
  const shop = session.shop;
  const rows = await prisma.popupDesign.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, popupDesignId: true, configJson: true, templateJson: true, updatedAt: true },
  });
  const popups = rows.map((row) => {
    const raw = parsePopupDesignConfig(row.configJson);
    const config = { ...raw, popupDesignId: row.popupDesignId || resolvePopupDesignId(raw, row.id) };
    return { id: row.id, name: row.name, savedAt: row.updatedAt.toISOString(), config, templateJson: row.templateJson ?? "{}" };
  });
  return { popups, billingPlan };
};

function buildConfigPayload(form) {
  return parsePopupDesignConfig(JSON.stringify({
    popupDesignId: String(form.get("popupDesignId") || "").trim(),
    designTemplateId: String(form.get("designTemplateId") || "").trim(),
    headline: String(form.get("headline") || ""),
    subheadline: String(form.get("subheadline") || ""),
    couponCode: String(form.get("couponCode") || ""),
    ctaText: String(form.get("ctaText") || ""),
    ctaHref: String(form.get("ctaHref") || ""),
    countdownEndAt: String(form.get("countdownEndAt") || "").trim(),
    showDelayMs: Number(form.get("showDelayMs") || 1200),
    displayTrigger: String(form.get("displayTrigger") || "delay"),
    showMode: String(form.get("showMode") || "repeat"),
    repeatFrequencyMinutes: Number(form.get("repeatFrequencyMinutes") || 60),
    maxImpressions: Number(form.get("maxImpressions") || 0),
    pageTarget: String(form.get("pageTarget") || "all"),
    customPathContains: String(form.get("customPathContains") || ""),
    leftImageUrl: String(form.get("leftImageUrl") || ""),
    leftImageAlt: String(form.get("leftImageAlt") || ""),
    copyCouponButtonText: String(form.get("copyCouponButtonText") || ""),
    copyCouponSuccessText: String(form.get("copyCouponSuccessText") || ""),
    showDismissFootnote: String(form.get("showDismissFootnote") || "") === "1",
    dismissFootnoteText: String(form.get("dismissFootnoteText") || ""),
    layoutMode: String(form.get("layoutMode") || ""),
    dimOverlay: String(form.get("dimOverlay") || "") === "1",
    showTitle: String(form.get("showTitle") || "") === "1",
    titleBadgeText: String(form.get("titleBadgeText") || ""),
    visualStyle: String(form.get("visualStyle") || ""),
    showHeadline: String(form.get("showHeadline") || "") === "1",
    showSubheadline: String(form.get("showSubheadline") || "") === "1",
    showContent: String(form.get("showContent") || "") === "1",
    showTiming: String(form.get("showTiming") || "") === "1",
    modalTransparentShell: String(form.get("modalTransparentShell") || "") === "1",
    modalBorderRadius: Number(form.get("modalBorderRadius") || 12),
    modalMaxWidthPx: Number(form.get("modalMaxWidthPx") || 0),
    leftPanelBg: String(form.get("leftPanelBg") || ""),
    rightPanelBg: String(form.get("rightPanelBg") || ""),
    accentGold: String(form.get("accentGold") || ""),
    headlineColor: String(form.get("headlineColor") || ""),
    subheadlineColor: String(form.get("subheadlineColor") || ""),
    buttonBg: String(form.get("buttonBg") || ""),
    buttonText: String(form.get("buttonText") || ""),
    overlayBg: String(form.get("overlayBg") || ""),
    bodyText: String(form.get("bodyText") || ""),
    contentAlign: String(form.get("contentAlign") || ""),
    countdownStyle: String(form.get("countdownStyle") || ""),
    couponVariant: String(form.get("couponVariant") || ""),
    emailCaptureEnabled: String(form.get("emailCaptureEnabled") || "") === "1",
    emailPlaceholder: String(form.get("emailPlaceholder") || ""),
    subscriberSignupEnabled: String(form.get("subscriberSignupEnabled") || "") === "1",
    shopifyCustomerCreateEnabled: String(form.get("shopifyCustomerCreateEnabled") || "") === "1",
    customerCreateMarketingOptIn: String(form.get("customerCreateMarketingOptIn") || "") === "1",
    customerCreateSuccessMessage: String(form.get("customerCreateSuccessMessage") || ""),
    customerCreateSuccessImageUrl: String(form.get("customerCreateSuccessImageUrl") || ""),
    customerCreateStayInPopup: String(form.get("customerCreateStayInPopup") || "") === "1",
    modalBackgroundImageUrl: String(form.get("modalBackgroundImageUrl") || ""),
    modalBackgroundImageAlt: String(form.get("modalBackgroundImageAlt") || ""),
    modalBackgroundImageFit: String(form.get("modalBackgroundImageFit") || ""),
    closeButtonPosition: String(form.get("closeButtonPosition") || ""),
  }));
}

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing);
  const shop = session.shop;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const limitErr = await rejectIfPopupLimitReached(shop, billingPlan.planId);
    if (limitErr) return limitErr;
    const name = String(form.get("popupName") || "Untitled popup").trim() || "Untitled popup";
    const cfg = defaultPopupDesignConfig();
    cfg.popupDesignId = String(cfg.popupDesignId || "").trim() || generatePopupDesignId();
    const configJson = JSON.stringify(cfg);
    const templatePayload = buildPopupTemplate({ name, popupDesignId: cfg.popupDesignId, configJson, templateJson: "{}" });
    const row = await prisma.popupDesign.create({
      data: { shop, name, popupDesignId: cfg.popupDesignId, configJson, templateJson: JSON.stringify(templatePayload), active: false },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, intent: "create", rowId: row.id, savedAt: row.updatedAt.toISOString() };
  }

  if (intent === "create_with_config") {
    const limitErr = await rejectIfPopupLimitReached(shop, billingPlan.planId);
    if (limitErr) return limitErr;
    const name = String(form.get("popupName") || "Untitled popup").trim() || "Untitled popup";
    const rawJson = String(form.get("configJson") || "{}");
    let cfg;
    try { cfg = parsePopupDesignConfig(rawJson); } catch { return { ok: false, error: "Invalid popup configuration." }; }
    cfg.popupDesignId = String(cfg.popupDesignId || "").trim() || generatePopupDesignId();
    const configJson = JSON.stringify(cfg);
    const templatePayload = buildPopupTemplate({ name, popupDesignId: cfg.popupDesignId, configJson, templateJson: "{}" });
    const row = await prisma.popupDesign.create({
      data: { shop, name, popupDesignId: cfg.popupDesignId, configJson, templateJson: JSON.stringify(templatePayload), active: false },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, intent: "create_with_config", rowId: row.id, savedAt: row.updatedAt.toISOString() };
  }

  if (intent === "delete") {
    const rowId = String(form.get("rowId") || "").trim();
    const existing = await prisma.popupDesign.findFirst({ where: { id: rowId, shop }, select: { id: true } });
    if (!existing) return { ok: false, error: "Popup not found." };
    await prisma.popupDesign.delete({ where: { id: existing.id } });
    return { ok: true, intent: "delete", deletedId: rowId };
  }

  if (intent === "duplicate") {
    const limitErr = await rejectIfPopupLimitReached(shop, billingPlan.planId);
    if (limitErr) return limitErr;
    const rowId = String(form.get("rowId") || "").trim();
    const src = await prisma.popupDesign.findFirst({ where: { id: rowId, shop } });
    if (!src) return { ok: false, error: "Popup not found." };
    const parsed = parsePopupDesignConfig(src.configJson);
    const next = { ...parsed, popupDesignId: generatePopupDesignId() };
    const config = parsePopupDesignConfig(JSON.stringify(next));
    const name = `${src.name} (copy)`.slice(0, 120);
    const configJson = JSON.stringify(config);
    const templatePayload = buildPopupTemplate({ name, popupDesignId: next.popupDesignId, configJson, templateJson: src.templateJson ?? "{}" });
    const row = await prisma.popupDesign.create({
      data: { shop, name, popupDesignId: next.popupDesignId, configJson, templateJson: JSON.stringify(templatePayload), active: false },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, intent: "duplicate", rowId: row.id, savedAt: row.updatedAt.toISOString() };
  }

  if (intent !== "save") return { ok: false, error: "Unknown action." };
  const rowId = String(form.get("rowId") || "").trim();
  if (!rowId) return { ok: false, error: "Select a popup to save." };
  const owned = await prisma.popupDesign.findFirst({ where: { id: rowId, shop }, select: { id: true, templateJson: true, popupDesignId: true } });
  if (!owned) return { ok: false, error: "Popup not found." };
  const config = buildConfigPayload(form);
  const popupName = String(form.get("popupName") || "").trim() || "Popup";
  const configJson = JSON.stringify(config);
  const designId = String(config.popupDesignId || owned.popupDesignId || "").trim() || generatePopupDesignId();
  const templatePayload = buildPopupTemplate({ name: popupName, popupDesignId: designId, configJson, templateJson: owned.templateJson ?? "{}" });
  const updated = await prisma.popupDesign.update({
    where: { id: owned.id },
    data: { name: popupName, popupDesignId: designId, configJson, templateJson: JSON.stringify(templatePayload), active: false },
    select: { id: true, updatedAt: true },
  });
  return { ok: true, intent: "save", rowId: updated.id, savedAt: updated.updatedAt.toISOString() };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function CountdownPreview({ endAtIso, accent, bg, compact }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const parts = useMemo(() => {
    if (!endAtIso) return { d: "00", h: "00", m: "00", s: "00" };
    const end = new Date(endAtIso).getTime();
    if (Number.isNaN(end)) return { d: "00", h: "00", m: "00", s: "00" };
    let sec = Math.max(0, Math.floor((end - now) / 1000));
    const d = Math.floor(sec / 86400); sec -= d * 86400;
    const h = Math.floor(sec / 3600); sec -= h * 3600;
    const m = Math.floor(sec / 60); sec -= m * 60;
    const pad = (n) => String(n).padStart(2, "0");
    return { d: pad(d), h: pad(h), m: pad(m), s: pad(sec) };
  }, [endAtIso, now]);
  const unit = (val, lbl) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: bg || "rgba(0,0,0,0.06)", borderRadius: 6, padding: "5px 8px", fontWeight: 700, fontSize: 14, color: accent, minWidth: 34, border: `1px solid ${accent}22`, fontFamily: "monospace" }}>{val}</div>
      <div style={{ fontSize: 8, color: accent, opacity: 0.6, marginTop: 2, letterSpacing: "0.08em", fontWeight: 600 }}>{lbl}</div>
    </div>
  );
  const sep = <div style={{ color: accent, fontWeight: 700, fontSize: 13, paddingBottom: 10 }}>:</div>;
  const sepTight = <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>:</div>;
  const boxOnly = (val) => <div style={{ background: bg || "rgba(0,0,0,0.06)", borderRadius: 8, padding: "6px 8px", fontWeight: 700, fontSize: 14, color: accent, minWidth: 32, border: `1px solid ${accent}22`, fontFamily: "monospace" }}>{val}</div>;
  if (compact) {
    return <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{boxOnly(parts.d)}{sepTight}{boxOnly(parts.h)}{sepTight}{boxOnly(parts.m)}{sepTight}{boxOnly(parts.s)}</div>;
  }
  return <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{unit(parts.d, "DAYS")}{sep}{unit(parts.h, "HRS")}{sep}{unit(parts.m, "MINS")}{sep}{unit(parts.s, "SECS")}</div>;
}

function clamp255(n) { const x = Math.round(Number(n)); if (Number.isNaN(x)) return 0; return Math.min(255, Math.max(0, x)); }
function expandHex(raw) {
  let s = String(raw || "").trim();
  if (!s.startsWith("#")) s = `#${s}`;
  s = s.slice(1);
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length !== 6 || !/^[0-9a-fA-F]+$/.test(s)) return null;
  return `#${s.toLowerCase()}`;
}
function hexToRgb(hex) { const e = expandHex(hex); if (!e) return null; const n = parseInt(e.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
function rgbToHex(r, g, b) { return `#${[r, g, b].map((x) => clamp255(x).toString(16).padStart(2, "0")).join("")}`; }
function formatCssAlpha(a) { const n = Math.min(1, Math.max(0, Number(a))); if (Number.isNaN(n)) return "1"; const t = n.toFixed(4).replace(/\.?0+$/, ""); return t === "" ? "0" : t; }
function parseCssColorForPicker(raw) {
  const v = String(raw || "").trim();
  const hexDirect = v.startsWith("#") ? expandHex(v) : /^[0-9a-fA-F]{3,8}$/.test(v) ? expandHex(`#${v}`) : null;
  if (hexDirect) return { outputKind: "hex", pickerHex: hexDirect, rgbAlpha: null };
  const rgba = v.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgba) { const r = clamp255(rgba[1]); const g = clamp255(rgba[2]); const b = clamp255(rgba[3]); const a = Math.min(1, Math.max(0, Number(rgba[4]))); return { outputKind: "rgba", pickerHex: rgbToHex(r, g, b), rgbAlpha: Number.isNaN(a) ? 1 : a }; }
  const rgb = v.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgb) { const r = clamp255(rgb[1]); const g = clamp255(rgb[2]); const b = clamp255(rgb[3]); return { outputKind: "rgb", pickerHex: rgbToHex(r, g, b), rgbAlpha: null }; }
  return { outputKind: "hex", pickerHex: "#ffffff", rgbAlpha: null };
}
function colorStringFromPicker(parsed, newHex) {
  const norm = expandHex(newHex);
  if (!norm) return null;
  const rgb = hexToRgb(norm);
  if (!rgb) return null;
  if (parsed.outputKind === "rgba" && parsed.rgbAlpha != null) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatCssAlpha(parsed.rgbAlpha)})`;
  if (parsed.outputKind === "rgb") return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  return norm;
}

function ColorRow({ label, value, onChange }) {
  const parsed = useMemo(() => parseCssColorForPicker(value), [value]);
  const handlePicker = (e) => { const next = colorStringFromPicker(parsed, String(e.target?.value ?? "")); if (next != null) onChange(next); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#fafbfd", borderRadius: 10, border: "1px solid #eef0f4" }}>
      <div style={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: parsed.pickerHex, border: "1px solid rgba(0,0,0,0.12)", boxSizing: "border-box" }} aria-hidden />
        <input type="color" value={parsed.pickerHex} onChange={handlePicker} aria-label={`${label} color picker`} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          autoComplete="off"
          aria-label={`${label} color value`}
          placeholder="#000000 or rgba(0,0,0,0.5)"
          style={{ width: "100%", border: "1px solid #dde1e7", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#1a2233", background: "#fff", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, min, max }) {
  const relay = (e) => { const v = e.target?.value ?? ""; onChange({ currentTarget: { value: v } }); };
  if (type === "number") return <s-number-field label={label} value={String(value)} onChange={relay} placeholder={placeholder || ""} min={min} max={max} autocomplete="off" />;
  if (type === "datetime-local") {
    return (
      <s-stack direction="block" gap="small-100">
        <s-text type="strong">{label}</s-text>
        <input type="datetime-local" value={value == null ? "" : String(value)} onChange={relay} min={min != null ? String(min) : undefined} max={max != null ? String(max) : undefined} step={60} autoComplete="off" aria-label={label}
          style={{ width: "100%", boxSizing: "border-box", minHeight: 36, padding: "8px 12px", borderRadius: 8, border: "1px solid #c9cccf", fontSize: 13, fontFamily: "inherit", color: "#202223", background: "#fff" }} />
      </s-stack>
    );
  }
  return <s-text-field label={label} type={type} value={value} onChange={relay} placeholder={placeholder || ""} min={min} max={max} autocomplete="off" />;
}

/** Styled section header used inside each tab panel */
function TabSection({ title, description, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: description ? 4 : 12, paddingBottom: 8, borderBottom: "1px solid #eef0f4" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2233" }}>{title}</div>
        {description && <div style={{ fontSize: 11, color: "#8896a8", marginTop: 2, lineHeight: 1.45 }}>{description}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function hydrateFromConfig(c) {
  const cfg = c || defaultPopupDesignConfig();
  return {
    designTemplateId: String(cfg.designTemplateId ?? "").trim(),
    popupDesignId: cfg.popupDesignId || "",
    headline: cfg.headline,
    subheadline: cfg.subheadline,
    couponCode: cfg.couponCode,
    ctaText: cfg.ctaText,
    ctaHref: cfg.ctaHref,
    countdownEndAt: cfg.countdownEndAt,
    countdownLocal: toDatetimeLocalValue(cfg.countdownEndAt),
    showDelayMs: cfg.showDelayMs,
    displayTrigger: cfg.displayTrigger || "delay",
    showMode: cfg.showMode || "repeat",
    repeatFrequencyMinutes: cfg.repeatFrequencyMinutes ?? 60,
    maxImpressions: cfg.maxImpressions ?? 0,
    pageTarget: cfg.pageTarget || "all",
    customPathContains: cfg.customPathContains || "",
    leftPanelBg: cfg.leftPanelBg,
    rightPanelBg: cfg.rightPanelBg,
    accentGold: cfg.accentGold,
    headlineColor: cfg.headlineColor,
    subheadlineColor: cfg.subheadlineColor,
    buttonBg: cfg.buttonBg,
    buttonText: cfg.buttonText,
    overlayBg: cfg.overlayBg,
    leftImageUrl: cfg.leftImageUrl || "",
    leftImageAlt: cfg.leftImageAlt || "",
    copyCouponButtonText: cfg.copyCouponButtonText,
    copyCouponSuccessText: cfg.copyCouponSuccessText,
    showDismissFootnote: cfg.showDismissFootnote !== false,
    dismissFootnoteText: cfg.dismissFootnoteText || "No thanks, I'll pay full price",
    layoutMode: parsePopupLayoutMode(cfg.layoutMode),
    dimOverlay: cfg.dimOverlay !== false,
    showTitle: cfg.showTitle !== false,
    titleBadgeText: cfg.titleBadgeText || "✦ LIMITED OFFER",
    visualStyle: parsePopupVisualStyle(cfg.visualStyle),
    showHeadline: cfg.showHeadline !== false,
    showSubheadline: cfg.showSubheadline !== false,
    showContent: cfg.showContent !== false,
    showTiming: cfg.showTiming !== false,
    modalTransparentShell: cfg.modalTransparentShell === true,
    modalBorderRadius: cfg.modalBorderRadius ?? 12,
    modalMaxWidthPx: cfg.modalMaxWidthPx ?? 0,
    bodyText: cfg.bodyText || "",
    contentAlign: parsePopupContentAlign(cfg.contentAlign),
    countdownStyle: parsePopupCountdownStyle(cfg.countdownStyle),
    couponVariant: parsePopupCouponVariant(cfg.couponVariant),
    emailCaptureEnabled: cfg.emailCaptureEnabled === true,
    emailPlaceholder: cfg.emailPlaceholder || "Enter your email",
    subscriberSignupEnabled: cfg.subscriberSignupEnabled === true,
    shopifyCustomerCreateEnabled: cfg.shopifyCustomerCreateEnabled === true,
    customerCreateMarketingOptIn: cfg.customerCreateMarketingOptIn !== false,
    customerCreateSuccessMessage: cfg.customerCreateSuccessMessage || "You are subscribed. Thank you!",
    customerCreateSuccessImageUrl: cfg.customerCreateSuccessImageUrl || "",
    customerCreateStayInPopup: cfg.customerCreateStayInPopup !== false,
    modalBackgroundImageUrl: cfg.modalBackgroundImageUrl || "",
    modalBackgroundImageAlt: cfg.modalBackgroundImageAlt || "",
    modalBackgroundImageFit: parsePopupModalBackgroundImageFit(cfg.modalBackgroundImageFit),
    closeButtonPosition: parsePopupCloseButtonPosition(cfg.closeButtonPosition),
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PopupDesignPage() {
  const { popups, billingPlan } = useLoaderData();
  const actionData = useActionData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetchHandledKey = useRef("");

  const urlPopupId = String(searchParams.get("popup") || "").trim();
  const initialSelected = urlPopupId && popups.some((p) => p.id === urlPopupId) ? urlPopupId : null;
  const [selectedPopupId, setSelectedPopupId] = useState(initialSelected);
  const selectedPopup = useMemo(() => popups.find((p) => p.id === selectedPopupId) ?? null, [popups, selectedPopupId]);

  // ── Editor state ────────────────────────────────────────────────────────────
  const [popupName, setPopupName] = useState(() => selectedPopup?.name || "Untitled popup");
  const h0 = hydrateFromConfig(selectedPopup?.config);
  const [designTemplateId, setDesignTemplateId] = useState(h0.designTemplateId);
  const [popupDesignId, setPopupDesignId] = useState(h0.popupDesignId);
  const [headline, setHeadline] = useState(h0.headline);
  const [subheadline, setSubheadline] = useState(h0.subheadline);
  const [couponCode, setCouponCode] = useState(h0.couponCode);
  const [ctaText, setCtaText] = useState(h0.ctaText);
  const [ctaHref, setCtaHref] = useState(h0.ctaHref);
  const [countdownEndAt, setCountdownEndAt] = useState(h0.countdownEndAt);
  const [countdownLocal, setCountdownLocal] = useState(h0.countdownLocal);
  const [showDelayMs, setShowDelayMs] = useState(h0.showDelayMs);
  const [displayTrigger, setDisplayTrigger] = useState(h0.displayTrigger);
  const [showMode, setShowMode] = useState(h0.showMode);
  const [repeatFrequencyMinutes, setRepeatFrequencyMinutes] = useState(h0.repeatFrequencyMinutes);
  const [maxImpressions, setMaxImpressions] = useState(h0.maxImpressions);
  const [pageTarget, setPageTarget] = useState(h0.pageTarget);
  const [customPathContains, setCustomPathContains] = useState(h0.customPathContains);
  const [leftPanelBg, setLeftPanelBg] = useState(h0.leftPanelBg);
  const [rightPanelBg, setRightPanelBg] = useState(h0.rightPanelBg);
  const [accentGold, setAccentGold] = useState(h0.accentGold);
  const [headlineColor, setHeadlineColor] = useState(h0.headlineColor);
  const [subheadlineColor, setSubheadlineColor] = useState(h0.subheadlineColor);
  const [buttonBg, setButtonBg] = useState(h0.buttonBg);
  const [buttonText, setButtonText] = useState(h0.buttonText);
  const [overlayBg, setOverlayBg] = useState(h0.overlayBg);
  const [leftImageUrl, setLeftImageUrl] = useState(h0.leftImageUrl);
  const [leftImageAlt, setLeftImageAlt] = useState(h0.leftImageAlt);
  const [copyCouponButtonText, setCopyCouponButtonText] = useState(h0.copyCouponButtonText);
  const [copyCouponSuccessText, setCopyCouponSuccessText] = useState(h0.copyCouponSuccessText);
  const [showDismissFootnote, setShowDismissFootnote] = useState(h0.showDismissFootnote);
  const [dismissFootnoteText, setDismissFootnoteText] = useState(h0.dismissFootnoteText);
  const [layoutMode, setLayoutMode] = useState(h0.layoutMode);
  const [dimOverlay, setDimOverlay] = useState(h0.dimOverlay);
  const [showTitle, setShowTitle] = useState(h0.showTitle);
  const [titleBadgeText, setTitleBadgeText] = useState(h0.titleBadgeText);
  const [visualStyle, setVisualStyle] = useState(h0.visualStyle);
  const [showHeadline, setShowHeadline] = useState(h0.showHeadline);
  const [showSubheadline, setShowSubheadline] = useState(h0.showSubheadline);
  const [showContent, setShowContent] = useState(h0.showContent);
  const [showTiming, setShowTiming] = useState(h0.showTiming);
  const [modalTransparentShell, setModalTransparentShell] = useState(h0.modalTransparentShell);
  const [modalBorderRadius, setModalBorderRadius] = useState(h0.modalBorderRadius);
  const [modalMaxWidthPx, setModalMaxWidthPx] = useState(h0.modalMaxWidthPx);
  const [bodyText, setBodyText] = useState(h0.bodyText);
  const [contentAlign, setContentAlign] = useState(h0.contentAlign);
  const [countdownStyle, setCountdownStyle] = useState(h0.countdownStyle);
  const [couponVariant, setCouponVariant] = useState(h0.couponVariant);
  const [emailCaptureEnabled, setEmailCaptureEnabled] = useState(h0.emailCaptureEnabled);
  const [emailPlaceholder, setEmailPlaceholder] = useState(h0.emailPlaceholder);
  const [subscriberSignupEnabled, setSubscriberSignupEnabled] = useState(h0.subscriberSignupEnabled);
  const [shopifyCustomerCreateEnabled, setShopifyCustomerCreateEnabled] = useState(h0.shopifyCustomerCreateEnabled);
  const [customerCreateMarketingOptIn, setCustomerCreateMarketingOptIn] = useState(h0.customerCreateMarketingOptIn);
  const [customerCreateSuccessMessage, setCustomerCreateSuccessMessage] = useState(h0.customerCreateSuccessMessage);
  const [customerCreateSuccessImageUrl, setCustomerCreateSuccessImageUrl] = useState(h0.customerCreateSuccessImageUrl);
  const [customerCreateStayInPopup, setCustomerCreateStayInPopup] = useState(h0.customerCreateStayInPopup);
  const [modalBackgroundImageUrl, setModalBackgroundImageUrl] = useState(h0.modalBackgroundImageUrl);
  const [modalBackgroundImageAlt, setModalBackgroundImageAlt] = useState(h0.modalBackgroundImageAlt);
  const [modalBackgroundImageFit, setModalBackgroundImageFit] = useState(h0.modalBackgroundImageFit);
  const [closeButtonPosition, setCloseButtonPosition] = useState(h0.closeButtonPosition);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activePreset, setActivePreset] = useState(null);
  const [copied, setCopied] = useState(false);
  const [previewCouponCopied, setPreviewCouponCopied] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [configModal, setConfigModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmExiting, setDeleteConfirmExiting] = useState(false);
  const [editorTab, setEditorTab] = useState("design");
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);

  const totalPopupRecords = popups.length;
  const popupMax = billingPlan?.limits?.maxPopups ?? getPlanLimits(billingPlan?.planId).maxPopups;
  const atPopupLimit =
    popupMax != null && totalPopupRecords >= popupMax;
  const popupLimitMessage = popupLimitReachedMessage(popupMax);
  const totalTablePages = Math.max(1, Math.ceil(totalPopupRecords / tablePageSize));
  const currentTablePage = Math.min(tablePage, totalTablePages);
  const tableStart = (currentTablePage - 1) * tablePageSize;
  const paginatedPopups = useMemo(
    () => popups.slice(tableStart, tableStart + tablePageSize),
    [popups, tableStart, tablePageSize],
  );
  const tableEnd = Math.min(tableStart + paginatedPopups.length, totalPopupRecords);

  const targetingExplainer = useMemo(() => getStorefrontTargetingExplainer(pageTarget, customPathContains), [pageTarget, customPathContains]);
  const activeTemplateForKeys = configModal?.mode === "create" ? configModal.templateId : designTemplateId;
  const editorKeyList = useMemo(() => getEditorKeysForTemplateId(activeTemplateForKeys), [activeTemplateForKeys]);
  const showEditorKey = useCallback((...keys) => { if (!editorKeyList) return true; return keys.some((k) => editorKeyList.includes(k)); }, [editorKeyList]);

  useEffect(() => { if (selectedPopupId && !popups.some((p) => p.id === selectedPopupId)) { setSelectedPopupId(null); setSearchParams({}); } }, [popups, selectedPopupId, setSearchParams]);
  useEffect(() => {
    if (tablePage > totalTablePages) setTablePage(totalTablePages);
  }, [tablePage, totalTablePages]);

  const hydrateVersion = useRef("");

  useEffect(() => {
    if (!atPopupLimit) return;
    setTemplateModalOpen(false);
    if (configModal?.mode === "create") {
      hydrateVersion.current = "";
      setConfigModal(null);
    }
  }, [atPopupLimit, configModal?.mode]);
  const applyEditorRef = useRef((_h, _n) => {});
  applyEditorRef.current = (h, name) => {
    setPopupName(name); setDesignTemplateId(h.designTemplateId || ""); setPopupDesignId(h.popupDesignId);
    setHeadline(h.headline); setSubheadline(h.subheadline); setCouponCode(h.couponCode);
    setCtaText(h.ctaText); setCtaHref(h.ctaHref); setCountdownEndAt(h.countdownEndAt);
    setCountdownLocal(h.countdownLocal); setShowDelayMs(h.showDelayMs); setDisplayTrigger(h.displayTrigger);
    setShowMode(h.showMode); setRepeatFrequencyMinutes(h.repeatFrequencyMinutes); setMaxImpressions(h.maxImpressions);
    setPageTarget(h.pageTarget); setCustomPathContains(h.customPathContains); setLeftPanelBg(h.leftPanelBg);
    setRightPanelBg(h.rightPanelBg); setAccentGold(h.accentGold); setHeadlineColor(h.headlineColor);
    setSubheadlineColor(h.subheadlineColor); setButtonBg(h.buttonBg); setButtonText(h.buttonText);
    setOverlayBg(h.overlayBg); setLeftImageUrl(h.leftImageUrl); setLeftImageAlt(h.leftImageAlt);
    setCopyCouponButtonText(h.copyCouponButtonText); setCopyCouponSuccessText(h.copyCouponSuccessText);
    setShowDismissFootnote(h.showDismissFootnote); setDismissFootnoteText(h.dismissFootnoteText);
    setLayoutMode(h.layoutMode); setDimOverlay(h.dimOverlay); setShowTitle(h.showTitle);
    setTitleBadgeText(h.titleBadgeText); setVisualStyle(h.visualStyle); setShowHeadline(h.showHeadline);
    setShowSubheadline(h.showSubheadline); setShowContent(h.showContent); setShowTiming(h.showTiming);
    setModalTransparentShell(h.modalTransparentShell); setModalBorderRadius(h.modalBorderRadius);
    setModalMaxWidthPx(h.modalMaxWidthPx); setBodyText(h.bodyText); setContentAlign(h.contentAlign);
    setCountdownStyle(h.countdownStyle); setCouponVariant(h.couponVariant); setEmailCaptureEnabled(h.emailCaptureEnabled);
    setEmailPlaceholder(h.emailPlaceholder); setSubscriberSignupEnabled(h.subscriberSignupEnabled);
    setShopifyCustomerCreateEnabled(h.shopifyCustomerCreateEnabled); setCustomerCreateMarketingOptIn(h.customerCreateMarketingOptIn);
    setCustomerCreateSuccessMessage(h.customerCreateSuccessMessage); setCustomerCreateSuccessImageUrl(h.customerCreateSuccessImageUrl);
    setCustomerCreateStayInPopup(h.customerCreateStayInPopup); setModalBackgroundImageUrl(h.modalBackgroundImageUrl);
    setModalBackgroundImageAlt(h.modalBackgroundImageAlt); setModalBackgroundImageFit(h.modalBackgroundImageFit);
    setCloseButtonPosition(h.closeButtonPosition);
  };

  useEffect(() => {
    if (configModal?.mode === "create" && configModal.templateId) {
      const t = POPUP_READY_TEMPLATES.find((x) => x.id === configModal.templateId);
      if (!t) return;
      const v = `create:${configModal.templateId}`;
      if (hydrateVersion.current === v) return;
      hydrateVersion.current = v;
      const merged = parsePopupDesignConfig(JSON.stringify({ ...defaultPopupDesignConfig(), ...t.config, designTemplateId: t.id, popupDesignId: generatePopupDesignId() }));
      const shortName = (t.name.split("-")[0] || "Popup").trim();
      applyEditorRef.current(hydrateFromConfig(merged), `${shortName} popup`);
      setEditorTab("design");
      return;
    }
    if (!selectedPopupId) {
      const v = "__none__";
      if (hydrateVersion.current === v) return;
      hydrateVersion.current = v;
      applyEditorRef.current(hydrateFromConfig(defaultPopupDesignConfig()), "Untitled popup");
      return;
    }
    const p = popups.find((x) => x.id === selectedPopupId);
    if (!p) return;
    const v = `${p.id}:${p.savedAt}`;
    if (hydrateVersion.current === v) return;
    hydrateVersion.current = v;
    applyEditorRef.current(hydrateFromConfig(p.config), p.name || "Popup");
  }, [configModal, selectedPopupId, popups]);

  const applyReadyTemplate = useCallback((templateId) => {
    const t = POPUP_READY_TEMPLATES.find((x) => x.id === templateId);
    if (!t || !selectedPopupId) return;
    const merged = parsePopupDesignConfig(JSON.stringify({ ...defaultPopupDesignConfig(), ...t.config, designTemplateId: t.id, popupDesignId }));
    setActivePreset(null);
    applyEditorRef.current(hydrateFromConfig(merged), popupName);
  }, [selectedPopupId, popupDesignId, popupName]);

  const requestDeleteConfirmClose = useCallback(() => { setDeleteConfirmExiting(true); }, []);

  useEffect(() => {
    if (!deleteConfirmExiting) return;
    const t = globalThis.setTimeout(() => { setDeleteConfirm(null); setDeleteConfirmExiting(false); }, 220);
    return () => globalThis.clearTimeout(t);
  }, [deleteConfirmExiting]);

  useEffect(() => {
    if (!deleteConfirm || deleteConfirmExiting) return;
    const onKey = (e) => { if (e.key === "Escape") requestDeleteConfirmClose(); };
    globalThis.addEventListener?.("keydown", onKey);
    return () => globalThis.removeEventListener?.("keydown", onKey);
  }, [deleteConfirm, deleteConfirmExiting, requestDeleteConfirmClose]);

  useEffect(() => {
    const d = fetcher.data;
    if (fetcher.state !== "idle" || !d?.ok) return;
    const key = `${d.intent}-${d.rowId || ""}-${d.deletedId || ""}-${d.savedAt || ""}`;
    if (fetchHandledKey.current === key) return;
    fetchHandledKey.current = key;
    if (d.intent === "create" || d.intent === "duplicate" || d.intent === "create_with_config") {
      if (d.rowId) { setSelectedPopupId(d.rowId); setSearchParams({ popup: d.rowId }); }
    }
    if (d.intent === "create_with_config") { hydrateVersion.current = ""; setConfigModal(null); }
    if (d.intent === "delete" && d.deletedId) { hydrateVersion.current = ""; setConfigModal(null); if (selectedPopupId === d.deletedId) setSelectedPopupId(null); }
    revalidator.revalidate();
  }, [fetcher.state, fetcher.data, revalidator, setSearchParams, selectedPopupId]);

  const applyPreset = useCallback((p, i) => {
    setActivePreset(i); setLeftPanelBg(p.leftPanelBg); setRightPanelBg(p.rightPanelBg);
    setAccentGold(p.accentGold); setHeadlineColor(p.headlineColor); setSubheadlineColor(p.subheadlineColor);
    setButtonBg(p.buttonBg); setButtonText(p.buttonText); setOverlayBg(p.overlayBg);
    if (p.visualStyle != null) setVisualStyle(parsePopupVisualStyle(p.visualStyle));
    if (p.modalBorderRadius != null) setModalBorderRadius(Math.min(48, Math.max(0, Number(p.modalBorderRadius) || 12)));
    if (p.titleBadgeText != null) setTitleBadgeText(String(p.titleBadgeText));
  }, []);

  const syncCountdown = (local) => { setCountdownLocal(local); setCountdownEndAt(fromDatetimeLocalValue(local)); };
  const handleCopy = () => { navigator.clipboard?.writeText(popupDesignId); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  const serializeEditorToParsedConfig = useCallback(() => {
    return parsePopupDesignConfig(JSON.stringify({
      designTemplateId, popupDesignId, headline, subheadline, couponCode, ctaText, ctaHref,
      countdownEndAt, showDelayMs, displayTrigger, showMode, repeatFrequencyMinutes, maxImpressions,
      pageTarget, customPathContains, leftImageUrl, leftImageAlt, copyCouponButtonText,
      copyCouponSuccessText, showDismissFootnote, dismissFootnoteText, layoutMode, dimOverlay,
      showTitle, titleBadgeText, visualStyle, showHeadline, showSubheadline, showContent, showTiming,
      modalTransparentShell, modalBorderRadius, modalMaxWidthPx, leftPanelBg, rightPanelBg,
      accentGold, headlineColor, subheadlineColor, buttonBg, buttonText, overlayBg, bodyText,
      contentAlign, countdownStyle, couponVariant, emailCaptureEnabled, emailPlaceholder,
      subscriberSignupEnabled, shopifyCustomerCreateEnabled, customerCreateMarketingOptIn,
      customerCreateSuccessMessage, customerCreateSuccessImageUrl, customerCreateStayInPopup,
      modalBackgroundImageUrl, modalBackgroundImageAlt, modalBackgroundImageFit, closeButtonPosition,
    }));
  }, [
    designTemplateId, popupDesignId, headline, subheadline, couponCode, ctaText, ctaHref,
    countdownEndAt, showDelayMs, displayTrigger, showMode, repeatFrequencyMinutes, maxImpressions,
    pageTarget, customPathContains, leftImageUrl, leftImageAlt, copyCouponButtonText,
    copyCouponSuccessText, showDismissFootnote, dismissFootnoteText, layoutMode, dimOverlay,
    showTitle, titleBadgeText, visualStyle, showHeadline, showSubheadline, showContent, showTiming,
    modalTransparentShell, modalBorderRadius, modalMaxWidthPx, leftPanelBg, rightPanelBg,
    accentGold, headlineColor, subheadlineColor, buttonBg, buttonText, overlayBg, bodyText,
    contentAlign, countdownStyle, couponVariant, emailCaptureEnabled, emailPlaceholder,
    subscriberSignupEnabled, shopifyCustomerCreateEnabled, customerCreateMarketingOptIn,
    customerCreateSuccessMessage, customerCreateSuccessImageUrl, customerCreateStayInPopup,
    modalBackgroundImageUrl, modalBackgroundImageAlt, modalBackgroundImageFit, closeButtonPosition,
  ]);

  // ── Preview helpers ──────────────────────────────────────────────────────────
  const previewHeadlineFont = visualStyle === "minimal" ? "'DM Sans', 'Inter', sans-serif" : "'Cormorant Garamond', serif";
  const previewHeadlineSize = visualStyle === "editorial" ? 24 : visualStyle === "minimal" ? 20 : 22;
  const previewSubStyle = visualStyle === "editorial"
    ? { fontSize: 11, textTransform: "none", letterSpacing: "0.04em", fontWeight: 500 }
    : { fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
  const previewCtaRadius = visualStyle === "minimal" ? 999 : 8;

  const previewRightPanelStyle = useMemo(() => {
    let pt = 24, pr = 20, pb = 20, pl = 20;
    if (closeButtonPosition === "top_right") pr = 44;
    if (closeButtonPosition === "top_left") pl = 44;
    if (closeButtonPosition === "bottom_right") { pr = 44; pb = 48; }
    if (closeButtonPosition === "bottom_left") { pl = 44; pb = 48; }
    const base = { flex: 1, minWidth: 0, padding: `${pt}px ${pr}px ${pb}px ${pl}px`, display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1, ...(contentAlign === "center" ? { alignItems: "center", textAlign: "center" } : {}) };
    if (visualStyle !== "glass") return { ...base, background: rightPanelBg };
    const glassBg = { background: `linear-gradient(145deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 100%), ${rightPanelBg}`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" };
    if (layoutMode === "content_only") return { ...base, ...glassBg, border: "1px solid rgba(255,255,255,0.45)" };
    if (layoutMode === "stacked") return { ...base, ...glassBg, borderTop: "1px solid rgba(255,255,255,0.5)" };
    return { ...base, ...glassBg, borderLeft: layoutMode === "split_image_right" ? undefined : "1px solid rgba(255,255,255,0.55)", borderRight: layoutMode === "split_image_right" ? "1px solid rgba(255,255,255,0.55)" : undefined };
  }, [visualStyle, rightPanelBg, layoutMode, contentAlign, closeButtonPosition]);

  const previewCloseBtnStyle = useMemo(() => {
    const s = { position: "absolute", zIndex: 8, width: 26, height: 26, borderRadius: "50%", border: "none", fontSize: 14, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)", color: headlineColor, boxShadow: "0 1px 4px rgba(15,23,42,0.12)" };
    if (closeButtonPosition === "top_left") return { ...s, top: 8, left: 10 };
    if (closeButtonPosition === "bottom_right") return { ...s, bottom: 8, right: 10 };
    if (closeButtonPosition === "bottom_left") return { ...s, bottom: 8, left: 10 };
    return { ...s, top: 8, right: 10 };
  }, [closeButtonPosition, headlineColor]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  /** The tabbed left-panel content */
  function renderEditorTabContent() {
    if (editorTab === "design") return (
      <>
        {showEditorKey("theme_presets") && (
          <TabSection title="Theme Presets" description="One-click color & style combinations.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {PRESETS.map((p, i) => (
                <button key={p.key} type="button" onClick={() => applyPreset(p, i)} title={p.name}
                  style={{ padding: "10px 6px", borderRadius: 12, border: activePreset === i ? `2px solid ${p.accentGold}` : "2px solid transparent", background: p.leftPanelBg, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: activePreset === i ? `0 3px 10px ${p.accentGold}44` : "0 1px 4px rgba(0,0,0,0.07)", transform: activePreset === i ? "scale(1.05)" : "scale(1)" }}
                  onMouseEnter={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: p.dot, boxShadow: `0 0 0 3px ${p.dot}33` }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: p.headlineColor, letterSpacing: "0.04em" }}>{p.name}</span>
                </button>
              ))}
            </div>
          </TabSection>
        )}

        {showEditorKey("layout_mode", "visual_style") && (
          <TabSection title="Layout & Visual Style">
            {showEditorKey("layout_mode") && (
              <s-select label="Layout" value={layoutMode} onChange={(e) => setLayoutMode(parsePopupLayoutMode(e.target?.value ?? layoutMode))}>
                {Object.entries(LAYOUT_LABELS).map(([k, lab]) => <s-option key={k} value={k}>{lab}</s-option>)}
              </s-select>
            )}
            {showEditorKey("visual_style") && (
              <s-select label="Visual style" value={visualStyle} onChange={(e) => setVisualStyle(parsePopupVisualStyle(e.target?.value ?? visualStyle))}>
                {Object.entries(VISUAL_STYLE_LABELS).map(([k, lab]) => <s-option key={k} value={k}>{lab}</s-option>)}
              </s-select>
            )}
            {showEditorKey("appearance_align") && (
              <s-select label="Content alignment" value={contentAlign} onChange={(e) => setContentAlign(parsePopupContentAlign(e.target?.value ?? contentAlign))}>
                <s-option value="left">Left</s-option>
                <s-option value="center">Center</s-option>
              </s-select>
            )}
          </TabSection>
        )}

        {showEditorKey("toggles") && (
          <TabSection title="Visibility" description="Toggle individual popup sections on or off.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <s-checkbox label="Dim page overlay" checked={dimOverlay} onChange={(e) => setDimOverlay(e.target?.checked ?? false)} />
              <s-checkbox label="Title badge" checked={showTitle} onChange={(e) => setShowTitle(e.target?.checked ?? false)} />
              <s-checkbox label="Headline" checked={showHeadline} onChange={(e) => setShowHeadline(e.target?.checked ?? false)} />
              <s-checkbox label="Sub-headline" checked={showSubheadline} onChange={(e) => setShowSubheadline(e.target?.checked ?? false)} />
              <s-checkbox label="Coupon + CTA" checked={showContent} onChange={(e) => setShowContent(e.target?.checked ?? false)} />
              <s-checkbox label="Transparent shell" checked={modalTransparentShell} onChange={(e) => setModalTransparentShell(e.target?.checked ?? false)} />
            </div>
          </TabSection>
        )}

        {showEditorKey("modal_shape") && (
          <TabSection title="Modal Shape">
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <Field label="Corner radius (px)" type="number" min={0} max={48} value={String(modalBorderRadius)} onChange={(e) => setModalBorderRadius(Math.min(48, Math.max(0, Number(e.currentTarget.value) || 0)))} />
              <Field label="Max width px (0 = auto)" type="number" min={0} max={920} value={String(modalMaxWidthPx)} onChange={(e) => setModalMaxWidthPx(Math.max(0, Number(e.currentTarget.value) || 0))} />
            </s-grid>
          </TabSection>
        )}

        {showEditorKey("modal_bg", "close_button") && (
          <TabSection title="Modal Background & Close Button">
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-select label="Background image fit" value={modalBackgroundImageFit} onChange={(e) => setModalBackgroundImageFit(parsePopupModalBackgroundImageFit(e.target?.value ?? modalBackgroundImageFit))}>
                {Object.entries(MODAL_BG_FIT_LABELS).map(([k, lab]) => <s-option key={k} value={k}>{lab}</s-option>)}
              </s-select>
              <s-select label="Close button position" value={closeButtonPosition} onChange={(e) => setCloseButtonPosition(parsePopupCloseButtonPosition(e.target?.value ?? closeButtonPosition))}>
                {Object.entries(CLOSE_BUTTON_LABELS).map(([k, lab]) => <s-option key={k} value={k}>{lab}</s-option>)}
              </s-select>
            </s-grid>
          </TabSection>
        )}

        {!editorKeyList && (
          <TabSection title="Apply a Ready-made Layout" description="Instantly load copy, layout, and colors for common promo types.">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {POPUP_READY_TEMPLATES.map((t) => (
                <button key={t.id} type="button" disabled={!selectedPopupId} onClick={() => applyReadyTemplate(t.id)}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: "1px solid #e4e8f0", background: "#fafbfd", cursor: selectedPopupId ? "pointer" : "not-allowed", opacity: selectedPopupId ? 1 : 0.55 }}
                  onMouseEnter={(e) => { if (selectedPopupId) { e.currentTarget.style.borderColor = "#6aaee8"; e.currentTarget.style.background = "#f0f7ff"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e4e8f0"; e.currentTarget.style.background = "#fafbfd"; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2233", marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#8896a8" }}>{t.blurb}</div>
                </button>
              ))}
            </div>
          </TabSection>
        )}
      </>
    );

    if (editorTab === "content") return (
      <>
        {showEditorKey("design_id") && (
          <TabSection title="Design ID" description="Paste this into your theme block or app embed.">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <s-text-field label="Design ID" value={popupDesignId} readOnly placeholder="popup_summer_2025" />
              </div>
              <s-button type="button" variant="secondary" icon={copied ? "check-circle" : "duplicate"} onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </s-button>
            </div>
          </TabSection>
        )}

        {showEditorKey("popup_name") && (
          <TabSection title="Internal Name">
            <Field label="Name (app list only - not shown on storefront)" value={popupName} onChange={(e) => setPopupName(e.currentTarget.value)} placeholder="Spring sale modal" />
          </TabSection>
        )}

        {showEditorKey("content_badge", "content_headlines", "content_coupon", "content_cta", "content_cta_link") && (
          <TabSection title="Copy & CTA">
            {showEditorKey("content_badge") && (
              <Field label="Title badge text" value={titleBadgeText} onChange={(e) => setTitleBadgeText(e.currentTarget.value)} placeholder="✦ LIMITED OFFER" />
            )}
            {showEditorKey("content_headlines") && (
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} />
                <Field label="Sub-headline" value={subheadline} onChange={(e) => setSubheadline(e.currentTarget.value)} />
              </s-grid>
            )}
            {showEditorKey("body_text") && (
              <s-text-area label="Body text (optional)" value={bodyText} rows={3} minLength={0} maxLength={10000} placeholder="Short paragraph under the sub-headline…" onChange={(e) => setBodyText(String(e.target?.value ?? ""))} />
            )}
            {showEditorKey("content_coupon") && (
              <Field label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.currentTarget.value)} />
            )}
            {showEditorKey("content_cta") && (
              <Field label="CTA button label" value={ctaText} onChange={(e) => setCtaText(e.currentTarget.value)} />
            )}
            {showEditorKey("content_cta_link") && (
              <Field label="CTA link (optional)" value={ctaHref} onChange={(e) => setCtaHref(e.currentTarget.value)} placeholder="https://..." />
            )}
          </TabSection>
        )}

        {showEditorKey("content_hero_image") && (
          <TabSection title="Hero Image">
            <Field label="Image URL" value={leftImageUrl} onChange={(e) => setLeftImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
            <Field label="Alt text (optional)" value={leftImageAlt} onChange={(e) => setLeftImageAlt(e.currentTarget.value)} />
          </TabSection>
        )}

        {showEditorKey("appearance_coupon") && (
          <TabSection title="Coupon Display">
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-select label="Coupon style" value={couponVariant} onChange={(e) => setCouponVariant(parsePopupCouponVariant(e.target?.value ?? couponVariant))}>
                <s-option value="dashed">Dashed box</s-option>
                <s-option value="ticket">Ticket / stub</s-option>
              </s-select>
              {showEditorKey("content_copy_buttons") && (
                <>
                  <Field label="Copy button label" value={copyCouponButtonText} onChange={(e) => setCopyCouponButtonText(e.currentTarget.value)} />
                  <Field label="Copied confirmation text" value={copyCouponSuccessText} onChange={(e) => setCopyCouponSuccessText(e.currentTarget.value)} />
                </>
              )}
            </s-grid>
          </TabSection>
        )}

        {showEditorKey("email_capture") && (
          <TabSection title="Email Capture">
            <s-checkbox label="Show email input field" checked={emailCaptureEnabled} onChange={(e) => { const on = e.target?.checked ?? false; setEmailCaptureEnabled(on); if (!on) { setSubscriberSignupEnabled(false); setShopifyCustomerCreateEnabled(false); } }} />
            {emailCaptureEnabled && (
              <>
                <Field label="Input placeholder" value={emailPlaceholder} onChange={(e) => setEmailPlaceholder(e.currentTarget.value)} />
                <s-checkbox label="Record signups & subscriber count" checked={subscriberSignupEnabled} onChange={(e) => setSubscriberSignupEnabled(e.target?.checked ?? false)} />
                <s-checkbox label="Create Shopify customer on subscribe" checked={shopifyCustomerCreateEnabled} onChange={(e) => setShopifyCustomerCreateEnabled(e.target?.checked ?? false)} />
                {shopifyCustomerCreateEnabled && (
                  <>
                    <s-checkbox label="Subscribe to email marketing" checked={customerCreateMarketingOptIn} onChange={(e) => setCustomerCreateMarketingOptIn(e.target?.checked ?? false)} />
                    <s-checkbox label="Show success message in popup (no redirect)" checked={customerCreateStayInPopup} onChange={(e) => setCustomerCreateStayInPopup(e.target?.checked ?? false)} />
                    <Field label="Success message" value={customerCreateSuccessMessage} onChange={(e) => setCustomerCreateSuccessMessage(e.currentTarget.value)} />
                    <Field label="Success image URL (optional)" value={customerCreateSuccessImageUrl} onChange={(e) => setCustomerCreateSuccessImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
                  </>
                )}
              </>
            )}
          </TabSection>
        )}

        {showEditorKey("content_dismiss") && (
          <TabSection title="Dismiss Link">
            <s-checkbox label='Show "No thanks" link under the CTA' checked={showDismissFootnote} onChange={(e) => setShowDismissFootnote(e.target?.checked ?? false)} />
            {showDismissFootnote && (
              <Field label="Dismiss link text" value={dismissFootnoteText} onChange={(e) => setDismissFootnoteText(e.currentTarget.value)} placeholder="No thanks, I'll pay full price" />
            )}
          </TabSection>
        )}
      </>
    );

    if (editorTab === "timing") return (
      <>
        <TabSection title="Display Trigger">
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <s-select label="Trigger type" value={displayTrigger} onChange={(e) => setDisplayTrigger(String(e.target?.value ?? displayTrigger))}>
              <s-option value="on_load">On load</s-option>
              <s-option value="delay">After delay</s-option>
            </s-select>
            <s-select label="Show mode" value={showMode} onChange={(e) => setShowMode(String(e.target?.value ?? showMode))}>
              <s-option value="repeat">Repeat</s-option>
              <s-option value="once">Show once</s-option>
            </s-select>
          </s-grid>
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <Field label="Repeat every (minutes)" type="number" min={1} max={10080} value={String(repeatFrequencyMinutes)} onChange={(e) => setRepeatFrequencyMinutes(Math.max(1, Number(e.currentTarget.value) || 1))} />
            <Field label="Max impressions (0 = unlimited)" type="number" min={0} max={10000} value={String(maxImpressions)} onChange={(e) => setMaxImpressions(Math.max(0, Math.min(10000, Number(e.currentTarget.value) || 0)))} />
          </s-grid>
          {maxImpressions > 0 && (
            <s-banner tone="caution" heading="Impression limit active">
              Limit is set to <strong>{maxImpressions}</strong>. Use a private window or clear site data to reset.
            </s-banner>
          )}
        </TabSection>

        <TabSection title="Show Delay">
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #eef0f4" }}>
            <input type="range" min={0} max={10000} step={100} value={showDelayMs} onChange={(e) => setShowDelayMs(Number(e.target.value))} style={{ width: "100%" }} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                paddingBlockStart: "var(--p-space-100, 4px)",
              }}
            >
              <s-text type="strong">{showDelayMs} ms</s-text>
              <s-text tone="subdued">10000 ms</s-text>
            </div>
          </div>
        </TabSection>

        <TabSection title="Countdown Timer">
          <s-checkbox label="Show countdown timer" checked={showTiming} onChange={(e) => setShowTiming(e.target?.checked ?? false)} />
          {showTiming && (
            <>
              <Field label="Countdown ends at" type="datetime-local" value={countdownLocal} onChange={(e) => syncCountdown(e.currentTarget.value)} />
              <s-select label="Timer display style" value={countdownStyle} onChange={(e) => setCountdownStyle(parsePopupCountdownStyle(e.target?.value ?? countdownStyle))}>
                <s-option value="compact">Compact - DD:HH:MM:SS</s-option>
                <s-option value="labeled">Labeled boxes</s-option>
              </s-select>
            </>
          )}
        </TabSection>
      </>
    );

    if (editorTab === "targeting") return (
      <>
        <TabSection title="Page Targeting" description="Control which pages this popup can appear on.">
          <s-select label="Target pages" value={pageTarget} onChange={(e) => setPageTarget(String(e.target?.value ?? pageTarget))}>
            <s-option value="all">All pages</s-option>
            <s-option value="home">Homepage only</s-option>
            <s-option value="product">Product pages</s-option>
            <s-option value="collection">Collection pages</s-option>
            <s-option value="cart">Cart page</s-option>
            <s-option value="custom">URL contains…</s-option>
          </s-select>
          {pageTarget === "custom" && (
            <Field label="URL must contain" value={customPathContains} onChange={(e) => setCustomPathContains(e.currentTarget.value)} placeholder="/collections/summer" />
          )}
          {targetingExplainer.needsSiteWideEmbed && (
            <s-banner tone="warning" heading="Site-wide embed required">
              Enable <strong>Online store → Themes → Customize → App embeds → "Popup design (site-wide)"</strong> for this rule to work on product, collection, cart, or custom URLs.
            </s-banner>
          )}
          <s-banner tone="info" heading="Where this popup opens">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {targetingExplainer.bullets.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
            </ul>
          </s-banner>
        </TabSection>
      </>
    );

    if (editorTab === "colors") return (
      <>
        <TabSection title="Color Palette" description="Changes apply immediately in the live preview.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ColorRow label="Left panel background" value={leftPanelBg} onChange={setLeftPanelBg} />
            <ColorRow label="Right panel background" value={rightPanelBg} onChange={setRightPanelBg} />
            <ColorRow label="Accent color" value={accentGold} onChange={setAccentGold} />
            <ColorRow label="Headline text" value={headlineColor} onChange={setHeadlineColor} />
            <ColorRow label="Sub-headline text" value={subheadlineColor} onChange={setSubheadlineColor} />
            <ColorRow label="Button background" value={buttonBg} onChange={setButtonBg} />
            <ColorRow label="Button text" value={buttonText} onChange={setButtonText} />
            <ColorRow label="Page overlay" value={overlayBg} onChange={setOverlayBg} />
          </div>
        </TabSection>
      </>
    );

    return null;
  }

  // ── Hidden form inputs for save action ──────────────────────────────────────
  const hiddenFormInputs = (
    <>
      <input type="hidden" name="intent" value="save" />
      <input type="hidden" name="rowId" value={selectedPopupId || ""} />
      <input type="hidden" name="popupName" value={popupName} />
      <input type="hidden" name="designTemplateId" value={designTemplateId} />
      <input type="hidden" name="popupDesignId" value={popupDesignId} />
      <input type="hidden" name="layoutMode" value={layoutMode} />
      <input type="hidden" name="dimOverlay" value={dimOverlay ? "1" : "0"} />
      <input type="hidden" name="showTitle" value={showTitle ? "1" : "0"} />
      <input type="hidden" name="titleBadgeText" value={titleBadgeText} />
      <input type="hidden" name="visualStyle" value={visualStyle} />
      <input type="hidden" name="showHeadline" value={showHeadline ? "1" : "0"} />
      <input type="hidden" name="showSubheadline" value={showSubheadline ? "1" : "0"} />
      <input type="hidden" name="showContent" value={showContent ? "1" : "0"} />
      <input type="hidden" name="showTiming" value={showTiming ? "1" : "0"} />
      <input type="hidden" name="modalTransparentShell" value={modalTransparentShell ? "1" : "0"} />
      <input type="hidden" name="modalBorderRadius" value={String(modalBorderRadius)} />
      <input type="hidden" name="modalMaxWidthPx" value={String(modalMaxWidthPx)} />
      <input type="hidden" name="headline" value={headline} />
      <input type="hidden" name="subheadline" value={subheadline} />
      <input type="hidden" name="couponCode" value={couponCode} />
      <input type="hidden" name="ctaText" value={ctaText} />
      <input type="hidden" name="ctaHref" value={ctaHref} />
      <input type="hidden" name="countdownEndAt" value={countdownEndAt} />
      <input type="hidden" name="showDelayMs" value={String(showDelayMs)} />
      <input type="hidden" name="displayTrigger" value={displayTrigger} />
      <input type="hidden" name="showMode" value={showMode} />
      <input type="hidden" name="repeatFrequencyMinutes" value={String(repeatFrequencyMinutes)} />
      <input type="hidden" name="maxImpressions" value={String(maxImpressions)} />
      <input type="hidden" name="pageTarget" value={pageTarget} />
      <input type="hidden" name="customPathContains" value={customPathContains} />
      <input type="hidden" name="leftImageUrl" value={leftImageUrl} />
      <input type="hidden" name="leftImageAlt" value={leftImageAlt} />
      <input type="hidden" name="copyCouponButtonText" value={copyCouponButtonText} />
      <input type="hidden" name="copyCouponSuccessText" value={copyCouponSuccessText} />
      <input type="hidden" name="showDismissFootnote" value={showDismissFootnote ? "1" : "0"} />
      <input type="hidden" name="dismissFootnoteText" value={dismissFootnoteText} />
      <input type="hidden" name="leftPanelBg" value={leftPanelBg} />
      <input type="hidden" name="rightPanelBg" value={rightPanelBg} />
      <input type="hidden" name="accentGold" value={accentGold} />
      <input type="hidden" name="headlineColor" value={headlineColor} />
      <input type="hidden" name="subheadlineColor" value={subheadlineColor} />
      <input type="hidden" name="buttonBg" value={buttonBg} />
      <input type="hidden" name="buttonText" value={buttonText} />
      <input type="hidden" name="overlayBg" value={overlayBg} />
      <input type="hidden" name="bodyText" value={bodyText} />
      <input type="hidden" name="contentAlign" value={contentAlign} />
      <input type="hidden" name="countdownStyle" value={countdownStyle} />
      <input type="hidden" name="couponVariant" value={couponVariant} />
      <input type="hidden" name="emailCaptureEnabled" value={emailCaptureEnabled ? "1" : "0"} />
      <input type="hidden" name="emailPlaceholder" value={emailPlaceholder} />
      <input type="hidden" name="subscriberSignupEnabled" value={subscriberSignupEnabled ? "1" : "0"} />
      <input type="hidden" name="shopifyCustomerCreateEnabled" value={shopifyCustomerCreateEnabled ? "1" : "0"} />
      <input type="hidden" name="customerCreateMarketingOptIn" value={customerCreateMarketingOptIn ? "1" : "0"} />
      <input type="hidden" name="customerCreateSuccessMessage" value={customerCreateSuccessMessage} />
      <input type="hidden" name="customerCreateSuccessImageUrl" value={customerCreateSuccessImageUrl} />
      <input type="hidden" name="customerCreateStayInPopup" value={customerCreateStayInPopup ? "1" : "0"} />
      <input type="hidden" name="modalBackgroundImageUrl" value={modalBackgroundImageUrl} />
      <input type="hidden" name="modalBackgroundImageAlt" value={modalBackgroundImageAlt} />
      <input type="hidden" name="modalBackgroundImageFit" value={modalBackgroundImageFit} />
      <input type="hidden" name="closeButtonPosition" value={closeButtonPosition} />
    </>
  );

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{FONT_IMPORT}{`
        *{box-sizing:border-box}body{margin:0}
        input[type=range]{accent-color:#005bd3}
        .popup-design-table tbody tr.popup-design-row:hover{background:#f8fafc}
        .editor-tab{transition:all 0.15s}
        .editor-tab:hover{background:#f1f4f8 !important;color:#1a2233 !important}
        .editor-tab.active{background:#fff !important;color:#005bd3 !important;border-bottom:2px solid #005bd3 !important;font-weight:700 !important}
        @keyframes sceDelOverlayIn{from{opacity:0}to{opacity:1}}
        @keyframes sceDelPanelIn{from{opacity:0;transform:scale(0.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      <s-page heading="Popup" inlineSize="large">
        {/* Save status in secondary slot */}
        <s-stack slot="secondary-actions" direction="inline" gap="small-100" alignItems="center">
          {actionData?.ok && actionData?.intent === "save" ? (
            <s-badge tone="success" icon="check-circle">Saved {new Date(actionData.savedAt || Date.now()).toLocaleTimeString()}</s-badge>
          ) : selectedPopup?.savedAt ? (
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-icon type="clock" tone="subdued" size="small" />
              <s-text tone="subdued">Last saved {new Date(selectedPopup.savedAt).toLocaleString()}</s-text>
            </s-stack>
          ) : null}
        </s-stack>

        {/* Error banner */}
        {(actionData?.ok === false && actionData?.error) || (fetcher.data?.ok === false && fetcher.data?.error) ? (
          <s-banner tone="critical" heading="Something went wrong">
            {actionData?.error || fetcher.data?.error}
            {(actionData?.planUpgradeRequired || fetcher.data?.planUpgradeRequired) ? (
              <>
                {" "}
                <s-link href="/app/billing">View pricing</s-link>
              </>
            ) : null}
          </s-banner>
        ) : null}

        {/* ── Popup List ────────────────────────────────────────────────────── */}
        {!configModal && (
          <div style={{ maxWidth: 1100, marginInline: "auto", width: "100%" }}>
            {!billingPlan?.isPremium && popupMax != null ? (
              <div style={{ marginBottom: 16 }}>
                <s-banner tone="info" heading={`${billingPlan.planName} plan`}>
                  Up to {popupMax} popup{popupMax === 1 ? "" : "s"} on Free.{" "}
                  <s-link href="/app/billing">Upgrade to Premium</s-link> for unlimited popups.
                </s-banner>
              </div>
            ) : null}
            <s-section >
              {popups.length === 0 ? (
                /* Empty state */
                <div style={{ textAlign: "center", padding: "60px 24px", background: "#fafbfd", borderRadius: 16, border: "1px dashed #d0d7e0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#eef2fa", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <s-icon type="layout-popup" tone="subdued" size="large" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2233", marginBottom: 8 }}>No popups yet</div>
                  <div style={{ fontSize: 14, color: "#8896a8", marginBottom: 24, maxWidth: 360, marginInline: "auto" }}>
                    Create your first popup by choosing a design template. It only takes a minute to set up.
                  </div>
                  <s-button type="button" variant="primary" icon="plus" onClick={() => setTemplateModalOpen(true)}>
                    Create your first popup
                  </s-button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "end",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
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
                          {/* <s-option value="25">25 / page</s-option>
                          <s-option value="50">50 / page</s-option> */}
                        </s-select>
                      </div>
                      {/* <s-text tone="subdued">
                        Total records: <strong>{totalPopupRecords}</strong>
                      </s-text> */}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      {atPopupLimit && popupLimitMessage ? (
                        <s-text tone="subdued">{popupLimitMessage}</s-text>
                      ) : null}
                      <button
                        type="button"
                        disabled={atPopupLimit}
                        aria-disabled={atPopupLimit}
                        onClick={() => { if (!atPopupLimit) setTemplateModalOpen(true); }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 14px",
                          background: atPopupLimit ? "rgb(0 123 96 / 5%)" : "rgb(0 123 96 / 10%)",
                          color: atPopupLimit ? "rgb(0 123 96 / 50%)" : "rgb(0 123 96)",
                          border: "1px solid rgb(0 123 96 / 20%)",
                          borderRadius: 8,
                          fontWeight: 700,
                          cursor: atPopupLimit ? "not-allowed" : "pointer",
                        }}
                      >
                        <span aria-hidden="true" style={{ fontWeight: 900 }}>+</span>
                        Create popup
                      </button>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #e4e8f0", background: "#fff" }}>
                  <table className="popup-design-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e4e8f0" }}>
                      <th scope="col" style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Design ID</th>
                        <th scope="col" style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>Title</th>
                        <th scope="col" style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Type</th>
                        <th scope="col" style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>Description</th>
                        <th scope="col" style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPopups.map((p) => {
                        const meta = getPopupTemplateMeta(p.config.designTemplateId);
                        const fullSummary = [p.config.headline, p.config.subheadline].filter(Boolean).join(" · ");
                        const summaryShort = fullSummary.slice(0, 120);
                        const summaryTruncated = fullSummary.length > 120;
                        const cellPad = { padding: "14px 16px", verticalAlign: "top" };
                        return (
                          <tr key={p.id} className="popup-design-row" style={{ borderBottom: "1px solid #eef0f4", transition: "background 0.12s" }}>
                            <td style={{ ...cellPad, fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, color: "#0f172a", wordBreak: "break-all", maxWidth: 180 }}>
                              {p.config.popupDesignId}
                            </td>
                            <td style={{ ...cellPad, color: "#0f172a", maxWidth: 200 }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>{p.name}</div>
                            </td>
                            <td style={{ ...cellPad, whiteSpace: "nowrap" }}>
                              {meta?.name ? (
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px",   }}>{meta.name}</span>
                              ) : (
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>-</span>
                              )}
                            </td>
                            <td style={{ ...cellPad, color: "#64748b", fontSize: 12, lineHeight: 1.5, maxWidth: 360 }}>
                              {fullSummary ? (
                                <span title={fullSummary}>{summaryShort}{summaryTruncated ? "…" : ""}</span>
                              ) : (
                                <span style={{ color: "#aab4c8", fontStyle: "italic" }}>No headline set</span>
                              )}
                            </td>
                            
                            <td style={{ ...cellPad, textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 8 }}>
  <s-button
    type="button"
    variant="secondary"
    icon="edit"
    onClick={() => {
      hydrateVersion.current = "";
      setSelectedPopupId(p.id);
      setSearchParams({ popup: p.id });
      setConfigModal({ mode: "edit", rowId: p.id });
      setEditorTab("design");
    }}
  > 
  </s-button>

  <s-button
    type="button"
    variant="secondary"
    tone="critical"
    icon="delete"
    disabled={fetcher.state !== "idle"}
    onClick={() => {
      setDeleteConfirmExiting(false);
      setDeleteConfirm({ id: p.id });
    }}
  > 
  </s-button>
</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginTop: 12,
                  }}
                >
                  <s-text tone="subdued">
                    Showing {tableStart + 1}-{tableEnd} of {totalPopupRecords}
                  </s-text>
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-button
                      type="button"
                      variant="secondary"
                      disabled={currentTablePage <= 1}
                      onClick={() => setTablePage((pg) => Math.max(1, pg - 1))}
                    >
                      Previous
                    </s-button>
                    <s-text tone="subdued">
                      Page {currentTablePage} / {totalTablePages}
                    </s-text>
                    <s-button
                      type="button"
                      variant="secondary"
                      disabled={currentTablePage >= totalTablePages}
                      onClick={() => setTablePage((pg) => Math.min(totalTablePages, pg + 1))}
                    >
                      Next
                    </s-button>
                  </s-stack>
                </div>
                </>
              )}
            </s-section>
          </div>
        )}

        {/* ── Template picker modal ──────────────────────────────────────────── */}
        {templateModalOpen && (
          <div role="dialog" aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            onClick={(e) => { if (e.target === e.currentTarget) setTemplateModalOpen(false); }}
          >
            <div style={{ background: "#fff", borderRadius: 20, maxWidth: 680, maxHeight: "88vh", overflow: "auto", padding: "28px 32px 32px", boxShadow: "0 32px 80px rgba(0,0,0,0.2)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  {/* <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#aab4c8", textTransform: "uppercase", marginBottom: 6 }}>New Popup</div> */}
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Choose a design template</div>
                  <div style={{ fontSize: 13, color: "#8896a8", marginTop: 4 }}>Start from a ready - made layout - you can customise everything after.</div>
                  {atPopupLimit ? (
                    <div style={{ marginTop: 12  }}>
                      <s-banner tone="warning">{popupLimitMessage}</s-banner>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  style={{
                    border: "none",
                    background: "rgb(0 123 96 / 10%)",
                    borderRadius: 10,
                    width: 36,
                    height: 36,
                    cursor: "pointer",
                    fontSize: 18,
                    color: "rgb(0 123 96)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fee2e2";
                    e.currentTarget.style.color = "#dc2626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgb(0 123 96 / 10%)";
                    e.currentTarget.style.color = "rgb(0 123 96)";
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
                {POPUP_READY_TEMPLATES.map((t) => (
                  <button key={t.id} type="button"
                    disabled={atPopupLimit}
                    onClick={() => { if (atPopupLimit) return; setTemplateModalOpen(false); setConfigModal({ mode: "create", templateId: t.id }); }}
                    style={{ textAlign: "left", padding: "18px 16px", borderRadius: 14, border: "1.5px solid #e4e8f0", background: "#fafbfd", cursor: atPopupLimit ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: atPopupLimit ? 0.55 : 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0, 123, 96)"; e.currentTarget.style.background = "rgba(0, 123, 96, 0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e4e8f0"; e.currentTarget.style.background = "#fafbfd"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#8896a8", lineHeight: 1.5 }}>{t.blurb}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Editor full-screen overlay ─────────────────────────────────────── */}
        {configModal && (
          <div role="dialog" aria-modal="true"
            style={{ position: "fixed", inset: 0, zIndex: 180, background: "#f4f6fa", overflow: "auto" }}>

            {/* Editor top bar */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e4e8f0", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, height: 60, boxShadow: "0 1px 6px rgba(20,40,90,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={() => { hydrateVersion.current = ""; setConfigModal(null); }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: "6px 10px", borderRadius: 8, fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                  <s-icon type="chevron-left" size="small" />
                  Back
                </button>
                <div style={{ width: 1, height: 24, background: "#e4e8f0" }} />
                <div>
                  <span style={{ fontSize: 11, color: "#aab4c8", fontWeight: 600 }}>{configModal.mode === "create" ? "Create" : "Edit"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginLeft: 8 }}>
                    {configModal.mode === "create" ? getPopupTemplateMeta(configModal.templateId)?.name || "New popup" : (selectedPopup?.name || "Popup")}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {actionData?.ok && actionData?.intent === "save" && (
                  <s-badge tone="success" icon="check-circle">Saved</s-badge>
                )}
                {configModal.mode === "create" ? (
                  <s-button type="button" variant="primary"  
                    disabled={fetcher.state !== "idle" || atPopupLimit} loading={fetcher.state !== "idle"}
                    onClick={() => { if (atPopupLimit) return; const fd = new FormData(); fd.set("intent", "create_with_config"); fd.set("popupName", popupName); fd.set("configJson", JSON.stringify(serializeEditorToParsedConfig())); fetcher.submit(fd, { method: "post" }); }}>
                   Save
                  </s-button>
                ) : (
                  <Form method="post" style={{ display: "contents" }}>
                    {hiddenFormInputs}
                    <s-button type="submit" variant="primary" icon="save" disabled={!selectedPopupId}>
                      Save changes
                    </s-button>
                  </Form>
                )}
              </div>
            </div>

            {/* Editor body */}
            <div style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 24px 60px", display: "grid", gridTemplateColumns: "minmax(300px, 420px) minmax(360px, 1fr)", gap: 24, alignItems: "start" }}>

              {/* LEFT: Tabbed settings panel */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e4e8f0", overflow: "hidden", boxShadow: "0 2px 12px rgba(20,40,90,0.06)" }}>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid #e4e8f0", background: "#f8fafc", overflowX: "auto" }}>
                  {EDITOR_TABS.map((tab) => (
                    <button key={tab.id} type="button" className={`editor-tab${editorTab === tab.id ? " active" : ""}`}
                      onClick={() => setEditorTab(tab.id)}
                      style={{ flex: "1 1 0", border: "none", borderBottom: "2px solid transparent", padding: "13px 8px 11px", fontSize: 12, fontWeight: 600, color: "#8896a8", cursor: "pointer", background: "#f8fafc", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <s-icon type={tab.icon} size="small" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding: "20px 20px 24px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                  {renderEditorTabContent()}
                </div>
              </div>

              {/* RIGHT: Sticky live preview */}
              <div style={{ position: "sticky", top: 80 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <s-icon type="view" tone="success" size="small" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2233" }}>Live preview</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#aab4c8" }}>Updates as you type</span>
                </div>

                {/* Browser frame */}
                <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e0e6f0", overflow: "hidden", boxShadow: "0 6px 40px rgba(20,40,90,0.1)" }}>
                  {/* Browser chrome */}
                  <div style={{ background: "#f2f4f8", borderBottom: "1px solid #e4e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["#ff6b6b", "#ffd93d", "#6bcb77"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                    </div>
                    <div style={{ flex: 1, background: "#fff", border: "1px solid #dde2ec", borderRadius: 6, padding: "4px 14px", fontSize: 11, color: "#aab4c8", textAlign: "center" }}>
                      yourstore.myshopify.com
                    </div>
                  </div>

                  {/* Viewport */}
                  <div style={{ background: "linear-gradient(140deg, #eef2fa 0%, #e4eaf6 100%)", padding: "52px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, padding: "18px 24px" }}>
                      {[58, 42, 66, 36, 52].map((w, i) => <div key={i} style={{ height: 7, background: "rgba(80,110,160,0.08)", borderRadius: 4, margin: "10px 0", width: `${w}%` }} />)}
                    </div>
                    <div style={{ position: "absolute", inset: 0, background: dimOverlay ? overlayBg : "transparent" }} />

                    {/* Popup card */}
                    <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: modalMaxWidthPx >= 280 ? modalMaxWidthPx : 510, borderRadius: modalBorderRadius, overflow: "hidden", display: "flex", flexDirection: layoutMode === "stacked" ? "column" : layoutMode === "split_image_right" ? "row-reverse" : "row", boxShadow: modalTransparentShell ? "none" : "0 28px 80px rgba(20,40,100,0.2), 0 0 0 1px rgba(255,255,255,0.9)" }}>
                      {modalBackgroundImageUrl.trim() && (
                        <img src={modalBackgroundImageUrl.trim()} alt={modalBackgroundImageAlt.trim() || ""}
                          style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%", objectFit: modalBackgroundImageFit === "contain" ? "contain" : "cover", objectPosition: "center", pointerEvents: "none", borderRadius: modalBorderRadius }} />
                      )}
                      {layoutMode !== "content_only" && (
                        <div style={{ width: layoutMode === "stacked" ? "100%" : 168, flexShrink: 0, background: leftPanelBg, position: "relative", zIndex: 1, overflow: "hidden", minHeight: layoutMode === "stacked" ? 150 : 220 }}>
                          {leftImageUrl.trim() ? (
                            <img src={leftImageUrl.trim()} alt={leftImageAlt || "Promotion"} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0 }} />
                          ) : (
                            <>
                              <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: accentGold, opacity: 0.22, top: -22, left: -28 }} />
                              <div style={{ position: "absolute", width: 68, height: 68, borderRadius: "50%", background: accentGold, opacity: 0.15, top: 42, left: 52 }} />
                              <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", background: accentGold, opacity: 0.1, bottom: -40, left: -28 }} />
                              <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)" }}>
                                <div style={{ width: 26, height: 16, background: accentGold, opacity: 0.6, borderRadius: "4px 4px 0 0", margin: "0 auto" }} />
                                <div style={{ width: 40, height: 50, background: accentGold, opacity: 0.6, borderRadius: "6px 6px 10px 10px" }} />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <div style={previewRightPanelStyle}>
                        {showTitle && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${accentGold}18`, border: `1px solid ${accentGold}40`, borderRadius: visualStyle === "minimal" ? 6 : 20, padding: "3px 9px", alignSelf: contentAlign === "center" ? "center" : "flex-start", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: accentGold }}>
                            {titleBadgeText.trim() || "✦ LIMITED OFFER"}
                          </div>
                        )}
                        {showHeadline && (
                          <div style={{ fontFamily: previewHeadlineFont, fontSize: previewHeadlineSize, fontWeight: 700, color: headlineColor, lineHeight: 1.2, paddingRight: contentAlign === "center" ? 0 : 14 }}>
                            {headline || "Your Headline Here"}
                          </div>
                        )}
                        {showSubheadline && (
                          <div style={{ color: subheadlineColor, ...previewSubStyle }}>{subheadline || "Subheadline text"}</div>
                        )}
                        {bodyText.trim() && (
                          <div style={{ fontSize: 12, lineHeight: 1.55, color: headlineColor, opacity: 0.85, maxWidth: 340 }}>{bodyText.trim()}</div>
                        )}
                        {showTiming && <CountdownPreview endAtIso={countdownEndAt} accent={accentGold} bg={`${accentGold}14`} compact={countdownStyle === "compact"} />}
                        {emailCaptureEnabled && showContent && (
                          <input readOnly placeholder={emailPlaceholder} style={{ width: "100%", maxWidth: 300, border: "1px solid rgba(15,23,42,0.16)", borderRadius: 8, padding: "9px 11px", fontSize: 12, color: "#64748b" }} />
                        )}
                        {showContent && couponCode && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch", justifyContent: contentAlign === "center" ? "center" : "flex-start", width: "100%" }}>
                            <div style={{ flex: "1 1 120px", maxWidth: couponVariant === "ticket" ? 280 : undefined, border: couponVariant === "ticket" ? "none" : `1.5px dashed ${accentGold}70`, borderRadius: couponVariant === "ticket" ? 10 : 8, padding: couponVariant === "ticket" ? "14px 28px" : "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", color: headlineColor, background: couponVariant === "ticket" ? "#fff" : `${accentGold}0c`, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", wordBreak: "break-all", boxShadow: couponVariant === "ticket" ? "inset 0 0 0 1px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.06)" : undefined, borderTop: couponVariant === "ticket" ? "1px dashed rgba(15,23,42,0.12)" : undefined, borderBottom: couponVariant === "ticket" ? "1px dashed rgba(15,23,42,0.12)" : undefined }}>
                              {couponCode}
                            </div>
                            <button type="button" onClick={() => { navigator.clipboard?.writeText(couponCode).then(() => { setPreviewCouponCopied(true); setTimeout(() => setPreviewCouponCopied(false), 2000); }); }}
                              style={{ flex: "0 0 auto", border: `1px solid ${accentGold}55`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", background: "#fff", color: headlineColor, fontFamily: "'Inter', sans-serif" }}>
                              {previewCouponCopied ? copyCouponSuccessText : copyCouponButtonText}
                            </button>
                          </div>
                        )}
                        {showContent && (
                          <button type="button" style={{ background: buttonBg, color: buttonText, border: "none", borderRadius: previewCtaRadius, padding: visualStyle === "minimal" ? "13px 16px" : "11px 14px", fontWeight: visualStyle === "minimal" ? 600 : 700, fontSize: 11, letterSpacing: visualStyle === "minimal" ? "0.02em" : "0.08em", textTransform: visualStyle === "minimal" ? "none" : "uppercase", cursor: "default", fontFamily: "'Inter', sans-serif" }}>
                            {ctaText || "Shop Now"}
                          </button>
                        )}
                        {showDismissFootnote && dismissFootnoteText.trim() && (
                          <div style={{ fontSize: 9, textAlign: "center", color: subheadlineColor, opacity: 0.5, letterSpacing: "0.04em" }}>{dismissFootnoteText}</div>
                        )}
                      </div>
                      <button type="button" aria-label="Close preview" style={previewCloseBtnStyle}>×</button>
                    </div>
                  </div>
                </div>

                {/* Quick-stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
                  {[
                    { label: "Delay", value: `${(showDelayMs / 1000).toFixed(1)}s`, color: "#2e7ec8" },
                    { label: "Countdown", value: countdownEndAt ? "Active" : "Off", color: countdownEndAt ? "#2d8a4e" : "#aab4c8" },
                    { label: "Layout", value: (LAYOUT_LABELS[layoutMode] || layoutMode).split(" -")[0], color: "#445566" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e4e8f0", padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
                      <div style={{ fontSize: 10, color: "#8896a8", fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {popupDesignId && (
                  <div style={{ marginTop: 10, background: "#fff", borderRadius: 10, border: "1px solid #e4e8f0", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "#8896a8", fontWeight: 600 }}>DESIGN ID</span>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#2563eb", fontWeight: 600 }}>{popupDesignId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
        {deleteConfirm && (
          <div role="dialog" aria-modal="true" aria-labelledby="popup-delete-confirm-title"
            style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(15,23,42,0.52)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, pointerEvents: deleteConfirmExiting ? "none" : "auto", opacity: deleteConfirmExiting ? 0 : 1, transition: deleteConfirmExiting ? "opacity 0.2s ease" : "none", animation: deleteConfirmExiting ? "none" : "sceDelOverlayIn 0.22s ease forwards" }}
            onClick={(e) => { if (e.target === e.currentTarget && !deleteConfirmExiting) requestDeleteConfirmClose(); }}>
            <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: "28px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", opacity: deleteConfirmExiting ? 0 : 1, transform: deleteConfirmExiting ? "scale(0.96) translateY(8px)" : "scale(1) translateY(0)", transition: deleteConfirmExiting ? "opacity 0.2s ease, transform 0.2s ease" : "none", animation: deleteConfirmExiting ? "none" : "sceDelPanelIn 0.24s ease 0.04s both" }}
              onClick={(e) => e.stopPropagation()}>
              {/* <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <s-icon type="delete" tone="critical" />
              </div> */}
              <h2 id="popup-delete-confirm-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "inherit" }}>Delete this popup?</h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>This action cannot be undone. The popup will be permanently removed.</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <s-button type="button" variant="secondary" disabled={deleteConfirmExiting} onClick={requestDeleteConfirmClose}>Cancel</s-button>
                <s-button type="button" variant="primary" tone="critical" icon="delete"
                  disabled={deleteConfirmExiting || fetcher.state !== "idle"} loading={fetcher.state !== "idle"}
                  onClick={() => { if (!deleteConfirm?.id || deleteConfirmExiting) return; const fd = new FormData(); fd.set("intent", "delete"); fd.set("rowId", deleteConfirm.id); fetcher.submit(fd, { method: "post" }); requestDeleteConfirmClose(); }}>
                  Delete
                </s-button>
              </div>
            </div>
          </div>
        )}
      </s-page>
    </>
  );
}