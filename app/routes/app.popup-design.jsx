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
//                 ["COUPON", couponCode || "—"],
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







































































import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, useActionData, useFetcher, useLoaderData, useOutletContext, useRevalidator, useSearchParams } from "react-router";
import {
  defaultPopupDesignConfig,
  generatePopupDesignId,
  parsePopupDesignConfig,
  parsePopupLayoutMode,
  resolvePopupDesignId,
} from "../lib/popup-design-config.js";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const POPUP_BAR_TYPE = "popup_design";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@300;400;500;600&display=swap');`;

const PRESETS = [
  { key: "bloom", name: "Bloom", dot: "#e8a0b0", leftPanelBg: "#fde8ef", rightPanelBg: "#fff5f8", accentGold: "#d4607a", headlineColor: "#3a1520", subheadlineColor: "#b04060", buttonBg: "#d4607a", buttonText: "#fff5f8", overlayBg: "rgba(253,232,239,0.88)" },
  { key: "sage", name: "Sage", dot: "#7baa7b", leftPanelBg: "#eaf4ea", rightPanelBg: "#f6faf6", accentGold: "#4a8c5c", headlineColor: "#1a3020", subheadlineColor: "#3a7050", buttonBg: "#4a8c5c", buttonText: "#f6faf6", overlayBg: "rgba(234,244,234,0.88)" },
  { key: "sand", name: "Sand", dot: "#c9a96e", leftPanelBg: "#faf3e8", rightPanelBg: "#fffbf4", accentGold: "#b8860b", headlineColor: "#2c1e08", subheadlineColor: "#9a6e20", buttonBg: "#2c1e08", buttonText: "#fffbf4", overlayBg: "rgba(250,243,232,0.9)" },
  { key: "sky", name: "Sky", dot: "#6aaee8", leftPanelBg: "#e8f3fd", rightPanelBg: "#f4f9ff", accentGold: "#2e7ec8", headlineColor: "#0c2240", subheadlineColor: "#2860a8", buttonBg: "#2e7ec8", buttonText: "#f4f9ff", overlayBg: "rgba(232,243,253,0.9)" },
  { key: "slate", name: "Slate", dot: "#8898aa", leftPanelBg: "#eef0f4", rightPanelBg: "#f8f9fb", accentGold: "#445566", headlineColor: "#1a222c", subheadlineColor: "#445566", buttonBg: "#1a222c", buttonText: "#f8f9fb", overlayBg: "rgba(238,240,244,0.9)" },
];

const LAYOUT_LABELS = {
  split_image_left: "Split — image left",
  split_image_right: "Split — image right",
  stacked: "Stacked — image on top",
  content_only: "Content only",
};

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
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const rows = await prisma.announcementBar.findMany({
    where: { shop, barType: POPUP_BAR_TYPE },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, configJson: true, updatedAt: true },
  });
  const popups = rows.map((row) => {
    const raw = parsePopupDesignConfig(row.configJson);
    const config = { ...raw, popupDesignId: resolvePopupDesignId(raw, row.id) };
    return {
      id: row.id,
      name: row.name,
      savedAt: row.updatedAt.toISOString(),
      config,
    };
  });
  return { popups };
};

function buildConfigPayload(form) {
  return parsePopupDesignConfig(
    JSON.stringify({
      popupDesignId: String(form.get("popupDesignId") || "").trim(),
      headline: String(form.get("headline") || ""),
      subheadline: String(form.get("subheadline") || ""),
      couponCode: String(form.get("couponCode") || ""),
      ctaText: String(form.get("ctaText") || ""),
      ctaHref: String(form.get("ctaHref") || ""),
      countdownEndAt: String(form.get("countdownEndAt") || "").trim(),
      showDelayMs: Number(form.get("showDelayMs") || 1200),
      leftImageUrl: String(form.get("leftImageUrl") || ""),
      leftImageAlt: String(form.get("leftImageAlt") || ""),
      copyCouponButtonText: String(form.get("copyCouponButtonText") || ""),
      copyCouponSuccessText: String(form.get("copyCouponSuccessText") || ""),
      layoutMode: String(form.get("layoutMode") || ""),
      dimOverlay: String(form.get("dimOverlay") || "") === "1",
      showHeadline: String(form.get("showHeadline") || "") === "1",
      showSubheadline: String(form.get("showSubheadline") || "") === "1",
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
    }),
  );
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "create") {
    const name = String(form.get("popupName") || "Untitled popup").trim() || "Untitled popup";
    const cfg = defaultPopupDesignConfig();
    const row = await prisma.announcementBar.create({
      data: {
        shop,
        name,
        barType: POPUP_BAR_TYPE,
        configJson: JSON.stringify(cfg),
        active: false,
        customHtml: "",
        customLiquid: "",
        customCss: "",
      },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, intent: "create", rowId: row.id, savedAt: row.updatedAt.toISOString() };
  }

  if (intent === "delete") {
    const rowId = String(form.get("rowId") || "").trim();
    const existing = await prisma.announcementBar.findFirst({
      where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Popup not found." };
    await prisma.announcementBar.delete({ where: { id: existing.id } });
    return { ok: true, intent: "delete", deletedId: rowId };
  }

  if (intent === "duplicate") {
    const rowId = String(form.get("rowId") || "").trim();
    const src = await prisma.announcementBar.findFirst({
      where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
    });
    if (!src) return { ok: false, error: "Popup not found." };
    const parsed = parsePopupDesignConfig(src.configJson);
    const next = { ...parsed, popupDesignId: generatePopupDesignId() };
    const config = parsePopupDesignConfig(JSON.stringify(next));
    const row = await prisma.announcementBar.create({
      data: {
        shop,
        name: `${src.name} (copy)`.slice(0, 120),
        barType: POPUP_BAR_TYPE,
        configJson: JSON.stringify(config),
        active: false,
        customHtml: "",
        customLiquid: "",
        customCss: "",
      },
      select: { id: true, updatedAt: true },
    });
    return { ok: true, intent: "duplicate", rowId: row.id, savedAt: row.updatedAt.toISOString() };
  }

  if (intent !== "save") {
    return { ok: false, error: "Unknown action." };
  }

  const rowId = String(form.get("rowId") || "").trim();
  if (!rowId) return { ok: false, error: "Select a popup to save." };

  const owned = await prisma.announcementBar.findFirst({
    where: { id: rowId, shop, barType: POPUP_BAR_TYPE },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Popup not found." };

  const config = buildConfigPayload(form);
  const configJson = JSON.stringify(config);
  const popupName = String(form.get("popupName") || "").trim() || "Popup";

  const updated = await prisma.announcementBar.update({
    where: { id: owned.id },
    data: { name: popupName, barType: POPUP_BAR_TYPE, configJson, active: false },
    select: { id: true, updatedAt: true },
  });
  return { ok: true, intent: "save", rowId: updated.id, savedAt: updated.updatedAt.toISOString() };
};

function CountdownPreview({ endAtIso, accent, bg }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {unit(parts.d, "DAYS")}{sep}{unit(parts.h, "HRS")}{sep}{unit(parts.m, "MIN")}{sep}{unit(parts.s, "SEC")}
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8896a8", letterSpacing: "0.07em", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: value, border: "1.5px solid rgba(0,0,0,0.1)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", cursor: "pointer" }} />
          <input type="color" value={value.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
        </div>
        <input type="text" value={value} onChange={(e) => onChange(e.currentTarget.value)}
          style={{ flex: 1, border: "1.5px solid #e4e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 12, color: "#1a2233", fontFamily: "monospace", outline: "none", background: "#fff", transition: "border-color 0.18s, box-shadow 0.18s" }}
          onFocus={(e) => { e.target.style.borderColor = "#6aaee8"; e.target.style.boxShadow = "0 0 0 3px rgba(106,174,232,0.15)"; }}
          onBlur={(e) => { e.target.style.borderColor = "#e4e8f0"; e.target.style.boxShadow = "none"; }}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, min, max }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8896a8", letterSpacing: "0.07em", marginBottom: 6, textTransform: "uppercase" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
        style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e4e8f0", borderRadius: 8, padding: "8px 11px", fontSize: 13, color: "#1a2233", fontFamily: "'Inter', sans-serif", outline: "none", background: "#fff", transition: "border-color 0.18s, box-shadow 0.18s" }}
        onFocus={(e) => { e.target.style.borderColor = "#6aaee8"; e.target.style.boxShadow = "0 0 0 3px rgba(106,174,232,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "#e4e8f0"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 14px" }}>
      <div style={{ flex: 1, height: 1, background: "#eaecf2" }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: "#aab4c8", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "#eaecf2" }} />
    </div>
  );
}

function hydrateFromConfig(c) {
  const cfg = c || defaultPopupDesignConfig();
  return {
    popupDesignId: cfg.popupDesignId || "",
    headline: cfg.headline,
    subheadline: cfg.subheadline,
    couponCode: cfg.couponCode,
    ctaText: cfg.ctaText,
    ctaHref: cfg.ctaHref,
    countdownEndAt: cfg.countdownEndAt,
    countdownLocal: toDatetimeLocalValue(cfg.countdownEndAt),
    showDelayMs: cfg.showDelayMs,
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
    layoutMode: parsePopupLayoutMode(cfg.layoutMode),
    dimOverlay: cfg.dimOverlay !== false,
    showHeadline: cfg.showHeadline !== false,
    showSubheadline: cfg.showSubheadline !== false,
    modalTransparentShell: cfg.modalTransparentShell === true,
    modalBorderRadius: cfg.modalBorderRadius ?? 12,
    modalMaxWidthPx: cfg.modalMaxWidthPx ?? 0,
  };
}

export default function PopupDesignPage() {
  const { popups } = useLoaderData();
  const actionData = useActionData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const { onboarding } = useOutletContext() || {};
  const fetchHandledKey = useRef("");

  const urlPopupId = String(searchParams.get("popup") || "").trim();
  const initialSelected =
    urlPopupId && popups.some((p) => p.id === urlPopupId) ? urlPopupId : popups[0]?.id ?? null;
  const [selectedPopupId, setSelectedPopupId] = useState(initialSelected);
  const selectedPopup = useMemo(() => popups.find((p) => p.id === selectedPopupId) ?? null, [popups, selectedPopupId]);

  const [popupName, setPopupName] = useState(() => selectedPopup?.name || "Untitled popup");
  const h0 = hydrateFromConfig(selectedPopup?.config);
  const [popupDesignId, setPopupDesignId] = useState(h0.popupDesignId);
  const [headline, setHeadline] = useState(h0.headline);
  const [subheadline, setSubheadline] = useState(h0.subheadline);
  const [couponCode, setCouponCode] = useState(h0.couponCode);
  const [ctaText, setCtaText] = useState(h0.ctaText);
  const [ctaHref, setCtaHref] = useState(h0.ctaHref);
  const [countdownEndAt, setCountdownEndAt] = useState(h0.countdownEndAt);
  const [countdownLocal, setCountdownLocal] = useState(h0.countdownLocal);
  const [showDelayMs, setShowDelayMs] = useState(h0.showDelayMs);
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
  const [layoutMode, setLayoutMode] = useState(h0.layoutMode);
  const [dimOverlay, setDimOverlay] = useState(h0.dimOverlay);
  const [showHeadline, setShowHeadline] = useState(h0.showHeadline);
  const [showSubheadline, setShowSubheadline] = useState(h0.showSubheadline);
  const [modalTransparentShell, setModalTransparentShell] = useState(h0.modalTransparentShell);
  const [modalBorderRadius, setModalBorderRadius] = useState(h0.modalBorderRadius);
  const [modalMaxWidthPx, setModalMaxWidthPx] = useState(h0.modalMaxWidthPx);
  const [activePreset, setActivePreset] = useState(null);
  const [copied, setCopied] = useState(false);
  const [previewCouponCopied, setPreviewCouponCopied] = useState(false);

  useEffect(() => {
    if (!popups.some((p) => p.id === selectedPopupId)) {
      const next = popups[0]?.id ?? null;
      setSelectedPopupId(next);
      if (next) setSearchParams({ popup: next });
      else setSearchParams({});
    }
  }, [popups, selectedPopupId, setSearchParams]);

  const hydrateVersion = useRef("");
  useEffect(() => {
    const apply = (h, name) => {
      setPopupName(name);
      setPopupDesignId(h.popupDesignId);
      setHeadline(h.headline);
      setSubheadline(h.subheadline);
      setCouponCode(h.couponCode);
      setCtaText(h.ctaText);
      setCtaHref(h.ctaHref);
      setCountdownEndAt(h.countdownEndAt);
      setCountdownLocal(h.countdownLocal);
      setShowDelayMs(h.showDelayMs);
      setLeftPanelBg(h.leftPanelBg);
      setRightPanelBg(h.rightPanelBg);
      setAccentGold(h.accentGold);
      setHeadlineColor(h.headlineColor);
      setSubheadlineColor(h.subheadlineColor);
      setButtonBg(h.buttonBg);
      setButtonText(h.buttonText);
      setOverlayBg(h.overlayBg);
      setLeftImageUrl(h.leftImageUrl);
      setLeftImageAlt(h.leftImageAlt);
      setCopyCouponButtonText(h.copyCouponButtonText);
      setCopyCouponSuccessText(h.copyCouponSuccessText);
      setLayoutMode(h.layoutMode);
      setDimOverlay(h.dimOverlay);
      setShowHeadline(h.showHeadline);
      setShowSubheadline(h.showSubheadline);
      setModalTransparentShell(h.modalTransparentShell);
      setModalBorderRadius(h.modalBorderRadius);
      setModalMaxWidthPx(h.modalMaxWidthPx);
    };

    if (!selectedPopupId) {
      const v = "__none__";
      if (hydrateVersion.current === v) return;
      hydrateVersion.current = v;
      apply(hydrateFromConfig(defaultPopupDesignConfig()), "Untitled popup");
      return;
    }

    const p = popups.find((x) => x.id === selectedPopupId);
    if (!p) return;
    const v = `${p.id}:${p.savedAt}`;
    if (hydrateVersion.current === v) return;
    hydrateVersion.current = v;
    apply(hydrateFromConfig(p.config), p.name || "Popup");
  }, [selectedPopupId, popups]);

  useEffect(() => {
    const d = fetcher.data;
    if (fetcher.state !== "idle" || !d?.ok) return;
    const key = `${d.intent}-${d.rowId || ""}-${d.deletedId || ""}-${d.savedAt || ""}`;
    if (fetchHandledKey.current === key) return;
    fetchHandledKey.current = key;
    if (d.intent === "create" || d.intent === "duplicate") {
      if (d.rowId) {
        setSelectedPopupId(d.rowId);
        setSearchParams({ popup: d.rowId });
      }
    }
    revalidator.revalidate();
  }, [fetcher.state, fetcher.data, revalidator, setSearchParams]);

  const selectPopup = (id) => {
    hydrateVersion.current = "";
    setSelectedPopupId(id);
    setSearchParams({ popup: id });
  };

  const applyPreset = useCallback((p, i) => {
    setActivePreset(i);
    setLeftPanelBg(p.leftPanelBg); setRightPanelBg(p.rightPanelBg);
    setAccentGold(p.accentGold); setHeadlineColor(p.headlineColor);
    setSubheadlineColor(p.subheadlineColor); setButtonBg(p.buttonBg);
    setButtonText(p.buttonText); setOverlayBg(p.overlayBg);
  }, []);

  const syncCountdown = (local) => { setCountdownLocal(local); setCountdownEndAt(fromDatetimeLocalValue(local)); };

  const handleCopy = () => {
    navigator.clipboard?.writeText(popupDesignId);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  const inp = {
    border: "1.5px solid #e4e8f0", borderRadius: 8, padding: "8px 11px",
    fontSize: 12, color: "#1a2233", fontFamily: "monospace",
    outline: "none", background: "#fff",
  };

  return (
    <>
      <style>{FONT_IMPORT}{`*{box-sizing:border-box}body{margin:0}input[type=range]{accent-color:#2e7ec8}`}</style>
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f2f5fa", minHeight: "100vh", color: "#1a2233" }}>

        {/* Top Bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e6eaf4", padding: "16px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 12px rgba(20,40,90,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "#edf3fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "1px solid #d0e2f8" }}>◈</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", color: "#aab4c8", marginBottom: 1 }}>POPUP DESIGNER</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", color: "#0d1829", letterSpacing: "-0.01em" }}>Design Studio</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {actionData?.ok && actionData?.intent === "save" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0faf2", border: "1px solid #b6e8c4", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#2d8a4e", fontWeight: 500 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d8a4e" }} />
                Saved {new Date(actionData.savedAt || Date.now()).toLocaleTimeString()}
              </div>
            )}
            {!(actionData?.ok && actionData?.intent === "save") && selectedPopup?.savedAt && (
              <span style={{ fontSize: 12, color: "#000000" }}>Last saved {new Date(selectedPopup.savedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {(actionData?.ok === false && actionData?.error) || (fetcher.data?.ok === false && fetcher.data?.error) ? (
          <div style={{ margin: "16px 36px 0", padding: "12px 16px", background: "#fff5f5", border: "1px solid #fcc", borderRadius: 10, fontSize: 13, color: "#c0392b" }}>
            ⚠ {actionData?.error || fetcher.data?.error}
          </div>
        ) : null}

        {/* Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 220px) minmax(360px, 440px) 1fr", gap: 20, padding: "28px 36px", maxWidth: 1480, margin: "0 auto", alignItems: "start" }}>

          {/* POPUP LIST */}
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e6eaf4", padding: "18px 14px 20px", boxShadow: "0 2px 20px rgba(20,40,90,0.06)", position: "sticky", top: 88, alignSelf: "start" }}>
            <SectionDivider title="Your popups" />
            <fetcher.Form method="post" style={{ marginBottom: 12 }}>
              <input type="hidden" name="intent" value="create" />
              <input type="hidden" name="popupName" value="Untitled popup" />
              <button type="submit" disabled={fetcher.state !== "idle"}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px dashed #c0d8f4", background: "#f8fbff", color: "#2e7ec8", fontSize: 12, fontWeight: 700, cursor: fetcher.state !== "idle" ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}>
                + New popup
              </button>
            </fetcher.Form>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "min(52vh, 420px)", overflowY: "auto" }}>
              {popups.map((p) => (
                <button key={p.id} type="button" onClick={() => selectPopup(p.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: selectedPopupId === p.id ? "2px solid #2e7ec8" : "1px solid #e4e8f0",
                    background: selectedPopupId === p.id ? "#edf3fd" : "#fff",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#1a2233", lineHeight: 1.25 }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: "#8896a8", fontFamily: "monospace", marginTop: 4, wordBreak: "break-all" }}>{p.config.popupDesignId}</div>
                </button>
              ))}
              {popups.length === 0 && (
                <div style={{ fontSize: 12, color: "#aab4c8", padding: "8px 4px", lineHeight: 1.45 }}>No popups yet. Create one to get a Design ID for your theme block.</div>
              )}
            </div>
            {selectedPopupId && popups.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="duplicate" />
                  <input type="hidden" name="rowId" value={selectedPopupId} />
                  <button type="submit" disabled={fetcher.state !== "idle"}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e4e8f0", background: "#f6f7fb", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#445566" }}>
                    Duplicate
                  </button>
                </fetcher.Form>
                <fetcher.Form method="post"
                  onSubmit={(e) => {
                    if (!window.confirm("Delete this popup? Theme blocks using its ID will stop working.")) e.preventDefault();
                  }}>
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="rowId" value={selectedPopupId} />
                  <button type="submit" disabled={fetcher.state !== "idle"}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #f5c6c6", background: "#fff8f8", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#b03030" }}>
                    Delete
                  </button>
                </fetcher.Form>
              </div>
            )}
          </div>

          {/* EDITOR */}
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e6eaf4", padding: "26px 24px 24px", boxShadow: "0 2px 20px rgba(20,40,90,0.06)" }}>

            <SectionDivider title="Theme Presets" />
            <div style={{ display: "flex", gap: 8 }}>
              {PRESETS.map((p, i) => (
                <button key={p.key} type="button" onClick={() => applyPreset(p, i)} title={p.name}
                  style={{ flex: 1, border: activePreset === i ? `2px solid ${p.accentGold}` : "2px solid transparent", borderRadius: 12, padding: "10px 4px", cursor: "pointer", background: p.leftPanelBg, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: activePreset === i ? `0 3px 14px ${p.accentGold}44` : "0 1px 5px rgba(0,0,0,0.08)", transform: activePreset === i ? "scale(1.06)" : "scale(1)" }}
                  onMouseEnter={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { if (activePreset !== i) e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: p.dot, boxShadow: `0 0 0 3px ${p.dot}33` }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: p.headlineColor, letterSpacing: "0.05em" }}>{p.name}</span>
                </button>
              ))}
            </div>

            <SectionDivider title="Design ID" />
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={popupDesignId} onChange={(e) => setPopupDesignId(e.currentTarget.value)} placeholder="popup_summer_2025" style={{ ...inp, flex: 1 }}
                onFocus={(e) => { e.target.style.borderColor = "#6aaee8"; e.target.style.boxShadow = "0 0 0 3px rgba(106,174,232,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e4e8f0"; e.target.style.boxShadow = "none"; }}
              />
              <button type="button" onClick={handleCopy} style={{ background: copied ? "#f0faf2" : "#edf3fd", border: `1.5px solid ${copied ? "#b6e8c4" : "#c0d8f4"}`, color: copied ? "#2d8a4e" : "#2e7ec8", borderRadius: 8, padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.18s" }}>
                {copied ? "✓ DONE" : "COPY"}
              </button>
              <button type="button" onClick={() => setPopupDesignId(generatePopupDesignId())} style={{ background: "#f6f7fb", border: "1.5px solid #e4e8f0", color: "#8896a8", borderRadius: 8, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: 700, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.target.style.color = "#1a2233")} onMouseLeave={(e) => (e.target.style.color = "#8896a8")}>↻ NEW</button>
            </div>

            <SectionDivider title="This popup" />
            <Field label="Internal name (app list only)" value={popupName} onChange={(e) => setPopupName(e.currentTarget.value)} placeholder="Spring sale modal" />
            <p style={{ fontSize: 11, color: "#aab4c8", marginTop: 6, lineHeight: 1.45 }}>Not shown on the storefront. Paste the Design ID into each theme block that should load this configuration.</p>

            <SectionDivider title="Layout & appearance" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8896a8", letterSpacing: "0.07em", marginBottom: 6, textTransform: "uppercase" }}>Layout</label>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(parsePopupLayoutMode(e.target.value))}
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e4e8f0", borderRadius: 8, padding: "8px 11px", fontSize: 13, color: "#1a2233", background: "#fff", outline: "none" }}
              >
                {Object.entries(LAYOUT_LABELS).map(([k, lab]) => (
                  <option key={k} value={k}>{lab}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 14, fontSize: 13, color: "#1a2233" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={dimOverlay} onChange={(e) => setDimOverlay(e.target.checked)} />
                <span>Dimmed page behind popup</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={showHeadline} onChange={(e) => setShowHeadline(e.target.checked)} />
                <span>Show headline</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={showSubheadline} onChange={(e) => setShowSubheadline(e.target.checked)} />
                <span>Show sub-headline</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={modalTransparentShell} onChange={(e) => setModalTransparentShell(e.target.checked)} />
                <span>Transparent outer shell (no card shadow)</span>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
              <Field label="Modal radius (px)" type="number" min={0} max={48} value={String(modalBorderRadius)} onChange={(e) => setModalBorderRadius(Math.min(48, Math.max(0, Number(e.currentTarget.value) || 0)))} />
              <Field label="Max width px (0 = default)" type="number" min={0} max={920} value={String(modalMaxWidthPx)} onChange={(e) => setModalMaxWidthPx(Math.max(0, Number(e.currentTarget.value) || 0))} />
            </div>
            <p style={{ fontSize: 10, color: "#aab4c8", marginBottom: 12 }}>Turn off the dimmed overlay for a “floating” look; set overlay color to transparent in the palette for the same effect with custom tint.</p>

            <SectionDivider title="Content" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.currentTarget.value)} />
              <Field label="Sub-headline" value={subheadline} onChange={(e) => setSubheadline(e.currentTarget.value)} />
              <Field label="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.currentTarget.value)} />
              <Field label="CTA label" value={ctaText} onChange={(e) => setCtaText(e.currentTarget.value)} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="CTA link (optional)" value={ctaHref} onChange={(e) => setCtaHref(e.currentTarget.value)} placeholder="https://..." />
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Left panel image URL" value={leftImageUrl} onChange={(e) => setLeftImageUrl(e.currentTarget.value)} placeholder="https://cdn.shopify.com/..." />
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Image alt text (optional)" value={leftImageAlt} onChange={(e) => setLeftImageAlt(e.currentTarget.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="Copy button label" value={copyCouponButtonText} onChange={(e) => setCopyCouponButtonText(e.currentTarget.value)} />
              <Field label="Copied confirmation" value={copyCouponSuccessText} onChange={(e) => setCopyCouponSuccessText(e.currentTarget.value)} />
            </div>

            <SectionDivider title="Timing" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Show delay (ms)" type="number" min={0} max={60000} value={String(showDelayMs)} onChange={(e) => setShowDelayMs(Math.max(0, Number(e.currentTarget.value) || 0))} />
              <Field label="Countdown end" type="datetime-local" value={countdownLocal} onChange={(e) => syncCountdown(e.currentTarget.value)} />
            </div>
            <div style={{ background: "#f6f8fc", borderRadius: 10, padding: "12px 14px" }}>
              <input type="range" min={0} max={10000} step={100} value={showDelayMs} onChange={(e) => setShowDelayMs(Number(e.target.value))} style={{ width: "100%" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 4, fontWeight: 600 }}>
                <span style={{ color: "#aab4c8" }}>Instant</span>
                <span style={{ color: "#2e7ec8" }}>{showDelayMs} ms</span>
                <span style={{ color: "#aab4c8" }}>10 000ms</span>
              </div>
            </div>

            <SectionDivider title="Color Palette" />
            <div style={{ display: "grid",  gap: 14 }}>
              <ColorRow label="Left panel" value={leftPanelBg} onChange={setLeftPanelBg} />
              <ColorRow label="Right panel" value={rightPanelBg} onChange={setRightPanelBg} />
              <ColorRow label="Accent" value={accentGold} onChange={setAccentGold} />
              <ColorRow label="Headline" value={headlineColor} onChange={setHeadlineColor} />
              <ColorRow label="Sub-headline" value={subheadlineColor} onChange={setSubheadlineColor} />
              <ColorRow label="Button BG" value={buttonBg} onChange={setButtonBg} />
              <ColorRow label="Button text" value={buttonText} onChange={setButtonText} />
              <ColorRow label="Overlay" value={overlayBg} onChange={setOverlayBg} />
            </div>

            <div style={{ marginTop: 24 }}>
              <Form method="post">
                <input type="hidden" name="intent" value="save" />
                <input type="hidden" name="rowId" value={selectedPopupId || ""} />
                <input type="hidden" name="popupName" value={popupName} />
                <input type="hidden" name="popupDesignId" value={popupDesignId} />
                <input type="hidden" name="layoutMode" value={layoutMode} />
                <input type="hidden" name="dimOverlay" value={dimOverlay ? "1" : "0"} />
                <input type="hidden" name="showHeadline" value={showHeadline ? "1" : "0"} />
                <input type="hidden" name="showSubheadline" value={showSubheadline ? "1" : "0"} />
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
                <input type="hidden" name="leftImageUrl" value={leftImageUrl} />
                <input type="hidden" name="leftImageAlt" value={leftImageAlt} />
                <input type="hidden" name="copyCouponButtonText" value={copyCouponButtonText} />
                <input type="hidden" name="copyCouponSuccessText" value={copyCouponSuccessText} />
                <input type="hidden" name="leftPanelBg" value={leftPanelBg} />
                <input type="hidden" name="rightPanelBg" value={rightPanelBg} />
                <input type="hidden" name="accentGold" value={accentGold} />
                <input type="hidden" name="headlineColor" value={headlineColor} />
                <input type="hidden" name="subheadlineColor" value={subheadlineColor} />
                <input type="hidden" name="buttonBg" value={buttonBg} />
                <input type="hidden" name="buttonText" value={buttonText} />
                <input type="hidden" name="overlayBg" value={overlayBg} />
                <button type="submit" disabled={!selectedPopupId} style={{ width: "100%", padding: "13px 20px", background: selectedPopupId ? "#1a2233" : "#aab4c8", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", cursor: selectedPopupId ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 20px rgba(26,34,51,0.2)", transition: "opacity 0.18s, transform 0.15s" }}
                  onMouseEnter={(e) => { if (selectedPopupId) { e.target.style.opacity = "0.87"; e.target.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; }}>
                  SAVE TO DATABASE
                </button>
              </Form>
            </div>
          </div>

          {/* RIGHT: Live Preview */}
          <div style={{ position: "sticky", top: 88 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2d8a4e", boxShadow: "0 0 0 2px #b6e8c4" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8896a8", letterSpacing: "0.1em" }}>LIVE PREVIEW</span>
            </div>

            {/* Browser frame */}
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e0e6f0", overflow: "hidden", boxShadow: "0 4px 36px rgba(20,40,90,0.1)" }}>
              {/* Browser chrome */}
              <div style={{ background: "#f2f4f8", borderBottom: "1px solid #e4e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#ff6b6b", "#ffd93d", "#6bcb77"].map((c) => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, background: "#fff", border: "1px solid #dde2ec", borderRadius: 6, padding: "4px 14px", fontSize: 11, color: "#aab4c8", textAlign: "center" }}>yourstore.myshopify.com</div>
              </div>

              {/* Viewport */}
              <div style={{ background: "linear-gradient(140deg, #eef2fa 0%, #e4eaf6 100%)", padding: "52px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420, position: "relative", overflow: "hidden" }}>
                {/* Skeleton */}
                <div style={{ position: "absolute", inset: 0, padding: "18px 24px" }}>
                  {[58, 42, 66, 36, 52].map((w, i) => <div key={i} style={{ height: 7, background: "rgba(80,110,160,0.08)", borderRadius: 4, margin: "10px 0", width: `${w}%` }} />)}
                </div>
                {/* Overlay */}
                <div style={{ position: "absolute", inset: 0, background: dimOverlay ? overlayBg : "transparent" }} />

                {/* Popup */}
                <div style={{
                  position: "relative",
                  zIndex: 2,
                  width: "100%",
                  maxWidth: modalMaxWidthPx >= 280 ? modalMaxWidthPx : 510,
                  borderRadius: modalBorderRadius,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: layoutMode === "stacked" ? "column" : layoutMode === "split_image_right" ? "row-reverse" : "row",
                  boxShadow: modalTransparentShell ? "none" : "0 28px 80px rgba(20,40,100,0.2), 0 0 0 1px rgba(255,255,255,0.9)",
                }}>
                  {layoutMode !== "content_only" && (
                  <div style={{
                    width: layoutMode === "stacked" ? "100%" : 168,
                    flexShrink: 0,
                    background: leftPanelBg,
                    position: "relative",
                    overflow: "hidden",
                    minHeight: layoutMode === "stacked" ? 150 : 220,
                  }}>
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

                  {/* Right panel */}
                  <div style={{ flex: 1, minWidth: 0, background: rightPanelBg, padding: "24px 20px 20px", display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                    <button type="button" style={{ position: "absolute", top: 10, right: 12, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.07)", border: "none", fontSize: 13, color: headlineColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${accentGold}18`, border: `1px solid ${accentGold}40`, borderRadius: 20, padding: "3px 9px", alignSelf: "flex-start", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: accentGold }}>
                      ✦ LIMITED OFFER
                    </div>

                    {showHeadline && (
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: headlineColor, lineHeight: 1.2, paddingRight: 14 }}>
                      {headline || "Your Headline Here"}
                    </div>
                    )}

                    {showSubheadline && (
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: subheadlineColor }}>
                      {subheadline || "Subheadline text"}
                    </div>
                    )}

                    <CountdownPreview endAtIso={countdownEndAt} accent={accentGold} bg={`${accentGold}14`} />

                    {couponCode && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
                        <div style={{ flex: "1 1 120px", border: `1.5px dashed ${accentGold}70`, borderRadius: 8, padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: "0.12em", color: headlineColor, background: `${accentGold}0c`, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0, wordBreak: "break-all" }}>
                          {couponCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(couponCode).then(() => {
                              setPreviewCouponCopied(true);
                              setTimeout(() => setPreviewCouponCopied(false), 2000);
                            });
                          }}
                          style={{
                            flex: "0 0 auto",
                            border: `1px solid ${accentGold}55`,
                            borderRadius: 8,
                            padding: "8px 14px",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                            background: "#fff",
                            color: headlineColor,
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {previewCouponCopied ? copyCouponSuccessText : copyCouponButtonText}
                        </button>
                      </div>
                    )}

                    <button type="button" style={{ background: buttonBg, color: buttonText, border: "none", borderRadius: 8, padding: "11px 14px", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "default", fontFamily: "'Inter', sans-serif" }}>
                      {ctaText || "Shop Now"}
                    </button>

                    <div style={{ fontSize: 9, textAlign: "center", color: subheadlineColor, opacity: 0.5, letterSpacing: "0.04em" }}>No thanks, I'll pay full price</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 14 }}>
              {[
                { label: "Show Delay", value: `${(showDelayMs / 1000).toFixed(1)}s`, color: "#2e7ec8" },
                { label: "Countdown", value: countdownEndAt ? "Active" : "Off", color: countdownEndAt ? "#2d8a4e" : "#aab4c8" },
                { label: "Coupon", value: couponCode || "—", color: couponCode ? "#b8860b" : "#aab4c8" },
                { label: "Layout", value: (LAYOUT_LABELS[layoutMode] || layoutMode).split(" —")[0], color: "#445566" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #e6eaf4", borderRadius: 12, padding: "13px 14px", textAlign: "center", boxShadow: "0 1px 8px rgba(20,40,90,0.05)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 3 }}>{value}</div>
                  <div style={{ fontSize: 9, color: "#aab4c8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>

            {popupDesignId && (
              <div style={{ marginTop: 10, background: "#edf3fd", border: "1px solid #c0d8f4", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#8896a8", fontWeight: 700, letterSpacing: "0.08em" }}>DESIGN ID</span>
                <span style={{ fontSize: 11, color: "#2e7ec8", fontFamily: "monospace", fontWeight: 600 }}>{popupDesignId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}