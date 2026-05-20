// import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useNavigate,
//   useRouteError,
//   useSubmit,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";
// import { getShopifyAppClientId } from "../lib/shopify-config.server";

// const ANNOUNCE_EMBED_HANDLE = "announcement-bar-embed";

// function defaultConfig() {
//   return {
//     messages: ["Summer sale - 20% off everything", "Free shipping over $50"],
//     backgroundColor: "#0f172a",
//     textColor: "#f8fafc",
//     borderColor: "#334155",
//     borderWidthPx: 0,
//     fontSizePx: 14,
//     fontWeight: "500",
//     fontFamily: "inherit",
//     textAlign: "center",
//     paddingYpx: 10,
//     paddingXpx: 16,
//     borderRadiusPx: 0,
//     shadow: "none",
//     letterSpacingEm: 0,
//     lineHeight: 1.35,
//     maxContentWidthPx: 0,
//     marqueeSpeedSeconds: 22,
//     rotateIntervalMs: 4500,
//     linkUrl: "",
//     linkUnderline: true,
//     dismissible: false,
//   };
// }

// function parseConfig(json) {
//   let raw = {};
//   try {
//     raw = JSON.parse(json || "{}");
//     if (typeof raw !== "object" || raw === null) raw = {};
//   } catch {
//     raw = {};
//   }
//   const base = defaultConfig();
//   const merged = { ...base, ...raw };
//   if (!Array.isArray(merged.messages) || !merged.messages.length) {
//     merged.messages = [...base.messages];
//   } else {
//     merged.messages = merged.messages.map((m) => String(m ?? "")).filter(Boolean);
//     if (!merged.messages.length) merged.messages = [...base.messages];
//   }
//   merged.fontSizePx = Number(merged.fontSizePx) || base.fontSizePx;
//   merged.borderWidthPx = Math.max(0, Number(merged.borderWidthPx) || 0);
//   merged.paddingYpx = Math.max(0, Number(merged.paddingYpx) || 0);
//   merged.paddingXpx = Math.max(0, Number(merged.paddingXpx) || 0);
//   merged.borderRadiusPx = Math.max(0, Number(merged.borderRadiusPx) || 0);
//   merged.marqueeSpeedSeconds = Math.max(4, Number(merged.marqueeSpeedSeconds) || 22);
//   merged.rotateIntervalMs = Math.max(1500, Number(merged.rotateIntervalMs) || 4500);
//   merged.lineHeight =
//     typeof merged.lineHeight === "number" && merged.lineHeight > 0
//       ? merged.lineHeight
//       : base.lineHeight;
//   merged.maxContentWidthPx = Math.max(0, Number(merged.maxContentWidthPx) || 0);
//   merged.letterSpacingEm = Number(merged.letterSpacingEm) || 0;
//   merged.fontWeight = String(merged.fontWeight || "500");
//   merged.fontFamily = String(merged.fontFamily || "inherit");
//   merged.textAlign = String(merged.textAlign || "center");
//   merged.shadow = String(merged.shadow || "none");
//   merged.linkUrl = String(merged.linkUrl || "").trim();
//   merged.dismissible = Boolean(merged.dismissible);
//   merged.linkUnderline = merged.linkUnderline !== false;
//   return merged;
// }

// function shadowCss(shadow) {
//   if (shadow === "subtle") return "0 1px 2px rgba(0,0,0,0.08)";
//   if (shadow === "medium") return "0 4px 14px rgba(0,0,0,0.14)";
//   return "none";
// }

// function fontStackCss(family) {
//   if (!family || family === "inherit") return "inherit";
//   if (family === "system") return "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
//   if (family === "serif") return 'Georgia, "Times New Roman", serif';
//   if (family === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
//   return family;
// }

// function previewBarStyle(cfg) {
//   return {
//     backgroundColor: cfg.backgroundColor,
//     color: cfg.textColor,
//     borderStyle: cfg.borderWidthPx > 0 ? "solid" : "none",
//     borderColor: cfg.borderWidthPx > 0 ? cfg.borderColor : "transparent",
//     borderWidth: cfg.borderWidthPx > 0 ? `${cfg.borderWidthPx}px` : 0,
//     fontSize: `${cfg.fontSizePx}px`,
//     fontWeight: cfg.fontWeight,
//     fontFamily: fontStackCss(cfg.fontFamily),
//     textAlign: cfg.textAlign,
//     padding: `${cfg.paddingYpx}px ${cfg.paddingXpx}px`,
//     borderRadius: `${cfg.borderRadiusPx}px`,
//     boxShadow: shadowCss(cfg.shadow),
//     letterSpacing: cfg.letterSpacingEm ? `${cfg.letterSpacingEm}em` : "normal",
//     lineHeight: cfg.lineHeight,
//     width: "100%",
//     boxSizing: "border-box",
//   };
// }

// function AnnouncementPreview({ barType, config }) {
//   const [rotIndex, setRotIndex] = useState(0);

//   useEffect(() => {
//     if (barType !== "rotating" || config.messages.length <= 1) return undefined;
//     const t = setInterval(() => {
//       setRotIndex((i) => (i + 1) % config.messages.length);
//     }, config.rotateIntervalMs);
//     return () => clearInterval(t);
//   }, [barType, config.rotateIntervalMs, config.messages.length]);

//   useEffect(() => {
//     setRotIndex(0);
//   }, [barType, config.messages]);

//   const style = previewBarStyle(config);
//   const maxInner =
//     config.maxContentWidthPx > 0
//       ? { maxWidth: config.maxContentWidthPx, marginLeft: "auto", marginRight: "auto" }
//       : {};

//   const linkify = (text) => {
//     if (!config.linkUrl) return text;
//     return (
//       <a
//         href={config.linkUrl}
//         style={{
//           color: "inherit",
//           textDecoration: config.linkUnderline ? "underline" : "none",
//         }}
//         onClick={(e) => e.preventDefault()}
//       >
//         {text}
//       </a>
//     );
//   };

//   let body = null;
//   if (barType === "marquee") {
//     const sep = " • ";
//     const text = config.messages.join(sep);
//     const doubled = (
//       <>
//         {linkify(text)}
//         <span aria-hidden="true">{sep}</span>
//         {linkify(text)}
//       </>
//     );
//     body = (
//       <div style={{ overflow: "hidden", width: "100%" }}>
//         <div
//           style={{
//             display: "inline-flex",
//             whiteSpace: "nowrap",
//             animation: `sceAbPreviewMarquee ${config.marqueeSpeedSeconds}s linear infinite`,
//           }}
//         >
//           {doubled}
//         </div>
//       </div>
//     );
//   } else if (barType === "rotating") {
//     const msg = config.messages[rotIndex] ?? "";
//     body = <div style={{ width: "100%" }}>{linkify(msg)}</div>;
//   } else {
//     body = <div style={{ width: "100%" }}>{linkify(config.messages[0] ?? "")}</div>;
//   }

//   return (
//     <>
//       <style>{`
//         @keyframes sceAbPreviewMarquee {
//           from { transform: translateX(0); }
//           to { transform: translateX(-50%); }
//         }
//       `}</style>
//       <div style={style}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, ...maxInner }}>
//           <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>{body}</div>
//           {config.dismissible ? (
//             <span
//               style={{
//                 opacity: 0.5,
//                 cursor: "default",
//                 fontSize: "1.1em",
//                 lineHeight: 1,
//                 flexShrink: 0,
//               }}
//               title="Preview only"
//             >
//               ×
//             </span>
//           ) : null}
//         </div>
//       </div>
//     </>
//   );
// }

// /**
//  * Storefront bar uses position:fixed; sticky inside admin often fails (parent overflow / shadow DOM).
//  * This shell pins the bar with position:absolute over a dedicated scroll layer.
//  */
// function FixedAnnouncementPreviewShell({ barType, config }) {
//   const barWrapRef = useRef(null);
//   const [barHeight, setBarHeight] = useState(48);

//   useLayoutEffect(() => {
//     const el = barWrapRef.current;
//     if (!el) return undefined;
//     const measure = () => {
//       const h = el.offsetHeight;
//       if (h > 0) setBarHeight(h);
//     };
//     measure();
//     const ro = new ResizeObserver(measure);
//     ro.observe(el);
//     return () => ro.disconnect();
//   }, [barType]);

//   return (
//     <div
//       style={{
//         position: "relative",
//         height: 280,
//         background: "#fafafa",
//         overflow: "hidden",
//         borderRadius: "0 0 6px 6px",
//       }}
//     >
//       <div
//         ref={barWrapRef}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           right: 0,
//           zIndex: 20,
//           borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
//           boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
//         }}
//       >
//         <AnnouncementPreview barType={barType} config={config} />
//       </div>
//       <div
//         role="region"
//         aria-label="Scrollable storefront preview"
//         tabIndex={0}
//         style={{
//           height: "100%",
//           overflowY: "auto",
//           overflowX: "hidden",
//           paddingTop: barHeight,
//           WebkitOverflowScrolling: "touch",
//           overscrollBehavior: "contain",
//           boxSizing: "border-box",
//           outline: "none",
//         }}
//       >
//         <div style={{ padding: 16, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
//           <strong style={{ color: "#374151" }}>Scroll inside this box</strong> (click here if needed,
//           then use trackpad or wheel). The bar stays fixed at the top of the preview - only this
//           area scrolls, like page content under your real announcement bar.
//         </div>
//         <div style={{ padding: "0 16px 16px", fontSize: 13, color: "#9ca3af" }}>
//           More sample content so you can scroll past the first paragraph.
//         </div>
//         <div style={{ height: 320 }} />
//       </div>
//     </div>
//   );
// }

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("edit");

//   const bars = await prisma.announcementBar.findMany({
//     where: { shop },
//     orderBy: { updatedAt: "desc" },
//   });

//   const editingBar = editId ? bars.find((b) => b.id === editId) ?? null : null;

//   const clientId = getShopifyAppClientId();
//   const storeHandle = shop.replace(/\.myshopify\.com$/i, "");
//   const editorBase = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`;
//   const embedQuery = new URLSearchParams({
//     context: "apps",
//     activateAppId: `${clientId}/${ANNOUNCE_EMBED_HANDLE}`,
//   });

//   return {
//     shop,
//     bars,
//     editingBar,
//     announcementBarEditorUrl: `${editorBase}?${embedQuery.toString()}`,
//     clientIdConfigured: Boolean(clientId),
//   };
// };

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   const intent = String(form.get("intent") || "");

//   if (intent === "delete") {
//     const id = String(form.get("id") || "");
//     await prisma.announcementBar.deleteMany({ where: { id, shop } });
//     return { ok: true, deleted: true };
//   }

//   const name = String(form.get("name") || "").trim();
//   const barType = String(form.get("barType") || "sticky");
//   const configJson = String(form.get("configJson") || "{}");
//   const active = form.get("active") === "true";

//   if (!name) {
//     return { ok: false, error: "Name is required." };
//   }

//   if (intent === "create") {
//     const created = await prisma.announcementBar.create({
//       data: { shop, name, barType, configJson, active },
//     });
//     return { ok: true, createdId: created.id };
//   }

//   if (intent === "update") {
//     const id = String(form.get("id") || "");
//     const result = await prisma.announcementBar.updateMany({
//       where: { id, shop },
//       data: { name, barType, configJson, active },
//     });
//     if (result.count === 0) {
//       return { ok: false, error: "Bar not found." };
//     }
//     return { ok: true };
//   }

//   return { ok: false, error: "Unknown action." };
// };

// export default function AnnouncementBarsPage() {
//   const { bars, editingBar, announcementBarEditorUrl, clientIdConfigured } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const submit = useSubmit();

//   const [name, setName] = useState(editingBar?.name ?? "");
//   const [barType, setBarType] = useState(editingBar?.barType ?? "sticky");
//   const [active, setActive] = useState(editingBar?.active ?? true);
//   const [config, setConfig] = useState(() =>
//     editingBar ? parseConfig(editingBar.configJson) : defaultConfig(),
//   );

//   const editKey = editingBar?.id ?? "__new__";

//   const withShopifyParams = useCallback(
//     (path) => {
//       const [pathname, existingQuery = ""] = path.split("?");
//       const current = new URLSearchParams(location.search);
//       const keep = new URLSearchParams(existingQuery);
//       for (const key of ["host", "shop"]) {
//         const val = current.get(key);
//         if (val && !keep.has(key)) keep.set(key, val);
//       }
//       const qs = keep.toString();
//       return qs ? `${pathname}?${qs}` : pathname;
//     },
//     [location.search],
//   );

//   useEffect(() => {
//     if (editingBar) {
//       setName(editingBar.name);
//       setBarType(editingBar.barType);
//       setActive(editingBar.active);
//       setConfig(parseConfig(editingBar.configJson));
//     } else {
//       setName("");
//       setBarType("sticky");
//       setActive(true);
//       setConfig(defaultConfig());
//     }
//   }, [editKey]);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.createdId) {
//       navigate(withShopifyParams(`/app/announcement-bars?edit=${actionData.createdId}`));
//     }
//   }, [actionData?.createdId, actionData?.ok, navigate, withShopifyParams]);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.deleted && editingBar) {
//       navigate(withShopifyParams("/app/announcement-bars"));
//     }
//   }, [actionData?.deleted, actionData?.ok, editingBar, navigate, withShopifyParams]);

//   const handleSave = useCallback(
//     (e) => {
//       e.preventDefault();
//       const fd = new FormData();
//       fd.set("intent", editingBar ? "update" : "create");
//       if (editingBar?.id) fd.set("id", editingBar.id);
//       fd.set("name", name.trim());
//       fd.set("barType", barType);
//       fd.set("active", active ? "true" : "false");
//       fd.set("configJson", JSON.stringify(config));
//       submit(fd, { method: "post" });
//     },
//     [active, barType, config, editingBar, name, submit],
//   );

//   const typeLabel = useMemo(() => {
//     if (barType === "marquee") return "Marquee";
//     if (barType === "rotating") return "Rotating";
//     return "Sticky";
//   }, [barType]);

//   return (
//     <s-page heading="Announcement bars">
//       <s-button
//         slot="secondary-actions"
//         variant="tertiary"
//         onClick={() => navigate(withShopifyParams("/app/announcement-bars"))}
//       >
//         New bar
//       </s-button>

//       <s-section heading="Builder">
//         <s-stack direction="block" gap="base">
//           {!clientIdConfigured ? (
//             <s-banner tone="warning" heading="Theme link may be incomplete">
//               Set SHOPIFY_API_KEY in .env so the “Open theme editor” link can enable the embed block.
//             </s-banner>
//           ) : null}
//           {actionData?.ok === false && actionData?.error ? (
//             <s-banner tone="critical" heading="Could not save">
//               {actionData.error}
//             </s-banner>
//           ) : null}

//           <s-grid
//             gridTemplateColumns="minmax(300px, 1fr) minmax(320px, 1.1fr)"
//             gap="large"
//             alignItems="start"
//           >
//             <s-box
//               padding="base"
//               borderWidth="base"
//               borderRadius="base"
//               background="subdued"
//             >
//               <Form method="post" onSubmit={handleSave}>
//                 <s-stack direction="block" gap="base">
//                   <s-text type="strong">Controls</s-text>

//                   <s-text-field
//                     label="Internal name"
//                     value={name}
//                     onChange={(e) => setName(e.currentTarget.value)}
//                     autocomplete="off"
//                     required
//                   />

//                   <s-select
//                     label="Bar type"
//                     value={barType}
//                     details="Sticky: fixed top. Marquee: scrolling text. Rotating: cycles messages."
//                     onChange={(e) => setBarType(e.currentTarget.value)}
//                   >
//                     <s-option value="sticky">Sticky</s-option>
//                     <s-option value="marquee">Marquee</s-option>
//                     <s-option value="rotating">Rotating</s-option>
//                   </s-select>

//                   <s-checkbox
//                     label="Active (visible on storefront via embed)"
//                     checked={active}
//                     onChange={(e) => setActive(e.currentTarget.checked)}
//                   />

//                   <s-divider />

//                   <s-text type="strong">Messages</s-text>
//                   {config.messages.map((msg, i) => (
//                     <s-text-field
//                       key={i}
//                       label={config.messages.length > 1 ? `Message ${i + 1}` : "Message"}
//                       value={msg}
//                       onChange={(e) => {
//                         const v = e.currentTarget.value;
//                         setConfig((c) => {
//                           const messages = [...c.messages];
//                           messages[i] = v;
//                           return { ...c, messages };
//                         });
//                       }}
//                       autocomplete="off"
//                     />
//                   ))}
//                   <s-stack direction="inline" gap="small">
//                     <s-button
//                       type="button"
//                       variant="secondary"
//                       onClick={() =>
//                         setConfig((c) => ({ ...c, messages: [...c.messages, ""] }))
//                       }
//                     >
//                       Add message
//                     </s-button>
//                     {config.messages.length > 1 ? (
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         tone="critical"
//                         onClick={() =>
//                           setConfig((c) => ({
//                             ...c,
//                             messages: c.messages.slice(0, -1),
//                           }))
//                         }
//                       >
//                         Remove last
//                       </s-button>
//                     ) : null}
//                   </s-stack>

//                   <s-divider />

//                   <s-text type="strong">Link & behavior</s-text>
//                   <s-text-field
//                     label="Link URL (optional)"
//                     value={config.linkUrl}
//                     onChange={(e) => setConfig((c) => ({ ...c, linkUrl: e.currentTarget.value }))}
//                     autocomplete="off"
//                     placeholder="https://"
//                   />
//                   <s-checkbox
//                     label="Underline link"
//                     checked={config.linkUnderline}
//                     onChange={(e) =>
//                       setConfig((c) => ({ ...c, linkUnderline: e.currentTarget.checked }))
//                     }
//                   />
//                   <s-checkbox
//                     label="Dismissible (shopper can close)"
//                     checked={config.dismissible}
//                     onChange={(e) =>
//                       setConfig((c) => ({ ...c, dismissible: e.currentTarget.checked }))
//                     }
//                   />

//                   {barType === "marquee" ? (
//                     <s-text-field
//                       label="Marquee duration (seconds)"
//                       type="number"
//                       min={4}
//                       max={120}
//                       value={String(config.marqueeSpeedSeconds)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           marqueeSpeedSeconds: Math.max(
//                             4,
//                             Number(e.currentTarget.value) || c.marqueeSpeedSeconds,
//                           ),
//                         }))
//                       }
//                     />
//                   ) : null}

//                   {barType === "rotating" ? (
//                     <s-text-field
//                       label="Rotate every (ms)"
//                       type="number"
//                       min={1500}
//                       max={60000}
//                       step={500}
//                       value={String(config.rotateIntervalMs)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           rotateIntervalMs: Math.max(
//                             1500,
//                             Number(e.currentTarget.value) || c.rotateIntervalMs,
//                           ),
//                         }))
//                       }
//                     />
//                   ) : null}

//                   <s-divider />
//                   <s-text type="strong">Colors</s-text>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Background"
//                       value={config.backgroundColor}
//                       onChange={(e) =>
//                         setConfig((c) => ({ ...c, backgroundColor: e.currentTarget.value }))
//                       }
//                       autocomplete="off"
//                     />
//                     <s-text-field
//                       label="Text"
//                       value={config.textColor}
//                       onChange={(e) => setConfig((c) => ({ ...c, textColor: e.currentTarget.value }))}
//                       autocomplete="off"
//                     />
//                     <s-text-field
//                       label="Border"
//                       value={config.borderColor}
//                       onChange={(e) =>
//                         setConfig((c) => ({ ...c, borderColor: e.currentTarget.value }))
//                       }
//                       autocomplete="off"
//                     />
//                     <s-text-field
//                       label="Border width (px)"
//                       type="number"
//                       min={0}
//                       max={16}
//                       value={String(config.borderWidthPx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           borderWidthPx: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                   </s-grid>

//                   <s-divider />
//                   <s-text type="strong">Typography & layout</s-text>
//                   <s-select
//                     label="Font"
//                     value={config.fontFamily}
//                     onChange={(e) => setConfig((c) => ({ ...c, fontFamily: e.currentTarget.value }))}
//                   >
//                     <s-option value="inherit">Inherit theme</s-option>
//                     <s-option value="system">System UI</s-option>
//                     <s-option value="serif">Serif</s-option>
//                     <s-option value="mono">Monospace</s-option>
//                   </s-select>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Font size (px)"
//                       type="number"
//                       min={10}
//                       max={32}
//                       value={String(config.fontSizePx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           fontSizePx: Math.max(10, Number(e.currentTarget.value) || c.fontSizePx),
//                         }))
//                       }
//                     />
//                     <s-select
//                       label="Weight"
//                       value={config.fontWeight}
//                       onChange={(e) => setConfig((c) => ({ ...c, fontWeight: e.currentTarget.value }))}
//                     >
//                       <s-option value="400">400</s-option>
//                       <s-option value="500">500</s-option>
//                       <s-option value="600">600</s-option>
//                       <s-option value="700">700</s-option>
//                     </s-select>
//                   </s-grid>
//                   <s-select
//                     label="Text align"
//                     value={config.textAlign}
//                     onChange={(e) => setConfig((c) => ({ ...c, textAlign: e.currentTarget.value }))}
//                   >
//                     <s-option value="left">Left</s-option>
//                     <s-option value="center">Center</s-option>
//                     <s-option value="right">Right</s-option>
//                   </s-select>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Letter spacing (em)"
//                       type="number"
//                       min={0}
//                       max={0.5}
//                       step={0.01}
//                       value={String(config.letterSpacingEm)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           letterSpacingEm: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                     <s-text-field
//                       label="Line height"
//                       type="number"
//                       min={1}
//                       max={2.5}
//                       step={0.05}
//                       value={String(config.lineHeight)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           lineHeight: Math.max(1, Number(e.currentTarget.value) || c.lineHeight),
//                         }))
//                       }
//                     />
//                   </s-grid>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Padding Y (px)"
//                       type="number"
//                       min={0}
//                       max={48}
//                       value={String(config.paddingYpx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           paddingYpx: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                     <s-text-field
//                       label="Padding X (px)"
//                       type="number"
//                       min={0}
//                       max={64}
//                       value={String(config.paddingXpx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           paddingXpx: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                   </s-grid>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Corner radius (px)"
//                       type="number"
//                       min={0}
//                       max={32}
//                       value={String(config.borderRadiusPx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           borderRadiusPx: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                     <s-text-field
//                       label="Max content width (px, 0 = full)"
//                       type="number"
//                       min={0}
//                       max={1600}
//                       value={String(config.maxContentWidthPx)}
//                       onChange={(e) =>
//                         setConfig((c) => ({
//                           ...c,
//                           maxContentWidthPx: Math.max(0, Number(e.currentTarget.value) || 0),
//                         }))
//                       }
//                     />
//                   </s-grid>
//                   <s-select
//                     label="Shadow"
//                     value={config.shadow}
//                     onChange={(e) => setConfig((c) => ({ ...c, shadow: e.currentTarget.value }))}
//                   >
//                     <s-option value="none">None</s-option>
//                     <s-option value="subtle">Subtle</s-option>
//                     <s-option value="medium">Medium</s-option>
//                   </s-select>

//                   <s-divider />

//                   <s-stack direction="inline" gap="base">
//                     <s-button variant="primary" type="submit">
//                       {editingBar ? "Save changes" : "Create bar"}
//                     </s-button>
//                   </s-stack>

//                   {editingBar ? (
//                     <s-stack direction="block" gap="small">
//                       <s-text type="strong">Theme embed</s-text>
//                       <s-paragraph>
//                         Bar ID (paste into the Announcement bar app embed):{" "}
//                         <s-text fontVariantNumeric="tabular-nums" type="strong">
//                           {editingBar.id}
//                         </s-text>
//                       </s-paragraph>
//                       <s-stack direction="inline" gap="small">
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => {
//                             void navigator.clipboard?.writeText(editingBar.id);
//                           }}
//                         >
//                           Copy ID
//                         </s-button>
//                         <a href={announcementBarEditorUrl} target="_top" rel="noopener noreferrer">
//                           <s-button type="button" variant="tertiary">
//                             Open theme editor
//                           </s-button>
//                         </a>
//                       </s-stack>
//                     </s-stack>
//                   ) : null}
//                 </s-stack>
//               </Form>
//             </s-box>

//             <div
//               style={{
//                 position: "sticky",
//                 top: "12px",
//                 alignSelf: "start",
//                 maxWidth: "100%",
//               }}
//             >
//               <s-stack direction="block" gap="base">
//                 <s-stack direction="inline" gap="small" alignItems="center">
//                   <s-text type="strong">Live preview</s-text>
//                   <s-badge tone="success">Sticky column</s-badge>
//                 </s-stack>
//                 <s-text tone="neutral">
//                   {typeLabel} - this preview column stays on screen while you scroll the main page
//                   (sticky). Inside the frame, the bar stays fixed and only the sample page scrolls.
//                 </s-text>
//                 <s-box padding="none" borderWidth="base" borderRadius="base" background="base">
//                   <div
//                     style={{
//                       height: 36,
//                       background: "#e5e7eb",
//                       display: "flex",
//                       alignItems: "center",
//                       paddingLeft: 12,
//                       fontSize: 12,
//                       color: "#374151",
//                       borderBottom: "1px solid #d1d5db",
//                     }}
//                   >
//                     Storefront preview
//                   </div>
//                   <FixedAnnouncementPreviewShell barType={barType} config={config} />
//                 </s-box>
//               </s-stack>
//             </div>
//           </s-grid>
//         </s-stack>
//       </s-section>

//       <s-section heading="Your bars">
//         {bars.length === 0 ? (
//           <s-box padding="large" borderWidth="base" borderRadius="base">
//             <s-text tone="neutral">No bars yet. Fill in the builder and create one.</s-text>
//           </s-box>
//         ) : (
//           <s-table variant="auto">
//             <s-table-header-row>
//               <s-table-header listSlot="primary">Name</s-table-header>
//               <s-table-header listSlot="inline">Type</s-table-header>
//               <s-table-header listSlot="labeled">ID</s-table-header>
//               <s-table-header listSlot="inline">Active</s-table-header>
//               <s-table-header listSlot="labeled">Actions</s-table-header>
//             </s-table-header-row>
//             <s-table-body>
//               {bars.map((b) => (
//                 <s-table-row key={b.id}>
//                   <s-table-cell>
//                     <s-text type="strong">{b.name}</s-text>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-badge tone="info">{b.barType}</s-badge>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-text fontVariantNumeric="tabular-nums">{b.id}</s-text>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-badge tone={b.active ? "success" : "neutral"}>
//                       {b.active ? "Yes" : "No"}
//                     </s-badge>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-stack direction="inline" gap="small-100">
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         icon="edit"
//                         onClick={() =>
//                           navigate(withShopifyParams(`/app/announcement-bars?edit=${b.id}`))
//                         }
//                       >
//                         Edit
//                       </s-button>
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         onClick={() => void navigator.clipboard?.writeText(b.id)}
//                       >
//                         Copy ID
//                       </s-button>
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         tone="critical"
//                         icon="delete"
//                         onClick={() => {
//                           const fd = new FormData();
//                           fd.set("intent", "delete");
//                           fd.set("id", b.id);
//                           submit(fd, { method: "post" });
//                         }}
//                       >
//                         Delete
//                       </s-button>
//                     </s-stack>
//                   </s-table-cell>
//                 </s-table-row>
//               ))}
//             </s-table-body>
//           </s-table>
//         )}
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);















// import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useNavigate,
//   useRouteError,
//   useSubmit,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";
// import { getShopifyAppClientId } from "../lib/shopify-config.server";
// import { renderAnnouncementLiquid } from "../utils/announcementLiquid";
// import { enforceSingleActiveAnnouncementBar } from "../utils/announcementBarActive.server";

// const ANNOUNCE_EMBED_HANDLE = "announcement-bar-embed";
// const ANNOUNCE_BLOCK_HANDLE = "announcement-bar-block";
// const ANNOUNCEMENT_STYLE_PRESETS = [
//   {
//     id: "running",
//     title: "Running Bar",
//     barType: "marquee",
//     messages: ["Black Friday Sale Is Live! Enjoy Flat 20% Off On All Products."],
//     config: {
//       backgroundColor: "#1e3a8a",
//       textColor: "#ffffff",
//       borderColor: "#1e40af",
//       borderWidthPx: 1,
//       fontWeight: "600",
//       textAlign: "left",
//       paddingYpx: 12,
//       paddingXpx: 20,
//       borderRadiusPx: 8,
//       shadow: "subtle",
//       marqueeSpeedSeconds: 20,
//       linkUnderline: false,
//       dismissible: false,
//     },
//   },
//   {
//     id: "fixed",
//     title: "Fixed / Sticky Bar",
//     barType: "sticky",
//     messages: ["Flash Save Alert! Everything Must Go - Save Before It Ends."],
//     config: {
//       backgroundColor: "#111827",
//       textColor: "#f9fafb",
//       borderColor: "#4b5563",
//       borderWidthPx: 1,
//       fontWeight: "700",
//       textAlign: "left",
//       paddingYpx: 12,
//       paddingXpx: 20,
//       borderRadiusPx: 8,
//       shadow: "medium",
//       linkUnderline: false,
//       dismissible: false,
//     },
//   },
//   {
//     id: "carousel",
//     title: "Carousel Style Bar",
//     barType: "rotating",
//     messages: [
//       "Prices Slashed! Don't Miss Out On Major Savings.",
//       "Limited-time deals updated every hour.",
//       "Shop now and unlock exclusive cart rewards.",
//     ],
//     config: {
//       backgroundColor: "#0f172a",
//       textColor: "#e5e7eb",
//       borderColor: "#0b3a45",
//       borderWidthPx: 1,
//       fontWeight: "600",
//       textAlign: "left",
//       paddingYpx: 12,
//       paddingXpx: 20,
//       borderRadiusPx: 8,
//       shadow: "subtle",
//       rotateIntervalMs: 3000,
//       linkUnderline: false,
//       dismissible: false,
//     },
//   },
// ];

// function defaultConfig() {
//   return {
//     messages: ["Summer sale - 20% off everything", "Free shipping over $50"],
//     backgroundColor: "#0f172a",
//     textColor: "#f8fafc",
//     borderColor: "#334155",
//     borderWidthPx: 0,
//     fontSizePx: 14,
//     fontWeight: "500",
//     fontFamily: "inherit",
//     textAlign: "center",
//     paddingYpx: 10,
//     paddingXpx: 16,
//     borderRadiusPx: 0,
//     shadow: "none",
//     letterSpacingEm: 0,
//     lineHeight: 1.35,
//     maxContentWidthPx: 0,
//     marqueeSpeedSeconds: 22,
//     rotateIntervalMs: 4500,
//     linkUrl: "",
//     linkUnderline: true,
//     dismissible: false,
//   };
// }

// function parseConfig(json) {
//   let raw = {};
//   try {
//     raw = JSON.parse(json || "{}");
//     if (typeof raw !== "object" || raw === null) raw = {};
//   } catch {
//     raw = {};
//   }
//   const base = defaultConfig();
//   const merged = { ...base, ...raw };
//   if (!Array.isArray(merged.messages) || !merged.messages.length) {
//     merged.messages = [...base.messages];
//   } else {
//     merged.messages = merged.messages.map((m) => String(m ?? "")).filter(Boolean);
//     if (!merged.messages.length) merged.messages = [...base.messages];
//   }
//   merged.fontSizePx = Number(merged.fontSizePx) || base.fontSizePx;
//   merged.borderWidthPx = Math.max(0, Number(merged.borderWidthPx) || 0);
//   merged.paddingYpx = Math.max(0, Number(merged.paddingYpx) || 0);
//   merged.paddingXpx = Math.max(0, Number(merged.paddingXpx) || 0);
//   merged.borderRadiusPx = Math.max(0, Number(merged.borderRadiusPx) || 0);
//   merged.marqueeSpeedSeconds = Math.max(4, Number(merged.marqueeSpeedSeconds) || 22);
//   merged.rotateIntervalMs = Math.max(1500, Number(merged.rotateIntervalMs) || 4500);
//   merged.lineHeight =
//     typeof merged.lineHeight === "number" && merged.lineHeight > 0
//       ? merged.lineHeight
//       : base.lineHeight;
//   merged.maxContentWidthPx = Math.max(0, Number(merged.maxContentWidthPx) || 0);
//   merged.letterSpacingEm = Number(merged.letterSpacingEm) || 0;
//   merged.fontWeight = String(merged.fontWeight || "500");
//   merged.fontFamily = String(merged.fontFamily || "inherit");
//   merged.textAlign = String(merged.textAlign || "center");
//   merged.shadow = String(merged.shadow || "none");
//   merged.linkUrl = String(merged.linkUrl || "").trim();
//   merged.dismissible = Boolean(merged.dismissible);
//   merged.linkUnderline = merged.linkUnderline !== false;
//   return merged;
// }

// function shadowCss(shadow) {
//   if (shadow === "subtle") return "0 1px 2px rgba(0,0,0,0.08)";
//   if (shadow === "medium") return "0 4px 14px rgba(0,0,0,0.14)";
//   return "none";
// }

// function fontStackCss(family) {
//   if (!family || family === "inherit") return "inherit";
//   if (family === "system") return "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
//   if (family === "serif") return 'Georgia, "Times New Roman", serif';
//   if (family === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
//   return family;
// }

// function previewBarStyle(cfg) {
//   return {
//     backgroundColor: cfg.backgroundColor,
//     color: cfg.textColor,
//     borderStyle: cfg.borderWidthPx > 0 ? "solid" : "none",
//     borderColor: cfg.borderWidthPx > 0 ? cfg.borderColor : "transparent",
//     borderWidth: cfg.borderWidthPx > 0 ? `${cfg.borderWidthPx}px` : 0,
//     fontSize: `${cfg.fontSizePx}px`,
//     fontWeight: cfg.fontWeight,
//     fontFamily: fontStackCss(cfg.fontFamily),
//     textAlign: cfg.textAlign,
//     padding: `${cfg.paddingYpx}px ${cfg.paddingXpx}px`,
//     borderRadius: `${cfg.borderRadiusPx}px`,
//     boxShadow: shadowCss(cfg.shadow),
//     letterSpacing: cfg.letterSpacingEm ? `${cfg.letterSpacingEm}em` : "normal",
//     lineHeight: cfg.lineHeight,
//     width: "100%",
//     boxSizing: "border-box",
//   };
// }

// // Converts any hex (3 or 6 digit) to a 6-digit #rrggbb string for <input type="color">
// function toPickerHex(value) {
//   const v = String(value || "").trim();
//   const six = /^#[0-9a-fA-F]{6}$/;
//   const three = /^#[0-9a-fA-F]{3}$/;
//   if (six.test(v)) return v;
//   if (three.test(v)) {
//     const r = v[1];
//     const g = v[2];
//     const b = v[3];
//     return "#" + r + r + g + g + b + b;
//   }
//   return "#000000";
// }

// function isValidHex(v) {
//   const re = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
//   return re.test(String(v).trim());
// }

// // ── ColorPickerField ──────────────────────────────────────────────────────────
// // Clickable colour swatch + hex text input, kept in sync. Clicking the swatch
// // opens the native OS colour picker.
// function ColorPickerField({ label, value, onChange }) {
//   const inputRef = useRef(null);
//   const [draft, setDraft] = useState(value);

//   // Keep draft in sync when parent resets (e.g. loading a different bar)
//   useEffect(() => {
//     setDraft(value);
//   }, [value]);

//   const pickerHex = toPickerHex(value);

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
//       <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 8,
//           background: "#fff",
//           border: "1px solid #d1d5db",
//           borderRadius: 8,
//           padding: "5px 10px 5px 6px",
//           boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
//         }}
//       >
//         {/* Clickable swatch */}
//         <span
//           onClick={() => inputRef.current && inputRef.current.click()}
//           title="Pick a colour"
//           style={{
//             display: "inline-block",
//             width: 30,
//             height: 30,
//             borderRadius: 7,
//             background: pickerHex,
//             border: "2px solid #e5e7eb",
//             boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
//             flexShrink: 0,
//             cursor: "pointer",
//             transition: "transform 0.12s",
//           }}
//           onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; }}
//           onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
//         />

//         {/* Hidden native colour picker - triggered by swatch click */}
//         <input
//           ref={inputRef}
//           type="color"
//           value={pickerHex}
//           onChange={(e) => {
//             const v = e.target.value;
//             setDraft(v);
//             onChange(v);
//           }}
//           style={{
//             opacity: 0,
//             width: 0,
//             height: 0,
//             border: "none",
//             padding: 0,
//             position: "absolute",
//             pointerEvents: "none",
//           }}
//           tabIndex={-1}
//         />

//         {/* Editable hex text */}
//         <input
//           type="text"
//           value={draft}
//           onChange={(e) => {
//             const v = e.target.value;
//             setDraft(v);
//             if (isValidHex(v)) onChange(v.trim());
//           }}
//           onBlur={() => {
//             if (!isValidHex(draft)) setDraft(value);
//           }}
//           maxLength={7}
//           placeholder="#000000"
//           style={{
//             border: "none",
//             outline: "none",
//             fontSize: 13,
//             fontFamily: "ui-monospace, SFMono-Regular, monospace",
//             color: "#111827",
//             flex: 1,
//             minWidth: 0,
//             background: "transparent",
//             letterSpacing: "0.04em",
//           }}
//         />
//       </div>
//     </div>
//   );
// }
// // ─────────────────────────────────────────────────────────────────────────────

// function AnnouncementPreview({
//   barType,
//   config,
//   customHtml = "",
//   customCss = "",
//   customLiquid = "",
//   shopDomain = "",
// }) {
//   const [rotIndex, setRotIndex] = useState(0);
//   const [liquidRendered, setLiquidRendered] = useState(null);
//   const liquidTrim = customLiquid.trim();

//   useEffect(() => {
//     if (!liquidTrim) {
//       setLiquidRendered(null);
//       return undefined;
//     }
//     let cancelled = false;
//     setLiquidRendered(null);
//     renderAnnouncementLiquid(customLiquid, shopDomain)
//       .then((html) => {
//         if (!cancelled) setLiquidRendered(html ?? "");
//       })
//       .catch(() => {
//         if (!cancelled) setLiquidRendered(null);
//       });
//     return () => {
//       cancelled = true;
//     };
//   }, [customLiquid, liquidTrim, shopDomain]);

//   const effectiveHtml = liquidTrim
//     ? liquidRendered !== null && String(liquidRendered).trim()
//       ? String(liquidRendered)
//       : customHtml
//     : customHtml;
//   const trimmedCustom = effectiveHtml.trim();

//   useEffect(() => {
//     if (trimmedCustom || barType !== "rotating" || config.messages.length <= 1) return undefined;
//     const t = setInterval(() => {
//       setRotIndex((i) => (i + 1) % config.messages.length);
//     }, config.rotateIntervalMs);
//     return () => clearInterval(t);
//   }, [trimmedCustom, barType, config.rotateIntervalMs, config.messages.length]);

//   useEffect(() => {
//     setRotIndex(0);
//   }, [trimmedCustom, barType, config.messages]);

//   const style = previewBarStyle(config);
//   const maxInner =
//     config.maxContentWidthPx > 0
//       ? { maxWidth: config.maxContentWidthPx, marginLeft: "auto", marginRight: "auto" }
//       : {};

//   const linkify = (text) => {
//     if (!config.linkUrl) return text;
//     return (
//       <a
//         href={config.linkUrl}
//         style={{
//           color: "inherit",
//           textDecoration: config.linkUnderline ? "underline" : "none",
//         }}
//         onClick={(e) => e.preventDefault()}
//       >
//         {text}
//       </a>
//     );
//   };

//   const stackAlignItems =
//     config.textAlign === "left" || config.textAlign === "start"
//       ? "start"
//       : config.textAlign === "right" || config.textAlign === "end"
//         ? "end"
//         : "center";

//   const messageCount = Array.isArray(config.messages) ? config.messages.length : 1;
//   const messageStackGap = messageCount > 4 ? 10 : messageCount > 2 ? 12 : 14;

//   const messageLineStyle = {
//     boxSizing: "border-box",
//     width: "fit-content",
//     maxWidth: "100%",
//     maxInlineSize: "100%",
//     minInlineSize: 0,
//     overflowWrap: "anywhere",
//     wordBreak: "break-word",
//   };

//   let body = null;
//   if (trimmedCustom) {
//     body = (
//       <div style={{ width: "100%" }} dangerouslySetInnerHTML={{ __html: trimmedCustom }} />
//     );
//   } else if (barType === "marquee") {
//     /* En spaces + bullet (U+2022), same as storefront marquee separator */
//     const sep = "\u2002\u2022\u2002";
//     const text = config.messages.join(sep);
//     const doubled = (
//       <>
//         {linkify(text)}
//         {sep}
//         {linkify(text)}
//       </>
//     );
//     body = (
//       <div style={{ overflow: "hidden", width: "100%" }}>
//         <div
//           style={{
//             display: "inline-flex",
//             whiteSpace: "nowrap",
//             animation: `sceAbPreviewMarquee ${config.marqueeSpeedSeconds}s linear infinite`,
//           }}
//         >
//           {doubled}
//         </div>
//       </div>
//     );
//   } else if (barType === "rotating") {
//     const msg = config.messages[rotIndex] ?? "";
//     body = (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: stackAlignItems,
//           gap: 0,
//           width: "100%",
//           minWidth: 0,
//         }}
//       >
//         <div style={messageLineStyle}>{linkify(msg)}</div>
//       </div>
//     );
//   } else {
//     body = (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: stackAlignItems,
//           gap: messageStackGap,
//           width: "100%",
//           minWidth: 0,
//         }}
//       >
//         {config.messages.map((msg, i) => (
//           <div key={i} style={messageLineStyle}>
//             {linkify(msg)}
//           </div>
//         ))}
//       </div>
//     );
//   }

//   return (
//     <>
//       {customCss.trim() ? <style>{customCss}</style> : null}
//       <style>{`
//         @keyframes sceAbPreviewMarquee {
//           from { transform: translateX(0); }
//           to { transform: translateX(-50%); }
//         }
//       `}</style>
//       <div style={style}>
//         <div style={{ display: "flex", alignItems: "center", gap: 8, ...maxInner }}>
//           <div
//             style={{
//               flex: "1 1 auto",
//               minWidth: 0,
//               ...(barType === "marquee" && !trimmedCustom ? { overflow: "hidden" } : {}),
//             }}
//           >
//             {body}
//           </div>
//           {config.dismissible ? (
//             <span
//               style={{
//                 opacity: 0.5,
//                 cursor: "default",
//                 fontSize: "1.1em",
//                 lineHeight: 1,
//                 flexShrink: 0,
//               }}
//               title="Preview only"
//             >
//               ×
//             </span>
//           ) : null}
//         </div>
//       </div>
//     </>
//   );
// }

// function FixedAnnouncementPreviewShell({
//   barType,
//   config,
//   customHtml = "",
//   customCss = "",
//   customLiquid = "",
//   shopDomain = "",
// }) {
//   const barWrapRef = useRef(null);
//   const [barHeight, setBarHeight] = useState(48);

//   useLayoutEffect(() => {
//     const el = barWrapRef.current;
//     if (!el) return undefined;
//     const measure = () => {
//       const h = el.offsetHeight;
//       if (h > 0) setBarHeight(h);
//     };
//     measure();
//     const ro = new ResizeObserver(measure);
//     ro.observe(el);
//     return () => ro.disconnect();
//   }, [barType, customHtml, customCss, customLiquid, shopDomain, config]);

//   return (
//     <div
//       style={{
//         position: "relative",
//         height: 180,
//         background: "#fafafa",
//         overflow: "hidden",
//         borderRadius: "0 0 6px 6px",
//       }}
//     >
//       <div
//         ref={barWrapRef}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           right: 0,
//           zIndex: 20,
//           borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
//           boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
//         }}
//       >
//         <AnnouncementPreview
//           barType={barType}
//           config={config}
//           customHtml={customHtml}
//           customCss={customCss}
//           customLiquid={customLiquid}
//           shopDomain={shopDomain}
//         />
//       </div>
//       <div
//         role="region"
//         aria-label="Scrollable storefront preview"
//         tabIndex={0}
//         style={{
//           height: "100%",
//           overflowY: "auto",
//           overflowX: "hidden",
//           paddingTop: barHeight,
//           WebkitOverflowScrolling: "touch",
//           overscrollBehavior: "contain",
//           boxSizing: "border-box",
//           outline: "none",
//         }}
//       >
         
//       </div>
//     </div>
//   );
// }

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("edit");

//   await enforceSingleActiveAnnouncementBar(shop, editId);

//   const bars = await prisma.announcementBar.findMany({
//     where: { shop },
//     orderBy: { updatedAt: "desc" },
//   });

//   const editingBar = editId ? bars.find((b) => b.id === editId) ?? null : null;

//   const clientId = getShopifyAppClientId();
//   const storeHandle = shop.replace(/\.myshopify\.com$/i, "");
//   const editorBase = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`;
//   const embedQuery = new URLSearchParams({
//     context: "apps",
//     activateAppId: `${clientId}/${ANNOUNCE_EMBED_HANDLE}`,
//   });
//   const blockHeaderQuery = new URLSearchParams({
//     template: "index",
//     addAppBlockId: `${clientId}/${ANNOUNCE_BLOCK_HANDLE}`,
//     target: "sectionGroup:header",
//   });
//   const blockAppsSectionQuery = new URLSearchParams({
//     template: "index",
//     addAppBlockId: `${clientId}/${ANNOUNCE_BLOCK_HANDLE}`,
//     target: "newAppsSection",
//   });

//   return {
//     shop,
//     bars,
//     editingBar,
//     announcementBarEditorUrl: `${editorBase}?${embedQuery.toString()}`,
//     announcementBarBlockHeaderUrl: `${editorBase}?${blockHeaderQuery.toString()}`,
//     announcementBarBlockAppsSectionUrl: `${editorBase}?${blockAppsSectionQuery.toString()}`,
//     clientIdConfigured: Boolean(clientId),
//   };
// };

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;
//   const form = await request.formData();
//   const intent = String(form.get("intent") || "");

//   if (intent === "delete") {
//     const id = String(form.get("id") || "");
//     await prisma.announcementBar.deleteMany({ where: { id, shop } });
//     return { ok: true, deleted: true };
//   }


//   if (intent === "setActive") {
//     const setId = String(form.get("id") || "").trim();
//     if (!setId) {
//       return { ok: false, error: "Missing announcement id." };
//     }
//     const exists = await prisma.announcementBar.findFirst({
//       where: { id: setId, shop },
//       select: { id: true },
//     });
//     if (!exists) {
//       return { ok: false, error: "Announcement not found." };
//     }
//     await prisma.$transaction([
//       prisma.announcementBar.updateMany({ where: { shop }, data: { active: false } }),
//       prisma.announcementBar.updateMany({
//         where: { id: setId, shop },
//         data: { active: true },
//       }),
//     ]);
//     return { ok: true, activatedId: setId };
//   }

//   const name = String(form.get("name") || "").trim();
//   const barType = String(form.get("barType") || "sticky");
//   const configJson = String(form.get("configJson") || "{}");
//   const customHtml = String(form.get("customHtml") ?? "");
//   const customLiquid = String(form.get("customLiquid") ?? "");
//   const customCss = String(form.get("customCss") ?? "");
//   const active = form.get("active") === "true";
//   const replaceActive = form.get("replaceActive") === "true";
//   const id = String(form.get("id") || "");

//   if (!name) {
//     return { ok: false, error: "Name is required." };
//   }

//   const existingActive = active
//     ? await prisma.announcementBar.findFirst({
//         where: {
//           shop,
//           active: true,
//           ...(id ? { NOT: { id } } : {}),
//         },
//         select: { id: true, name: true },
//       })
//     : null;

//   if (existingActive && !replaceActive) {
//     return {
//       ok: false,
//       error: `Only one announcement can be active. "${existingActive.name}" is currently active. Deactivate it first or enable "Replace current active announcement".`,
//     };
//   }

//   if (intent === "create") {
//     if (active && replaceActive) {
//       await prisma.announcementBar.updateMany({
//         where: { shop, active: true },
//         data: { active: false },
//       });
//     }
//     const created = await prisma.announcementBar.create({
//       data: { shop, name, barType, configJson, active, customHtml, customLiquid, customCss },
//     });
//     return { ok: true, createdId: created.id };
//   }

//   if (intent === "update") {
//     if (active && replaceActive) {
//       await prisma.announcementBar.updateMany({
//         where: { shop, active: true, NOT: { id } },
//         data: { active: false },
//       });
//     }
//     const result = await prisma.announcementBar.updateMany({
//       where: { id, shop },
//       data: { name, barType, configJson, active, customHtml, customLiquid, customCss },
//     });
//     if (result.count === 0) {
//       return { ok: false, error: "Bar not found." };
//     }
//     return { ok: true };
//   }

//   return { ok: false, error: "Unknown action." };
// };

// export default function AnnouncementBarsPage() {
//   const {
//     shop,
//     bars,
//     editingBar,
//     announcementBarEditorUrl,
//     announcementBarBlockHeaderUrl,
//     announcementBarBlockAppsSectionUrl,
//     clientIdConfigured,
//   } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const submit = useSubmit();

//   const [name, setName] = useState(editingBar?.name ?? "");
//   const [barType, setBarType] = useState(editingBar?.barType ?? "sticky");
//   const [active, setActive] = useState(editingBar?.active ?? false);
//   const [replaceActive, setReplaceActive] = useState(false);
//   const [config, setConfig] = useState(() =>
//     editingBar ? parseConfig(editingBar.configJson) : defaultConfig(),
//   );
//   const [customHtml, setCustomHtml] = useState(() => editingBar?.customHtml ?? "");
//   const [customLiquid, setCustomLiquid] = useState(() => editingBar?.customLiquid ?? "");
//   const [customCss, setCustomCss] = useState(() => editingBar?.customCss ?? "");

//   const editKey = editingBar?.id ?? "__new__";

//   const withShopifyParams = useCallback(
//     (path) => {
//       const [pathname, existingQuery = ""] = path.split("?");
//       const current = new URLSearchParams(location.search);
//       const keep = new URLSearchParams(existingQuery);
//       for (const key of ["host", "shop"]) {
//         const val = current.get(key);
//         if (val && !keep.has(key)) keep.set(key, val);
//       }
//       const qs = keep.toString();
//       return qs ? `${pathname}?${qs}` : pathname;
//     },
//     [location.search],
//   );

//   useEffect(() => {
//     if (editingBar) {
//       setName(editingBar.name);
//       setBarType(editingBar.barType);
//       setActive(editingBar.active);
//       setReplaceActive(false);
//       setConfig(parseConfig(editingBar.configJson));
//       setCustomHtml(editingBar.customHtml ?? "");
//       setCustomLiquid(editingBar.customLiquid ?? "");
//       setCustomCss(editingBar.customCss ?? "");
//     } else {
//       setName("");
//       setBarType("sticky");
//       setActive(false);
//       setReplaceActive(false);
//       setConfig(defaultConfig());
//       setCustomHtml("");
//       setCustomLiquid("");
//       setCustomCss("");
//     }
//   }, [editKey]);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.createdId) {
//       navigate(withShopifyParams(`/app/announcement-bars?edit=${actionData.createdId}`));
//     }
//   }, [actionData?.createdId, actionData?.ok, navigate, withShopifyParams]);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.deleted && editingBar) {
//       navigate(withShopifyParams("/app/announcement-bars"));
//     }
//   }, [actionData?.deleted, actionData?.ok, editingBar, navigate, withShopifyParams]);

//   useEffect(() => {
//     if (actionData?.ok && actionData?.activatedId && editingBar?.id === actionData.activatedId) {
//       setActive(true);
//       setReplaceActive(false);
//     }
//   }, [actionData?.activatedId, actionData?.ok, editingBar?.id]);

//   const handleSave = useCallback(
//     (e) => {
//       e.preventDefault();
//       const fd = new FormData();
//       fd.set("intent", editingBar ? "update" : "create");
//       if (editingBar?.id) fd.set("id", editingBar.id);
//       fd.set("name", name.trim());
//       fd.set("barType", barType);
//       fd.set("active", active ? "true" : "false");
//       fd.set("replaceActive", replaceActive ? "true" : "false");
//       fd.set("configJson", JSON.stringify(config));
//       fd.set("customHtml", customHtml);
//       fd.set("customLiquid", customLiquid);
//       fd.set("customCss", customCss);
//       submit(fd, { method: "post" });
//     },
//     [
//       active,
//       barType,
//       config,
//       customCss,
//       customHtml,
//       customLiquid,
//       editingBar,
//       name,
//       replaceActive,
//       submit,
//     ],
//   );

//   const handleClear = useCallback(() => {
//     setName("");
//     setBarType("sticky");
//     setActive(false);
//     setReplaceActive(false);
//     setConfig(defaultConfig());
//     setCustomHtml("");
//     setCustomLiquid("");
//     setCustomCss("");
//     if (editingBar) {
//       navigate(withShopifyParams("/app/announcement-bars"));
//     }
//   }, [editingBar, navigate, withShopifyParams]);

//   const typeLabel = useMemo(() => {
//     if (customLiquid.trim()) return "Custom Liquid";
//     if (customHtml.trim()) return "Custom HTML";
//     if (barType === "marquee") return "Marquee";
//     if (barType === "rotating") return "Rotating";
//     return "Sticky";
//   }, [barType, customHtml, customLiquid]);

//   const applyStylePreset = useCallback(
//     (presetId) => {
//       const preset = ANNOUNCEMENT_STYLE_PRESETS.find((p) => p.id === presetId);
//       if (!preset) return;
//       const next = {
//         ...defaultConfig(),
//         ...preset.config,
//         messages: [...preset.messages],
//       };
//       setBarType(preset.barType);
//       setConfig(next);
//       setCustomHtml("");
//       setCustomLiquid("");
//       if (!name.trim()) setName(preset.title);
//     },
//     [name],
//   );

//   return (
//     <s-page heading="Announcement bars">
//       <s-button
//         slot="secondary-actions"
//         variant="tertiary"
//         onClick={() => navigate(withShopifyParams("/app/announcement-bars"))}
//       >
//         New bar
//       </s-button>

//       <s-section heading="Builder">
//         <s-stack direction="block" gap="base">
//           {!clientIdConfigured ? (
//             <s-banner tone="warning" heading="Theme link may be incomplete">
//                 Set SHOPIFY_API_KEY in .env so the theme editor deep links (App embeds and Add block) work.
//             </s-banner>
//           ) : null}
//           {actionData?.ok === false && actionData?.error ? (
//             <s-banner tone="critical" heading="Could not save">
//               {actionData.error}
//             </s-banner>
//           ) : null}
//           {actionData?.ok && actionData?.activatedId ? (
//             <s-banner tone="success" heading="Active announcement updated">
//               Only this announcement is active now. The storefront shows it when the theme uses an empty ID, or this ID if
//               pasted in the theme block.
//             </s-banner>
//           ) : null}

//           <s-grid
//             gridTemplateColumns="minmax(300px, 1fr) minmax(320px, 1.1fr)"
//             gap="large"
//             alignItems="start"
//           >
//             {/* ── Left: Controls ── */}
//             <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
//               <Form method="post" onSubmit={handleSave}>
//                 <s-stack direction="block" gap="base">
//                   <s-text type="strong">Controls</s-text>

//                   <s-text-field
//                     label="Internal name"
//                     value={name}
//                     onChange={(e) => setName(e.currentTarget.value)}
//                     autocomplete="off"
//                     required
//                   />

//                   <s-select
//                     label="Bar type"
//                     value={barType}
//                     details="Sticky: fixed top. Marquee: scrolling text. Rotating: cycles messages."
//                     onChange={(e) => setBarType(e.currentTarget.value)}
//                   >
//                     <s-option value="sticky">Sticky</s-option>
//                     <s-option value="marquee">Marquee</s-option>
//                     <s-option value="rotating">Rotating</s-option>
//                   </s-select>

//                   <s-box padding="small" borderWidth="base" borderRadius="base" background="default">
//                     <s-stack direction="block" gap="small">
//                       <s-text type="strong">Quick styles</s-text>
//                       <s-paragraph>
//                         Apply a starter style for your banner examples, then fine-tune spacing/text/colors.
//                       </s-paragraph>
//                       <s-stack direction="inline" gap="small">
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => applyStylePreset("running")}
//                         >
//                           Running Bar
//                         </s-button>
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => applyStylePreset("fixed")}
//                         >
//                           Fixed / Sticky
//                         </s-button>
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => applyStylePreset("carousel")}
//                         >
//                           Carousel
//                         </s-button>
//                       </s-stack>
//                     </s-stack>
//                   </s-box>

//                   {/* ── Messages ── */} 
//                   {config.messages.map((msg, i) => (
//                     <s-text-field
//                       key={i}
//                       label={config.messages.length > 1 ? `Message ${i + 1}` : "Message"}
//                       value={msg}
//                       onChange={(e) => {
//                         const v = e.currentTarget.value;
//                         setConfig((c) => {
//                           const messages = [...c.messages];
//                           messages[i] = v;
//                           return { ...c, messages };
//                         });
//                       }}
//                       autocomplete="off"
//                     />
//                   ))}
//                   <s-stack direction="inline" gap="small">
//                     <s-button
//                       type="button"
//                       variant="secondary"
//                       onClick={() =>
//                         setConfig((c) => ({ ...c, messages: [...c.messages, ""] }))
//                       }
//                     >
//                       Add message
//                     </s-button>
//                     {config.messages.length > 1 ? (
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         tone="critical"
//                         onClick={() =>
//                           setConfig((c) => ({
//                             ...c,
//                             messages: c.messages.slice(0, -1),
//                           }))
//                         }
//                       >
//                         Remove last
//                       </s-button>
//                     ) : null}
//                   </s-stack>

//                   <s-divider />

//                   {/* ── Link & behaviour ── */}
//                   <s-text type="strong">Link & behavior</s-text>
//                   <s-text-field
//                     label="Link URL (optional)"
//                     value={config.linkUrl}
//                     onChange={(e) => {
//                       const linkUrl = e.target?.value ?? "";
//                       setConfig((c) => ({ ...c, linkUrl }));
//                     }}
//                     autocomplete="off"
//                     placeholder="https://"
//                   />
//                   <s-checkbox
//                     label="Underline link"
//                     checked={config.linkUnderline}
//                     onChange={(e) => {
//                       const checked = e.target?.checked ?? false;
//                       setConfig((c) => ({ ...c, linkUnderline: checked }));
//                     }}
//                   />
//                   <s-checkbox
//                     label="Dismissible (shopper can close)"
//                     checked={config.dismissible}
//                     onChange={(e) => {
//                       const checked = e.target?.checked ?? false;
//                       setConfig((c) => ({ ...c, dismissible: checked }));
//                     }}
//                   />

//                   {barType === "marquee" ? (
//                     <s-text-field
//                       label="Marquee duration (seconds)"
//                       type="number"
//                       min={4}
//                       max={120}
//                       value={String(config.marqueeSpeedSeconds)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           marqueeSpeedSeconds: Math.max(4, n || c.marqueeSpeedSeconds),
//                         }));
//                       }}
//                     />
//                   ) : null}

//                   {barType === "rotating" ? (
//                     <s-text-field
//                       label="Rotate every (ms)"
//                       type="number"
//                       min={1500}
//                       max={60000}
//                       step={500}
//                       value={String(config.rotateIntervalMs)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           rotateIntervalMs: Math.max(1500, n || c.rotateIntervalMs),
//                         }));
//                       }}
//                     />
//                   ) : null}

//                   <s-divider />

//                   {/* ── Colors (with pickers) ── */}
//                   <s-text type="strong">Colors</s-text>
//                   <div style={{ display: "grid"}}>
//                     <ColorPickerField
//                       label="Background"
//                       value={config.backgroundColor}
//                       onChange={(v) => setConfig((c) => ({ ...c, backgroundColor: v }))}
//                     />
//                     <ColorPickerField
//                       label="Text"
//                       value={config.textColor}
//                       onChange={(v) => setConfig((c) => ({ ...c, textColor: v }))}
//                     />
//                     <ColorPickerField
//                       label="Border"
//                       value={config.borderColor}
//                       onChange={(v) => setConfig((c) => ({ ...c, borderColor: v }))}
//                     />
//                     <s-text-field
//                       label="Border width (px)"
//                       type="number"
//                       min={0}
//                       max={16}
//                       value={String(config.borderWidthPx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           borderWidthPx: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                   </div>

//                   <s-divider />

//                   {/* ── Typography & layout ── */}
//                   <s-text type="strong">Typography & layout</s-text>
//                   <s-select
//                     label="Font"
//                     value={config.fontFamily}
//                     onChange={(e) => {
//                       const fontFamily = e.target?.value ?? "inherit";
//                       setConfig((c) => ({ ...c, fontFamily }));
//                     }}
//                   >
//                     <s-option value="inherit">Inherit theme</s-option>
//                     <s-option value="system">System UI</s-option>
//                     <s-option value="serif">Serif</s-option>
//                     <s-option value="mono">Monospace</s-option>
//                   </s-select>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Font size (px)"
//                       type="number"
//                       min={10}
//                       max={32}
//                       value={String(config.fontSizePx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           fontSizePx: Math.max(10, n || c.fontSizePx),
//                         }));
//                       }}
//                     />
//                     <s-select
//                       label="Weight"
//                       value={config.fontWeight}
//                       onChange={(e) => {
//                         const fontWeight = e.target?.value ?? "500";
//                         setConfig((c) => ({ ...c, fontWeight }));
//                       }}
//                     >
//                       <s-option value="400">400</s-option>
//                       <s-option value="500">500</s-option>
//                       <s-option value="600">600</s-option>
//                       <s-option value="700">700</s-option>
//                     </s-select>
//                   </s-grid>
//                   <s-select
//                     label="Text align"
//                     value={config.textAlign}
//                     onChange={(e) => {
//                       const textAlign = e.target?.value ?? "center";
//                       setConfig((c) => ({ ...c, textAlign }));
//                     }}
//                   >
//                     <s-option value="left">Left</s-option>
//                     <s-option value="center">Center</s-option>
//                     <s-option value="right">Right</s-option>
//                   </s-select>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Letter spacing (em)"
//                       type="number"
//                       min={0}
//                       max={0.5}
//                       step={0.01}
//                       value={String(config.letterSpacingEm)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           letterSpacingEm: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                     <s-text-field
//                       label="Line height"
//                       type="number"
//                       min={1}
//                       max={2.5}
//                       step={0.05}
//                       value={String(config.lineHeight)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           lineHeight: Math.max(1, n || c.lineHeight),
//                         }));
//                       }}
//                     />
//                   </s-grid>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Padding Y (px)"
//                       type="number"
//                       min={0}
//                       max={48}
//                       value={String(config.paddingYpx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           paddingYpx: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                     <s-text-field
//                       label="Padding X (px)"
//                       type="number"
//                       min={0}
//                       max={64}
//                       value={String(config.paddingXpx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           paddingXpx: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                   </s-grid>
//                   <s-grid gridTemplateColumns="1fr 1fr" gap="base">
//                     <s-text-field
//                       label="Corner radius (px)"
//                       type="number"
//                       min={0}
//                       max={32}
//                       value={String(config.borderRadiusPx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           borderRadiusPx: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                     <s-text-field
//                       label="Max content width (px, 0 = full)"
//                       type="number"
//                       min={0}
//                       max={1600}
//                       value={String(config.maxContentWidthPx)}
//                       onChange={(e) => {
//                         const n = Number(e.target?.value);
//                         setConfig((c) => ({
//                           ...c,
//                           maxContentWidthPx: Math.max(0, n || 0),
//                         }));
//                       }}
//                     />
//                   </s-grid>
//                   <s-select
//                     label="Shadow"
//                     value={config.shadow}
//                     onChange={(e) => {
//                       const shadow = e.target?.value ?? "none";
//                       setConfig((c) => ({ ...c, shadow }));
//                     }}
//                   >
//                     <s-option value="none">None</s-option>
//                     <s-option value="subtle">Subtle</s-option>
//                     <s-option value="medium">Medium</s-option>
//                   </s-select>

//                   <s-divider />

//                   <s-stack direction="inline" gap="base">
//                     <s-button variant="primary" type="submit">
//                       {editingBar ? "Save changes" : "Create bar"}
//                     </s-button>
//                     <s-button type="button" variant="secondary" onClick={handleClear}>
//                       Clear
//                     </s-button>
//                   </s-stack>

//                   {editingBar ? (
//                     <s-stack direction="block" gap="base">
//                       <s-paragraph>
//                         Bar ID (paste only if you want this exact bar; leave theme field empty to use your newest active
//                         bar):{" "}
//                         <s-text fontVariantNumeric="tabular-nums" type="strong">
//                           {editingBar.id}
//                         </s-text>
//                       </s-paragraph>
//                       <s-stack direction="inline" gap="small">
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => {
//                             void navigator.clipboard?.writeText(editingBar.id);
//                           }}
//                         >
//                           Copy ID
//                         </s-button>
//                       </s-stack>

                     
                      
                      
//                     </s-stack>
//                   ) : null}
//                 </s-stack>
//               </Form>
//             </s-box>

//             {/* ── Right: Live preview ── */}
//             <div
//               style={{
//                 position: "sticky",
//                 top: "12px",
//                 alignSelf: "start",
//                 maxWidth: "100%",
//               }}
//             >
//               <s-stack direction="block" gap="base">
//                 <s-stack direction="inline" gap="small" alignItems="center">
//                   <s-text type="strong">Live preview</s-text>
//                   <s-badge tone="success">Sticky column</s-badge>
//                 </s-stack>
//                 <s-text tone="neutral">
//                   {typeLabel} - this preview column stays on screen while you scroll the main page
//                   (sticky). Inside the frame, the bar stays fixed and only the sample page scrolls.
//                 </s-text>
//                 <s-box padding="none" borderWidth="base" borderRadius="base" background="base">
//                   <div
//                     style={{
//                       height: 36,
//                       background: "#e5e7eb",
//                       display: "flex",
//                       alignItems: "center",
//                       paddingLeft: 12,
//                       fontSize: 12,
//                       color: "#374151",
//                       borderBottom: "1px solid #d1d5db",
//                     }}
//                   >
//                     Storefront preview
//                   </div>
//                   <FixedAnnouncementPreviewShell
//                     barType={barType}
//                     config={config}
//                     customHtml={customHtml}
//                     customCss={customCss}
//                     customLiquid={customLiquid}
//                     shopDomain={shop}
//                   />
//                 </s-box>
//               </s-stack>
//             </div>
//           </s-grid>
//         </s-stack>
//       </s-section>

//       {/* ── Bars table ── */}
//       <s-section heading="Your bars">
//         {bars.length === 0 ? (
//           <s-box padding="large" borderWidth="base" borderRadius="base">
//             <s-text tone="neutral">No bars yet. Fill in the builder and create one.</s-text>
//           </s-box>
//         ) : (
//           <s-table variant="auto">
//             <s-table-header-row>
//               <s-table-header listSlot="primary">Name</s-table-header>
//               <s-table-header listSlot="inline">Type</s-table-header>
//               <s-table-header listSlot="labeled">ID</s-table-header>
//               <s-table-header listSlot="inline">Active</s-table-header>
//               <s-table-header listSlot="labeled">Actions</s-table-header>
//             </s-table-header-row>
//             <s-table-body>
//               {bars.map((b) => (
//                 <s-table-row key={b.id}>
//                   <s-table-cell>
//                     <s-text type="strong">{b.name}</s-text>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-badge tone="info">
//                       {(b.customLiquid ?? "").trim()
//                         ? "Custom Liquid"
//                         : (b.customHtml ?? "").trim()
//                           ? "Custom HTML"
//                           : b.barType}
//                     </s-badge>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-text fontVariantNumeric="tabular-nums">{b.id}</s-text>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-badge tone={b.active ? "success" : "neutral"}>
//                       {b.active ? "Yes" : "No"}
//                     </s-badge>
//                   </s-table-cell>
//                   <s-table-cell>
//                     <s-stack direction="inline" gap="small-100">
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         icon="edit"
//                         onClick={() =>
//                           navigate(withShopifyParams(`/app/announcement-bars?edit=${b.id}`))
//                         }
//                       >
//                         Edit
//                       </s-button>
//                       {b.active ? (
//                         <s-badge tone="success">Active on storefront</s-badge>
//                       ) : (
//                         <s-button
//                           type="button"
//                           variant="secondary"
//                           onClick={() => {
//                             const fd = new FormData();
//                             fd.set("intent", "setActive");
//                             fd.set("id", b.id);
//                             submit(fd, { method: "post" });
//                           }}
//                         >
//                           Set active
//                         </s-button>
//                       )}
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         onClick={() => void navigator.clipboard?.writeText(b.id)}
//                       >
//                         Copy ID
//                       </s-button>
//                       <s-button
//                         type="button"
//                         variant="tertiary"
//                         tone="critical"
//                         icon="delete"
//                         onClick={() => {
//                           const fd = new FormData();
//                           fd.set("intent", "delete");
//                           fd.set("id", b.id);
//                           submit(fd, { method: "post" });
//                         }}
//                       >
//                         Delete
//                       </s-button>
//                     </s-stack>
//                   </s-table-cell>
//                 </s-table-row>
//               ))}
//             </s-table-body>
//           </s-table>
//         )}
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);































import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useRouteError,
  useOutletContext,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { renderAnnouncementLiquid } from "../utils/announcementLiquid";
import { defaultConfig, parseConfig } from "../lib/announcement-bar-config.js";
import {
  generateAnnouncementSectionHtmlId,
  normalizeAnnouncementSectionHtmlId,
} from "../lib/announcement-section-html-id.js";
import {
  resolveSectionHtmlIdFromHeader,
} from "../lib/announcement-header-template.js";
import {
  loadAnnouncementHeaderAdminContext,
  handleAnnouncementHeaderAdminAction,
} from "../lib/announcements-admin.server.js";
import {
  loadShopBillingContext,
  rejectIfDeleteNotAllowed,
} from "../lib/app-billing.server.js";
import {
  PlanGatedDeleteTooltip,
  useBillingUpgradeHref,
} from "../components/plan-gated-delete.jsx";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const ANNOUNCEMENT_STYLE_PRESETS = [
  {
    id: "scrolling",
    title: "Scrolling bar",
    description: "Full-width marquee with continuous motion.",
    barType: "marquee",
    messages: ["🔥 HOT SALE"],
    config: {
      backgroundColor: "#000000",
      textColor: "#ffffff",
      borderColor: "transparent",
      borderWidthPx: 0,
      fontWeight: "700",
      fontFamily: "system",
      textAlign: "center",
      paddingYpx: 12,
      paddingXpx: 18,
      borderRadiusPx: 0,
      shadow: "none",
      marqueeSpeedSeconds: 18,
      linkUnderline: false,
      dismissible: false,
      ctaLabel: "",
      linkUrl: "",
    },
  },
  {
    id: "rotating",
    title: "Rotating bar",
    description: "Soft gradient with multiple sliding messages.",
    barType: "rotating",
    messages: [
      "For a limited time, enjoy a 20% discount on all our products!",
      "Free shipping on qualifying orders this week.",
    ],
    config: {
      backgroundColor: "linear-gradient(90deg, #00E5FF 0%, #B39DDB 100%)",
      textColor: "#ffffff",
      borderColor: "transparent",
      borderWidthPx: 0,
      fontWeight: "600",
      fontFamily: "system",
      textAlign: "center",
      paddingYpx: 14,
      paddingXpx: 20,
      borderRadiusPx: 0,
      shadow: "subtle",
      rotateIntervalMs: 5000,
      linkUnderline: false,
      dismissible: false,
      ctaLabel: "",
      linkUrl: "",
    },
  },
  {
    id: "simple",
    title: "Simple bar + CTA",
    description: "Minimal bar with a coral call-to-action button.",
    barType: "sticky",
    messages: ["For a limited time, enjoy a 20% discount on all our products!"],
    config: {
      backgroundColor: "#2C2E43",
      textColor: "#ffffff",
      borderColor: "transparent",
      borderWidthPx: 0,
      fontWeight: "500",
      fontFamily: "system",
      textAlign: "left",
      paddingYpx: 12,
      paddingXpx: 20,
      borderRadiusPx: 0,
      shadow: "none",
      linkUrl: "/collections/all",
      linkUnderline: false,
      dismissible: false,
      ctaLabel: "Shop now!",
      ctaBackgroundColor: "#EF5350",
    },
  },
];

function shadowCss(shadow) {
  if (shadow === "subtle") return "0 1px 2px rgba(0,0,0,0.08)";
  if (shadow === "medium") return "0 4px 14px rgba(0,0,0,0.14)";
  return "none";
}

function fontStackCss(family) {
  if (!family || family === "inherit") return "inherit";
  if (family === "system") return "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  if (family === "serif") return 'Georgia, "Times New Roman", serif';
  if (family === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
  return family;
}

function readInputText(e, fallback = "") {
  const raw = e?.target?.value ?? e?.currentTarget?.value ?? e?.detail?.value ?? fallback;
  return String(raw ?? "").replace(/[\u0000-\u001F\u007F]/g, "");
}

function readStrictNumber(e, fallback) {
  const raw = readInputText(e, "");
  if (raw.trim() === "") return fallback;
  if (!/^-?\d*(\.\d*)?$/.test(raw.trim())) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function previewBarStyle(cfg) {
  const bg = String(cfg.backgroundColor ?? "").trim();
  const useCssBackground = /gradient\s*\(/i.test(bg) || /^url\s*\(/i.test(bg);
  return {
    ...(useCssBackground
      ? { background: bg, backgroundColor: "transparent" }
      : { backgroundColor: bg }),
    color: cfg.textColor,
    borderStyle: cfg.borderWidthPx > 0 ? "solid" : "none",
    borderColor: cfg.borderWidthPx > 0 ? cfg.borderColor : "transparent",
    borderWidth: cfg.borderWidthPx > 0 ? `${cfg.borderWidthPx}px` : 0,
    fontSize: `${cfg.fontSizePx}px`,
    fontWeight: cfg.fontWeight,
    fontFamily: fontStackCss(cfg.fontFamily),
    textAlign: cfg.textAlign,
    padding: `${cfg.paddingYpx}px ${cfg.paddingXpx}px`,
    borderRadius: `${cfg.borderRadiusPx}px`,
    boxShadow: shadowCss(cfg.shadow),
    letterSpacing: cfg.letterSpacingEm ? `${cfg.letterSpacingEm}em` : "normal",
    lineHeight: cfg.lineHeight,
    width: "100%",
    boxSizing: "border-box",
  };
}

// Converts any hex (3 or 6 digit) to a 6-digit #rrggbb string for <input type="color">
function toPickerHex(value) {
  const v = String(value || "").trim();
  const six = /^#[0-9a-fA-F]{6}$/;
  const three = /^#[0-9a-fA-F]{3}$/;
  if (six.test(v)) return v;
  if (three.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return "#" + r + r + g + g + b + b;
  }
  return "#000000";
}

function isValidHex(v) {
  const re = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
  return re.test(String(v).trim());
}

function isCssBackgroundPaint(value) {
  const s = String(value || "").trim().toLowerCase();
  return (
    s.startsWith("linear-gradient") ||
    s.startsWith("radial-gradient") ||
    s.startsWith("url(")
  );
}

function PresetThumbnail({ preset }) {
  const cfg = useMemo(
    () => ({
      ...defaultConfig(),
      ...preset.config,
      messages: [...preset.messages],
    }),
    [preset],
  );
  const style = previewBarStyle(cfg);
  const sample = (cfg.messages[0] || "Preview").slice(0, 48);
  const thumbBase = {
    ...style,
    fontSize: 11,
    padding: "8px 10px",
    minHeight: 42,
    borderRadius: 8,
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  if (preset.barType === "marquee") {
    return (
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(15, 23, 42, 0.1)",
          background: "#fff",
        }}
      >
        <style>{`
          @keyframes ab-thumb-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div style={{ ...thumbBase, display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              whiteSpace: "nowrap",
              animation: "ab-thumb-marquee 5s linear infinite",
            }}
          >
            <span>{sample}</span>
            <span style={{ margin: "0 0.5em", opacity: 0.5 }}>·</span>
            <span>{sample}</span>
            <span style={{ margin: "0 0.5em", opacity: 0.5 }}>·</span>
          </div>
        </div>
      </div>
    );
  }

  if (preset.barType === "rotating") {
    return (
      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(15, 23, 42, 0.1)",
          background: "#fff",
        }}
      >
        <div
          style={{
            ...thumbBase,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            textAlign: "center",
          }}
        >
          <span style={{ opacity: 0.65, fontSize: 14 }}>‹</span>
          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>{sample}</span>
          <span style={{ opacity: 0.65, fontSize: 14 }}>›</span>
        </div>
      </div>
    );
  }

  const cta = String(cfg.ctaLabel || "").trim();
  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(15, 23, 42, 0.1)",
        background: "#fff",
      }}
    >
      <div
        style={{
          ...thumbBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ flex: "1 1 120px", minWidth: 0, lineHeight: 1.25, textAlign: "left" }}>
          {sample}
        </span>
        {cta && cfg.linkUrl ? (
          <span
            style={{
              flex: "0 0 auto",
              backgroundColor: cfg.ctaBackgroundColor || "#EF5350",
              color: "#fff",
              fontWeight: 600,
              fontSize: 10,
              padding: "4px 10px",
              borderRadius: 5,
            }}
          >
            {cta}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DesignPickerModal({ open, onClose, onPick, presets }) {
  const dialogRef = useRef(null);

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

  return (
    <dialog
      ref={dialogRef}
      className="ab-design-dialog"
      aria-labelledby="ab-design-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ab-design-dialog__panel" onClick={(e) => e.stopPropagation()}>
        <div className="ab-design-dialog__head">
          <div>
            <h2 id="ab-design-dialog-title" className="ab-design-dialog__title">
              Choose a base design
            </h2>
            <p className="ab-design-dialog__sub">
              Pick a starting point. You can fine-tune behavior, copy, and colors in the panels
              below.
            </p>
          </div>
          <button type="button" className="ab-design-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ab-design-dialog__grid">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="ab-design-dialog__card"
              onClick={() => onPick(preset.id)}
            >
              <PresetThumbnail preset={preset} />
              <span className="ab-design-dialog__card-title">{preset.title}</span>
              <span className="ab-design-dialog__card-desc">{preset.description}</span>
            </button>
          ))}
        </div>
        {/* <div className="ab-design-dialog__footer">
          <button type="button" className="ab-design-dialog__skip" onClick={onClose}>
            Skip - configure from scratch
          </button>
        </div> */}
      </div>
    </dialog>
  );
}

function DeleteConfirmModal({ open, onClose, onConfirm, barName }) {
  const dialogRef = useRef(null);

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

  return (
    <dialog
      ref={dialogRef}
      className="ab-design-dialog"
      aria-labelledby="ab-delete-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ab-design-dialog__panel" onClick={(e) => e.stopPropagation()}>
        <div className="ab-design-dialog__head">
          <div>
            <h2 id="ab-delete-dialog-title" className="ab-design-dialog__title">
              Delete announcement bar?
            </h2>
            <p className="ab-design-dialog__sub">
              {barName ? `This will permanently delete "${barName}".` : "This action cannot be undone."}
            </p>
          </div>
          <button type="button" className="ab-design-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ab-design-dialog__footer">
          <s-stack direction="inline" gap="small">
            <s-button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </s-button>
            <s-button type="button" variant="primary" tone="critical" onClick={onConfirm}>
              Delete
            </s-button>
          </s-stack>
        </div>
      </div>
    </dialog>
  );
}

function AnnouncementCreateModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  isEditing,
  activeTab,
  setActiveTab,
  showLinksTab,
  name,
  setName,
  barType,
  setBarType,
  sectionHtmlId,
  setSectionHtmlId,
  config,
  setConfig,
  customHtml,
  setCustomHtml,
  customLiquid,
  setCustomLiquid,
  customCss,
  setCustomCss,
  shop,
}) {
  const dialogRef = useRef(null);

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

  return (
    <dialog
      ref={dialogRef}
      className="ab-design-dialog"
      aria-labelledby="ab-create-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ab-design-dialog__panel" onClick={(e) => e.stopPropagation()}>
        <div className="ab-design-dialog__head">
          <div>
            <h2 id="ab-create-dialog-title" className="ab-design-dialog__title">
              {isEditing ? "Update announcement bar" : "Create announcement bar"}
            </h2>
            <p className="ab-design-dialog__sub">
              Customize the selected template using tabs with a live storefront preview.
            </p>
          </div>
          <button type="button" className="ab-design-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 22px",
            borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          }}
        >
          <s-button
            type="button"
            variant={activeTab === "messages" ? "primary" : "secondary"}
            onClick={() => setActiveTab("messages")}
          >
            Messages
          </s-button>
          <s-button
            type="button"
            variant={activeTab === "look" ? "primary" : "secondary"}
            onClick={() => setActiveTab("look")}
          >
            Look & Layout
          </s-button>
          {showLinksTab ? (
            <s-button
              type="button"
              variant={activeTab === "links" ? "primary" : "secondary"}
              onClick={() => setActiveTab("links")}
            >
              Links, CTA & Code
            </s-button>
          ) : null}
        </div>
        <div className="ab-builder-grid" style={{ padding: "16px 22px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-text-field
                label="Internal name"
                value={name}
                onChange={(e) => setName(readInputText(e, ""))}
                autocomplete="off"
                required
              />
              <s-text-field
                label="Section HTML ID"
                value={sectionHtmlId}
                details="Auto-generated ID (read-only)."
                autocomplete="off"
                readonly
              />

              {activeTab === "messages" ? (
                <>
                  <div className="ab-behavior-grid">
                    <button
                      type="button"
                      className={"ab-behavior-tile" + (barType === "sticky" ? " ab-behavior-tile--on" : "")}
                      onClick={() => setBarType("sticky")}
                    >
                      <span className="ab-behavior-tile__k">Pinned</span>
                      <span className="ab-behavior-tile__t">Sticky</span>
                    </button>
                    <button
                      type="button"
                      className={"ab-behavior-tile" + (barType === "marquee" ? " ab-behavior-tile--on" : "")}
                      onClick={() => setBarType("marquee")}
                    >
                      <span className="ab-behavior-tile__k">Motion</span>
                      <span className="ab-behavior-tile__t">Scrolling</span>
                    </button>
                    <button
                      type="button"
                      className={"ab-behavior-tile" + (barType === "rotating" ? " ab-behavior-tile--on" : "")}
                      onClick={() => setBarType("rotating")}
                    >
                      <span className="ab-behavior-tile__k">Rotate</span>
                      <span className="ab-behavior-tile__t">Slides</span>
                    </button>
                  </div>
                  {barType === "marquee" ? (
                    <s-text-field
                      label="Marquee duration (seconds)"
                      type="number"
                      min={4}
                      max={120}
                      value={String(config.marqueeSpeedSeconds)}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          marqueeSpeedSeconds: Math.max(4, readStrictNumber(e, c.marqueeSpeedSeconds)),
                        }))
                      }
                    />
                  ) : null}
                  {barType === "marquee" ? (
                    <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                      <s-text-field
                        label="Separator icon"
                        value={String(config.marqueeSeparatorIcon ?? "•")}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            marqueeSeparatorIcon:
                              readInputText(e, "•").trim() || "•",
                          }))
                        }
                      />
                      <s-text-field
                        label="Separator spacing (px)"
                        type="number"
                        min={0}
                        max={80}
                        value={String(config.marqueeSeparatorGapPx ?? 16)}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            marqueeSeparatorGapPx: Math.max(0, readStrictNumber(e, c.marqueeSeparatorGapPx ?? 16)),
                          }))
                        }
                      />
                    </s-grid>
                  ) : null}
                  {barType === "marquee" ? (
                    <s-checkbox
                      label="Pause marquee on mouse hover"
                      checked={config.marqueePauseOnHover === true}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, marqueePauseOnHover: e.target?.checked ?? false }))
                      }
                    />
                  ) : null}
                  {barType === "rotating" ? (
                    <s-text-field
                      label="Rotate every (ms)"
                      type="number"
                      min={1500}
                      max={60000}
                      step={500}
                      value={String(config.rotateIntervalMs)}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          rotateIntervalMs: Math.max(1500, readStrictNumber(e, c.rotateIntervalMs)),
                        }))
                      }
                    />
                  ) : null}
                  <s-checkbox
                    label="Dismissible (shopper can close)"
                    checked={config.dismissible}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, dismissible: e.target?.checked ?? false }))
                    }
                  />
                  {config.messages.map((msg, i) => (
                    <s-stack key={i} direction="inline" gap="small" alignItems="end">
                      <div style={{ flex: 1 }}>
                        <s-text-field
                          id={`ab-message-${i}`}
                          label={config.messages.length > 1 ? `Message ${i + 1}` : "Message"}
                          value={msg}
                          onChange={(e) =>
                            setConfig((c) => {
                              const messages = [...c.messages];
                              const nextValue = readInputText(e, "");
                              messages[i] = nextValue;
                              return { ...c, messages };
                            })
                          }
                        />
                      </div>
                      <s-button
                        type="button"
                        variant="tertiary"
                        onClick={() => {
                          const el = document.getElementById(`ab-message-${i}`);
                          if (el && typeof el.focus === "function") el.focus();
                        }}
                      >
                        Edit
                      </s-button>
                      <s-button
                        type="button"
                        variant="tertiary"
                        tone="critical"
                        onClick={() =>
                          setConfig((c) => {
                            const messages = c.messages.filter((_, idx) => idx !== i);
                            return { ...c, messages: messages.length ? messages : [""] };
                          })
                        }
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  ))}
                  <s-stack direction="inline" gap="small">
                    <s-button
                      type="button"
                      variant="secondary"
                      onClick={() => setConfig((c) => ({ ...c, messages: [...c.messages, ""] }))}
                    >
                      Add message
                    </s-button>
                  </s-stack>
                </>
              ) : null}

              {activeTab === "look" ? (
                <>
                  <ColorPickerField
                    label="Background"
                    value={config.backgroundColor}
                    onChange={(v) => setConfig((c) => ({ ...c, backgroundColor: v }))}
                  />
                  <ColorPickerField
                    label="Text"
                    value={config.textColor}
                    onChange={(v) => setConfig((c) => ({ ...c, textColor: v }))}
                  />
                  <ColorPickerField
                    label="Border"
                    value={config.borderColor}
                    onChange={(v) => setConfig((c) => ({ ...c, borderColor: v }))}
                  />
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Border width (px)"
                      type="number"
                      min={0}
                      max={16}
                      value={String(config.borderWidthPx)}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, borderWidthPx: Math.max(0, readStrictNumber(e, c.borderWidthPx)) }))
                      }
                    />
                    <s-text-field
                      label="Font size (px)"
                      type="number"
                      min={10}
                      max={32}
                      value={String(config.fontSizePx)}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          fontSizePx: Math.max(10, readStrictNumber(e, c.fontSizePx)),
                        }))
                      }
                    />
                  </s-grid>
                  <s-select
                    label="Font"
                    value={config.fontFamily}
                    onChange={(e) => setConfig((c) => ({ ...c, fontFamily: e.target?.value ?? "inherit" }))}
                  >
                    <s-option value="inherit">Inherit theme</s-option>
                    <s-option value="system">System UI</s-option>
                    <s-option value="serif">Serif</s-option>
                    <s-option value="mono">Monospace</s-option>
                  </s-select>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Padding Y (px)"
                      type="number"
                      min={0}
                      max={48}
                      value={String(config.paddingYpx)}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, paddingYpx: Math.max(0, readStrictNumber(e, c.paddingYpx)) }))
                      }
                    />
                    <s-text-field
                      label="Padding X (px)"
                      type="number"
                      min={0}
                      max={64}
                      value={String(config.paddingXpx)}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, paddingXpx: Math.max(0, readStrictNumber(e, c.paddingXpx)) }))
                      }
                    />
                  </s-grid>
                </>
              ) : null}

              {activeTab === "links" && showLinksTab ? (
                <>
                  <s-text-field
                    label="Link URL (optional)"
                    value={config.linkUrl}
                    onChange={(e) => setConfig((c) => ({ ...c, linkUrl: readInputText(e, "") }))}
                    placeholder="https://"
                  />
                  <s-checkbox
                    label="Underline link"
                    checked={config.linkUnderline}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, linkUnderline: e.target?.checked ?? false }))
                    }
                  />
                  <s-text-field
                    label="CTA button label (optional)"
                    value={config.ctaLabel ?? ""}
                    onChange={(e) => setConfig((c) => ({ ...c, ctaLabel: readInputText(e, "") }))}
                  />
                  <ColorPickerField
                    label="CTA button color"
                    value={config.ctaBackgroundColor || "#EF5350"}
                    onChange={(v) => setConfig((c) => ({ ...c, ctaBackgroundColor: v }))}
                  />
                  {/* <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                    Custom Liquid
                  </label>
                  <textarea
                    value={customLiquid}
                    onChange={(e) => setCustomLiquid(e.currentTarget.value)}
                    rows={4}
                    style={{ width: "100%", boxSizing: "border-box", fontFamily: "ui-monospace, monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid #c9cccf", resize: "vertical" }}
                    spellCheck={false}
                  />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                    Custom HTML
                  </label>
                  <textarea
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.currentTarget.value)}
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", fontFamily: "ui-monospace, monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid #c9cccf", resize: "vertical" }}
                    spellCheck={false}
                  />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                    Custom CSS
                  </label>
                  <textarea
                    value={customCss}
                    onChange={(e) => setCustomCss(e.currentTarget.value)}
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", fontFamily: "ui-monospace, monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid #c9cccf", resize: "vertical" }}
                    spellCheck={false}
                  /> */}
                </>
              ) : null}
            </s-stack>
          </s-box>
          <div style={{ position: "sticky", top: 8, alignSelf: "start", maxWidth: "100%" }}>
            <s-stack direction="block" gap="base">
              <s-text type="strong">Live preview</s-text>
              <div className="ab-preview-shell">
                <s-box padding="none" borderWidth="base" borderRadius="base" background="base">
                  <div
                    style={{
                      height: 40,
                      background: "linear-gradient(90deg, #6366f1 0%, #a78bfa 45%, #38bdf8 100%)",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    Storefront preview
                  </div>
                  <FixedAnnouncementPreviewShell
                    barType={barType}
                    config={config}
                    customHtml={customHtml}
                    customCss={customCss}
                    customLiquid={customLiquid}
                    shopDomain={shop}
                    sectionHtmlId={sectionHtmlId}
                  />
                </s-box>
              </div>
            </s-stack>
          </div>
        </div>
        <div className="ab-design-dialog__footer">
          <s-stack direction="inline" gap="small">
            <s-button type="button" variant="primary" onClick={onSubmit}>
              {isEditing ? "Save changes" : "Save"}
            </s-button>
            {/* {isEditing ? (
              <s-button type="button" variant="secondary" tone="critical" onClick={onDelete}>
                Delete
              </s-button>
            ) : null} */}
            <s-button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </s-button>
          </s-stack>
        </div>
      </div>
    </dialog>
  );
}

// ── ColorPickerField ──────────────────────────────────────────────────────────
// Clickable colour swatch + hex text input, kept in sync. Clicking the swatch
// opens the native OS colour picker.
function ColorPickerField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(value);

  // Keep draft in sync when parent resets (e.g. loading a different bar)
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const pickerHex = toPickerHex(value);
  const swatchFill = isCssBackgroundPaint(value) ? String(value).trim() : pickerHex;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: "5px 10px 5px 6px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        {/* Clickable swatch */}
        <span
          title={
            isCssBackgroundPaint(value)
              ? "Pick a solid color (replaces gradient)"
              : "Pick a colour"
          }
          style={{
            display: "inline-block",
            position: "relative",
            width: 30,
            height: 30,
            borderRadius: 7,
            background: swatchFill,
            border: "2px solid #e5e7eb",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
            flexShrink: 0,
            cursor: "pointer",
            transition: "transform 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <input
            ref={inputRef}
            type="color"
            value={pickerHex}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              onChange(v);
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
              border: "none",
              padding: 0,
            }}
            aria-label={`${label} color picker`}
          />
        </span>

        {/* Editable hex text */}
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (isValidHex(v)) onChange(v.trim());
          }}
          onBlur={() => {
            if (!isValidHex(draft)) setDraft(value);
          }}
          maxLength={7}
          placeholder="#000000"
          style={{
            border: "none",
            outline: "none",
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            color: "#111827",
            flex: 1,
            minWidth: 0,
            background: "transparent",
            letterSpacing: "0.04em",
          }}
        />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementPreview({
  barType,
  config,
  customHtml = "",
  customCss = "",
  customLiquid = "",
  shopDomain = "",
  sectionHtmlId = "",
}) {
  const [rotIndex, setRotIndex] = useState(0);
  const [liquidRendered, setLiquidRendered] = useState(null);
  const liquidTrim = customLiquid.trim();

  useEffect(() => {
    if (!liquidTrim) {
      setLiquidRendered(null);
      return undefined;
    }
    let cancelled = false;
    setLiquidRendered(null);
    renderAnnouncementLiquid(customLiquid, shopDomain)
      .then((html) => {
        if (!cancelled) setLiquidRendered(html ?? "");
      })
      .catch(() => {
        if (!cancelled) setLiquidRendered(null);
      });
    return () => {
      cancelled = true;
    };
  }, [customLiquid, liquidTrim, shopDomain]);

  const effectiveHtml = liquidTrim
    ? liquidRendered !== null && String(liquidRendered).trim()
      ? String(liquidRendered)
      : customHtml
    : customHtml;
  const trimmedCustom = effectiveHtml.trim();

  useEffect(() => {
    if (trimmedCustom || barType !== "rotating" || config.messages.length <= 1) return undefined;
    const t = setInterval(() => {
      setRotIndex((i) => (i + 1) % config.messages.length);
    }, config.rotateIntervalMs);
    return () => clearInterval(t);
  }, [trimmedCustom, barType, config.rotateIntervalMs, config.messages.length]);

  useEffect(() => {
    setRotIndex(0);
  }, [trimmedCustom, barType, config.messages]);

  const style = previewBarStyle(config);
  const maxInner =
    config.maxContentWidthPx > 0
      ? { maxWidth: config.maxContentWidthPx, marginLeft: "auto", marginRight: "auto" }
      : {};

  const linkify = (text) => {
    const url =
      barType === "sticky" && String(config.ctaLabel ?? "").trim() && config.linkUrl
        ? ""
        : config.linkUrl;
    if (!url) return text;
    return (
      <a
        href={url}
        style={{
          color: "inherit",
          textDecoration: config.linkUnderline ? "underline" : "none",
        }}
        onClick={(e) => e.preventDefault()}
      >
        {text}
      </a>
    );
  };

  const stackAlignItems =
    config.textAlign === "left" || config.textAlign === "start"
      ? "start"
      : config.textAlign === "right" || config.textAlign === "end"
        ? "end"
        : "center";

  const messageCount = Array.isArray(config.messages) ? config.messages.length : 1;
  const messageStackGap = messageCount > 4 ? 10 : messageCount > 2 ? 12 : 14;

  const messageLineStyle = {
    boxSizing: "border-box",
    width: "fit-content",
    maxWidth: "100%",
    maxInlineSize: "100%",
    minInlineSize: 0,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };

  let body = null;
  if (trimmedCustom) {
    body = (
      <div style={{ width: "100%" }} dangerouslySetInnerHTML={{ __html: trimmedCustom }} />
    );
  } else if (barType === "marquee") {
    const sepIcon = String(config.marqueeSeparatorIcon ?? "•").trim() || "•";
    const sepPad = Math.max(0, Number(config.marqueeSeparatorGapPx) || 16) / 2;
    const segment = (
      <>
        {config.messages.map((msg, i) => (
          <span key={`mq-${i}`} style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}>{linkify(msg)}</span>
            <span
              aria-hidden="true"
              style={{ display: "inline-flex", alignItems: "center", paddingInline: sepPad, opacity: 0.8 }}
            >
              {sepIcon}
            </span>
          </span>
        ))}
      </>
    );
    const doubled = (
      <>
        {segment}
        {segment}
      </>
    );
    body = (
      <div style={{ overflow: "hidden", width: "100%" }}>
        <div
          style={{
            display: "inline-flex",
            whiteSpace: "nowrap",
            animation: `sceAbPreviewMarquee ${config.marqueeSpeedSeconds}s linear infinite`,
          }}
        >
          {doubled}
        </div>
      </div>
    );
  } else if (barType === "rotating") {
    const msg = config.messages[rotIndex] ?? "";
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: stackAlignItems,
          gap: 0,
          width: "100%",
          minWidth: 0,
        }}
      >
        <div style={messageLineStyle}>{linkify(msg)}</div>
      </div>
    );
  } else {
    const stackInner = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: stackAlignItems,
          gap: messageStackGap,
          width: "100%",
          minWidth: 0,
        }}
      >
        {config.messages.map((msg, i) => (
          <div key={i} style={messageLineStyle}>
            {linkify(msg)}
          </div>
        ))}
      </div>
    );
    const ctaTrim = String(config.ctaLabel ?? "").trim();
    const hasCta = Boolean(ctaTrim && config.linkUrl);
    body = hasCta ? (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          width: "100%",
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>{stackInner}</div>
        <a
          href={config.linkUrl}
          onClick={(e) => e.preventDefault()}
          style={{
            flex: "0 0 auto",
            backgroundColor: config.ctaBackgroundColor || "#EF5350",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9em",
            padding: "6px 14px",
            borderRadius: 6,
            textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "opacity 0.15s ease, transform 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.92";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "none";
          }}
        >
          {ctaTrim}
        </a>
      </div>
    ) : (
      stackInner
    );
  }

  return (
    <>
      {customCss.trim() ? <style>{customCss}</style> : null}
      <style>{`
        @keyframes sceAbPreviewMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <section
        id={normalizeAnnouncementSectionHtmlId(sectionHtmlId) || undefined}
        aria-label="Announcement"
        style={style}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...maxInner }}>
          {barType === "rotating" && !trimmedCustom && config.messages.length > 1 ? (
            <button
              type="button"
              aria-label="Previous announcement"
              onClick={() =>
                setRotIndex((i) => (i - 1 + config.messages.length) % config.messages.length)
              }
              style={{
                flex: "0 0 auto",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "inherit",
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
              }}
            >
              ‹
            </button>
          ) : null}
          <div
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              ...(barType === "marquee" && !trimmedCustom ? { overflow: "hidden" } : {}),
            }}
          >
            {body}
          </div>
          {barType === "rotating" && !trimmedCustom && config.messages.length > 1 ? (
            <button
              type="button"
              aria-label="Next announcement"
              onClick={() => setRotIndex((i) => (i + 1) % config.messages.length)}
              style={{
                flex: "0 0 auto",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "inherit",
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
              }}
            >
              ›
            </button>
          ) : null}
          {config.dismissible ? (
            <span
              style={{
                opacity: 0.5,
                cursor: "default",
                fontSize: "1.1em",
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Preview only"
            >
              ×
            </span>
          ) : null}
        </div>
      </section>
    </>
  );
}

function FixedAnnouncementPreviewShell({
  barType,
  config,
  customHtml = "",
  customCss = "",
  customLiquid = "",
  shopDomain = "",
  sectionHtmlId = "",
}) {
  const barWrapRef = useRef(null);
  const [barHeight, setBarHeight] = useState(48);

  useIsomorphicLayoutEffect(() => {
    const el = barWrapRef.current;
    if (!el) return undefined;
    const measure = () => {
      const h = el.offsetHeight;
      if (h > 0) setBarHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [barType, customHtml, customCss, customLiquid, shopDomain, config, sectionHtmlId]);

  return (
    <div
      style={{
        position: "relative",
        height: 200,
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #f1f5f9 100%)",
        overflow: "hidden",
        borderRadius: "0 0 12px 12px",
      }}
    >
      <div
        ref={barWrapRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          borderBottom: "1px solid rgba(15, 23, 42, 0.12)",
          boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
        }}
      >
        <AnnouncementPreview
          barType={barType}
          config={config}
          customHtml={customHtml}
          customCss={customCss}
          customLiquid={customLiquid}
          shopDomain={shopDomain}
          sectionHtmlId={sectionHtmlId}
        />
      </div>
      <div
        role="region"
        aria-label="Scrollable storefront preview"
        tabIndex={0}
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: barHeight,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          boxSizing: "border-box",
          outline: "none",
        }}
      >
         
      </div>
    </div>
  );
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");
  return loadAnnouncementHeaderAdminContext(session.shop, editId);
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const billingPlan = await loadShopBillingContext(billing);
  const form = await request.formData();
  if (String(form.get("intent") || "") === "delete") {
    const deleteBlock = rejectIfDeleteNotAllowed(billingPlan.planId);
    if (deleteBlock) return deleteBlock;
  }
  return handleAnnouncementHeaderAdminAction(session.shop, form);
};

export function AnnouncementHeaderAdmin({
  loaderData,
  routePrefix = "/app/announcement-bars",
  showTable = true,
  navigateQueryStyle = "standalone",
}) {
  const { shop, bars, editingBar, pendingHeaderCreate } = loaderData;
  const { billingPlan } = useOutletContext() || {};
  const canDeleteRecords = Boolean(billingPlan?.isPremium);
  const billingUpgradeHref = useBillingUpgradeHref();
  const actionData = useActionData();
  const location = useLocation();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [name, setName] = useState(editingBar?.name ?? "");
  const [barType, setBarType] = useState(editingBar?.barType ?? "sticky");
  const [config, setConfig] = useState(() =>
    editingBar ? parseConfig(editingBar.configJson) : defaultConfig(),
  );
  const [customHtml, setCustomHtml] = useState(() => editingBar?.customHtml ?? "");
  const [customLiquid, setCustomLiquid] = useState(() => editingBar?.customLiquid ?? "");
  const [customCss, setCustomCss] = useState(() => editingBar?.customCss ?? "");
  const [sectionHtmlId, setSectionHtmlId] = useState(() => {
    if (!editingBar) return generateAnnouncementSectionHtmlId();
    return resolveSectionHtmlIdFromHeader(editingBar);
  });

  const editKey = editingBar?.id ?? "__new__";

  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createActiveTab, setCreateActiveTab] = useState("messages");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [tablePageSize, setTablePageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);

  useEffect(() => {
    setDesignModalOpen(false);
  }, [editKey]);

  useEffect(() => {
    if (selectedTemplateId !== "simple" && createActiveTab === "links") {
      setCreateActiveTab("messages");
    }
  }, [createActiveTab, selectedTemplateId]);

  const totalRecords = bars.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const pageStart = (currentPage - 1) * tablePageSize;
  const paginatedBars = useMemo(
    () => bars.slice(pageStart, pageStart + tablePageSize),
    [bars, pageStart, tablePageSize],
  );
  const pageEnd = Math.min(pageStart + paginatedBars.length, totalRecords);

  useEffect(() => {
    if (tablePage > totalPages) setTablePage(totalPages);
  }, [tablePage, totalPages]);


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
    if (!pendingHeaderCreate) return;
    setName("");
    setBarType("sticky");
    setConfig(defaultConfig());
    setCustomHtml("");
    setCustomLiquid("");
    setCustomCss("");
    setSectionHtmlId(generateAnnouncementSectionHtmlId());
    setCreateActiveTab("messages");
    setSelectedTemplateId("");
    setDesignModalOpen(true);
    setCreateModalOpen(false);
    navigate(withShopifyParams(`${routePrefix}?kind=header`), { replace: true });
  }, [pendingHeaderCreate, navigate, routePrefix, withShopifyParams]);

  useEffect(() => {
    if (editingBar) {
      setName(editingBar.name);
      setBarType(editingBar.barType);
      setConfig(parseConfig(editingBar.configJson));
      setCustomHtml(editingBar.customHtml ?? "");
      setCustomLiquid(editingBar.customLiquid ?? "");
      setCustomCss(editingBar.customCss ?? "");
      setSectionHtmlId(resolveSectionHtmlIdFromHeader(editingBar));
      setCreateActiveTab("messages");
      setSelectedTemplateId("");
      setCreateModalOpen(true);
    } else {
      setName("");
      setBarType("sticky");
      setConfig(defaultConfig());
      setCustomHtml("");
      setCustomLiquid("");
      setCustomCss("");
      setSectionHtmlId(generateAnnouncementSectionHtmlId());
      setSelectedTemplateId("");
      setCreateModalOpen(false);
    }
  }, [editKey]);

  useEffect(() => {
    if (actionData?.ok && actionData?.createdId) {
      setCreateModalOpen(false);
      setDesignModalOpen(false);
      // Return to list without `edit` - otherwise loader sets `editingBar` and the edit modal opens.
      const listPath =
        navigateQueryStyle === "unified" ? `${routePrefix}?kind=header` : routePrefix;
      navigate(withShopifyParams(listPath));
    }
  }, [
    actionData?.createdId,
    actionData?.ok,
    navigate,
    navigateQueryStyle,
    routePrefix,
    withShopifyParams,
  ]);

  useEffect(() => {
    if (actionData?.ok && actionData?.deleted && editingBar) {
      const cleared =
        navigateQueryStyle === "unified" ? `${routePrefix}?kind=header` : routePrefix;
      navigate(withShopifyParams(cleared));
    }
  }, [
    actionData?.deleted,
    actionData?.ok,
    editingBar,
    navigate,
    navigateQueryStyle,
    routePrefix,
    withShopifyParams,
  ]);

  const handleSave = useCallback(
    (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.set("intent", editingBar ? "update" : "create");
      if (editingBar?.id) fd.set("id", editingBar.id);
      fd.set("name", name.trim());
      fd.set("barType", barType);
      fd.set(
        "configJson",
        JSON.stringify({ ...config, sectionHtmlId: sectionHtmlId.trim() }),
      );
      fd.set("customHtml", customHtml);
      fd.set("customLiquid", customLiquid);
      fd.set("customCss", customCss);
      fd.set("templateJson", String(editingBar?.templateJson || "{}"));
      fd.set("recordKind", "header");
      submit(fd, { method: "post" });
    },
    [
      barType,
      config,
      customCss,
      customHtml,
      customLiquid,
      editingBar,
      name,
      sectionHtmlId,
      submit,
    ],
  );

  const handleClear = useCallback(() => {
    setName("");
    setBarType("sticky");
    setConfig(defaultConfig());
    setCustomHtml("");
    setCustomLiquid("");
    setCustomCss("");
    setSectionHtmlId(generateAnnouncementSectionHtmlId());
    if (editingBar) {
      const cleared =
        navigateQueryStyle === "unified" ? `${routePrefix}?kind=header` : routePrefix;
      navigate(withShopifyParams(cleared));
    }
  }, [editingBar, navigate, navigateQueryStyle, routePrefix, withShopifyParams]);

  const openCreateFlow = useCallback(() => {
    handleClear();
    setCreateActiveTab("messages");
    setSelectedTemplateId("");
    setDesignModalOpen(true);
    setCreateModalOpen(false);
  }, [handleClear]);

  const applyStylePreset = useCallback(
    (presetId) => {
      const preset = ANNOUNCEMENT_STYLE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const next = {
        ...defaultConfig(),
        ...preset.config,
        messages: [...preset.messages],
      };
      setBarType(preset.barType);
      setConfig(next);
      setCustomHtml("");
      setCustomLiquid("");
      if (!name.trim()) setName(preset.title);
    },
    [name],
  );

  return (
    <>
      <style>
        {`
        @keyframes ab-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .ab-builder-animate { animation: ab-fade-in 0.35s ease-out both; }
        .ab-hero {
          padding: clamp(1rem, 2.5vw, 1.5rem) clamp(1rem, 3vw, 1.75rem);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(56, 189, 248, 0.07) 55%, rgba(167, 139, 250, 0.09) 100%);
          border: 1px solid rgba(99, 102, 241, 0.14);
        }
        .ab-hero s-heading { margin: 0 0 0.35rem; }
        .ab-hero-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 12px; }
        .ab-builder-grid {
          display: grid;
          gap: clamp(1rem, 3vw, 1.75rem);
          grid-template-columns: 1fr;
          align-items: start;
        }
        @media (min-width: 960px) {
          .ab-builder-grid { grid-template-columns: minmax(280px, 1fr) minmax(300px, 1.08fr); }
        }
        .ab-preview-shell { border-radius: 12px; overflow: hidden; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12); }
        .ab-design-dialog {
          // width: 960px;
          // max-height: min(90vh, 720px);
          padding: 0;
          border: none;
          border-radius: 16px;
          background: transparent;
          box-shadow: none;
        }
        .ab-design-dialog::backdrop {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
        }
        .ab-design-dialog__panel {
          background: #fafbfc;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          max-height: min(90vh, 720px);
          overflow: hidden;
        }
        .ab-design-dialog__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 22px 12px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }
        .ab-design-dialog__title { margin: 0 0 6px; font-size: 1.25rem; font-weight: 600; color: #0f172a; }
        .ab-design-dialog__sub { margin: 0; font-size: 0.875rem; line-height: 1.45; color: #64748b; max-width: 44ch; }
        .ab-design-dialog__close {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.06);
          color: #334155;
          font-size: 1.35rem;
          line-height: 1;
          cursor: pointer;
        }
        .ab-design-dialog__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 16px 22px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
        @media (min-width: 700px) {
          .ab-design-dialog__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .ab-design-dialog__card {
          text-align: left;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 14px;
          padding: 12px;
          background: #fff;
          cursor: pointer;
          font: inherit;
          color: inherit;
          transition: border-color 0.18s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }
        .ab-design-dialog__card:hover {
          border-color: rgba(99, 102, 241, 0.45);
          box-shadow: 0 8px 28px rgba(99, 102, 241, 0.12);
          transform: translateY(-2px);
        }
        .ab-design-dialog__card-title { display: block; margin-top: 10px; font-weight: 600; font-size: 0.9rem; }
        .ab-design-dialog__card-desc { display: block; margin-top: 4px; font-size: 0.78rem; line-height: 1.35; color: #64748b; }
        .ab-design-dialog__footer { padding: 12px 22px 18px; border-top: 1px solid rgba(15, 23, 42, 0.06); }
        .ab-design-dialog__skip {
          width: 100%;
          padding: 10px 14px;
          border: 1px dashed rgba(15, 23, 42, 0.18);
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .ab-design-dialog__skip:hover {
          border-color: rgba(99, 102, 241, 0.35);
          color: #4338ca;
          background: rgba(99, 102, 241, 0.04);
        }
        .ab-acc { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px; padding: 0 12px 12px; margin-bottom: 10px; background: rgba(255,255,255,0.5); }
        .ab-acc__summary {
          cursor: pointer;
          font-weight: 600;
          padding: 12px 4px;
          list-style: none;
        }
        .ab-acc__summary::-webkit-details-marker { display: none; }
        .ab-acc__body { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
        .ab-behavior-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        @media (min-width: 540px) { .ab-behavior-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .ab-behavior-tile {
          padding: 12px 10px;
          border-radius: 12px;
          border: 2px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font: inherit;
          text-align: center;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .ab-behavior-tile:hover { border-color: rgba(99, 102, 241, 0.35); }
        .ab-behavior-tile--on { border-color: #6366f1; box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2); }
        .ab-behavior-tile__k { display: block; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; color: #6366f1; margin-bottom: 4px; }
        .ab-behavior-tile__t { display: block; font-weight: 600; font-size: 0.9rem; color: #0f172a; }
        .ab-behavior-tile__d { display: block; margin-top: 6px; font-size: 0.72rem; line-height: 1.35; color: #64748b; }
      `}
      </style>
      <DesignPickerModal
        open={designModalOpen}
        presets={ANNOUNCEMENT_STYLE_PRESETS}
        onClose={() => setDesignModalOpen(false)}
        onPick={(presetId) => {
          applyStylePreset(presetId);
          setSelectedTemplateId(presetId);
          setDesignModalOpen(false);
          setCreateActiveTab("messages");
          setCreateModalOpen(true);
        }}
      />
      <AnnouncementCreateModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          if (editingBar) {
            const cleared =
              navigateQueryStyle === "unified" ? `${routePrefix}?kind=header` : routePrefix;
            navigate(withShopifyParams(cleared));
          }
        }}
        onSubmit={handleSave}
        onDelete={() => {
          if (editingBar) setDeleteTarget({ id: editingBar.id, name: editingBar.name });
        }}
        isEditing={Boolean(editingBar)}
        activeTab={createActiveTab}
        setActiveTab={setCreateActiveTab}
        showLinksTab={selectedTemplateId === "simple"}
        name={name}
        setName={setName}
        barType={barType}
        setBarType={setBarType}
        sectionHtmlId={sectionHtmlId}
        setSectionHtmlId={setSectionHtmlId}
        config={config}
        setConfig={setConfig}
        customHtml={customHtml}
        setCustomHtml={setCustomHtml}
        customLiquid={customLiquid}
        setCustomLiquid={setCustomLiquid}
        customCss={customCss}
        setCustomCss={setCustomCss}
        shop={shop}
      />
      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        barName={deleteTarget?.name || ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!canDeleteRecords || !deleteTarget?.id) return;
          const fd = new FormData();
          fd.set("intent", "delete");
          fd.set("id", deleteTarget.id);
          fd.set("recordKind", "header");
          submit(fd, { method: "post" });
          setDeleteTarget(null);
        }}
      />
      {showTable ? (
      <s-page heading="Announcement bars">
      {/* ── Bars table ── */}
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
          }} type="button" variant="primary" onClick={openCreateFlow}>
            + Create Announcement Bar
          </button>
        </div>
        {bars.length === 0 ? (
          <s-box padding="large" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">No bars yet. Fill in the builder and create one.</s-text>
          </s-box>
        ) : (
          <s-table variant="auto">
            <s-table-header-row>
            <s-table-header listSlot="labeled">Section ID</s-table-header>
              <s-table-header listSlot="primary">Name</s-table-header>
              <s-table-header listSlot="inline">Type</s-table-header>
              <s-table-header listSlot="labeled">Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {paginatedBars.map((b) => (
                <s-table-row key={b.id}>
                   <s-table-cell>
                    <s-stack direction="block" gap="small-100">
                      <s-text fontVariantNumeric="tabular-nums" type="strong">
                        {resolveSectionHtmlIdFromHeader(b)}
                      </s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-text type="strong">{b.name}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-text>
                      {(b.customLiquid ?? "").trim()
                        ? "Custom Liquid"
                        : (b.customHtml ?? "").trim()
                          ? "Custom HTML"
                          : b.barType}
                    </s-text>
                  </s-table-cell>
                 
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-100">
                      <s-button
                        type="button"
                        variant="tertiary"
                        icon="edit"
                        onClick={() => {
                          const q =
                            navigateQueryStyle === "unified"
                              ? `kind=header&edit=${encodeURIComponent(b.id)}`
                              : `edit=${encodeURIComponent(b.id)}`;
                          navigate(withShopifyParams(`${routePrefix}?${q}`));
                        }}
                      >
                         
                      </s-button>
                      {/* <s-button
                        type="button"
                        variant="tertiary"
                        onClick={() => {
                          const sid = resolveSectionHtmlIdFromHeader(b);
                          void navigator.clipboard?.writeText(sid);
                        }}
                      >
                        Copy Section ID
                      </s-button> */}
                      <PlanGatedDeleteTooltip
                        canDelete={canDeleteRecords}
                        upgradeHref={billingUpgradeHref}
                      >
                        <s-button
                          type="button"
                          variant="tertiary"
                          tone="critical"
                          icon="delete"
                          disabled={!canDeleteRecords}
                          onClick={
                            canDeleteRecords
                              ? () => setDeleteTarget({ id: b.id, name: b.name })
                              : undefined
                          }
                        />
                      </PlanGatedDeleteTooltip>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
        {bars.length > 0 ? (
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
      ) : null}
    </>
  );
}

export default function AnnouncementBarsPage() {
  const data = useLoaderData();
  return (
    <AnnouncementHeaderAdmin
      loaderData={data}
      routePrefix="/app/announcement-bars"
      showTable
      navigateQueryStyle="standalone"
    />
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);