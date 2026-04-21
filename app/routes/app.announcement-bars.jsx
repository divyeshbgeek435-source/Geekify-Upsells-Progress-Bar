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
//     messages: ["Summer sale — 20% off everything", "Free shipping over $50"],
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
//           then use trackpad or wheel). The bar stays fixed at the top of the preview — only this
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
//                   {typeLabel} — this preview column stays on screen while you scroll the main page
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
//     messages: ["Summer sale — 20% off everything", "Free shipping over $50"],
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

//         {/* Hidden native colour picker — triggered by swatch click */}
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
//                   {typeLabel} — this preview column stays on screen while you scroll the main page
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
  Form,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useRouteError,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getShopifyAppClientId } from "../lib/shopify-config.server";
import { renderAnnouncementLiquid } from "../utils/announcementLiquid";
import { defaultConfig, parseConfig } from "../lib/announcement-bar-config.js";
import {
  generateAnnouncementSectionHtmlId,
  normalizeAnnouncementSectionHtmlId,
} from "../lib/announcement-section-html-id.js";

const ANNOUNCE_EMBED_HANDLE = "announcement-bar-embed";
const ANNOUNCE_BLOCK_HANDLE = "announcement-bar-block";
const ANNOUNCEMENT_STYLE_PRESETS = [
  {
    id: "running",
    title: "Running Bar",
    barType: "marquee",
    messages: ["Black Friday Sale Is Live! Enjoy Flat 20% Off On All Products."],
    config: {
      backgroundColor: "#1e3a8a",
      textColor: "#ffffff",
      borderColor: "#1e40af",
      borderWidthPx: 1,
      fontWeight: "600",
      textAlign: "left",
      paddingYpx: 12,
      paddingXpx: 20,
      borderRadiusPx: 8,
      shadow: "subtle",
      marqueeSpeedSeconds: 20,
      linkUnderline: false,
      dismissible: false,
    },
  },
  {
    id: "fixed",
    title: "Fixed / Sticky Bar",
    barType: "sticky",
    messages: ["Flash Save Alert! Everything Must Go - Save Before It Ends."],
    config: {
      backgroundColor: "#111827",
      textColor: "#f9fafb",
      borderColor: "#4b5563",
      borderWidthPx: 1,
      fontWeight: "700",
      textAlign: "left",
      paddingYpx: 12,
      paddingXpx: 20,
      borderRadiusPx: 8,
      shadow: "medium",
      linkUnderline: false,
      dismissible: false,
    },
  },
  {
    id: "carousel",
    title: "Carousel Style Bar",
    barType: "rotating",
    messages: [
      "Prices Slashed! Don't Miss Out On Major Savings.",
      "Limited-time deals updated every hour.",
      "Shop now and unlock exclusive cart rewards.",
    ],
    config: {
      backgroundColor: "#0f172a",
      textColor: "#e5e7eb",
      borderColor: "#0b3a45",
      borderWidthPx: 1,
      fontWeight: "600",
      textAlign: "left",
      paddingYpx: 12,
      paddingXpx: 20,
      borderRadiusPx: 8,
      shadow: "subtle",
      rotateIntervalMs: 3000,
      linkUnderline: false,
      dismissible: false,
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

function previewBarStyle(cfg) {
  return {
    backgroundColor: cfg.backgroundColor,
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
          onClick={() => inputRef.current && inputRef.current.click()}
          title="Pick a colour"
          style={{
            display: "inline-block",
            width: 30,
            height: 30,
            borderRadius: 7,
            background: pickerHex,
            border: "2px solid #e5e7eb",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
            flexShrink: 0,
            cursor: "pointer",
            transition: "transform 0.12s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        />

        {/* Hidden native colour picker — triggered by swatch click */}
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
            opacity: 0,
            width: 0,
            height: 0,
            border: "none",
            padding: 0,
            position: "absolute",
            pointerEvents: "none",
          }}
          tabIndex={-1}
        />

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
    if (!config.linkUrl) return text;
    return (
      <a
        href={config.linkUrl}
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
    /* En spaces + bullet (U+2022), same as storefront marquee separator */
    const sep = "\u2002\u2022\u2002";
    const text = config.messages.join(sep);
    const doubled = (
      <>
        {linkify(text)}
        {sep}
        {linkify(text)}
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
    body = (
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
          <div
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              ...(barType === "marquee" && !trimmedCustom ? { overflow: "hidden" } : {}),
            }}
          >
            {body}
          </div>
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

  useLayoutEffect(() => {
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
        height: 180,
        background: "#fafafa",
        overflow: "hidden",
        borderRadius: "0 0 6px 6px",
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
  const shop = session.shop;
  const url = new URL(request.url);
  const editId = url.searchParams.get("edit");

  const bars = await prisma.announcementBar.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });

  const editingBar = editId ? bars.find((b) => b.id === editId) ?? null : null;

  const clientId = getShopifyAppClientId();
  const storeHandle = shop.replace(/\.myshopify\.com$/i, "");
  const editorBase = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`;
  const embedQuery = new URLSearchParams({
    context: "apps",
    activateAppId: `${clientId}/${ANNOUNCE_EMBED_HANDLE}`,
  });
  const blockHeaderQuery = new URLSearchParams({
    template: "index",
    addAppBlockId: `${clientId}/${ANNOUNCE_BLOCK_HANDLE}`,
    target: "sectionGroup:header",
  });

  return {
    shop,
    bars,
    editingBar,
    announcementBarEditorUrl: `${editorBase}?${embedQuery.toString()}`,
    announcementBarBlockHeaderUrl: `${editorBase}?${blockHeaderQuery.toString()}`,
    clientIdConfigured: Boolean(clientId),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    await prisma.announcementBar.deleteMany({ where: { id, shop } });
    return { ok: true, deleted: true };
  }

  const name = String(form.get("name") || "").trim();
  const barType = String(form.get("barType") || "sticky");
  const configJson = String(form.get("configJson") || "{}");
  const customHtml = String(form.get("customHtml") ?? "");
  const customLiquid = String(form.get("customLiquid") ?? "");
  const customCss = String(form.get("customCss") ?? "");
  const id = String(form.get("id") || "");

  const cfgParsed = parseConfig(configJson);
  const sectionHtmlIdRaw = String(cfgParsed.sectionHtmlId ?? "").trim();
  const parsedSectionId = normalizeAnnouncementSectionHtmlId(sectionHtmlIdRaw);
  if (sectionHtmlIdRaw && !parsedSectionId) {
    return {
      ok: false,
      error:
        "Section HTML ID must start with a letter and only contain letters, numbers, hyphens, and underscores.",
    };
  }
  const sectionHtmlIdFinal = parsedSectionId || generateAnnouncementSectionHtmlId();

  const others = await prisma.announcementBar.findMany({
    where: { shop, ...(id ? { NOT: { id } } : {}) },
    select: { id: true, configJson: true },
  });
  for (const row of others) {
    if (parseConfig(row.configJson).sectionHtmlId === sectionHtmlIdFinal) {
      return {
        ok: false,
        error: "That section HTML ID is already used by another announcement bar in this shop.",
      };
    }
  }

  const cfgOut = { ...cfgParsed, sectionHtmlId: sectionHtmlIdFinal };
  const configJsonOut = JSON.stringify(cfgOut);

  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  if (intent === "create") {
    const created = await prisma.announcementBar.create({
      data: {
        shop,
        name,
        barType,
        configJson: configJsonOut,
        customHtml,
        customLiquid,
        customCss,
      },
    });
    return { ok: true, createdId: created.id };
  }

  if (intent === "update") {
    const result = await prisma.announcementBar.updateMany({
      where: { id, shop },
      data: {
        name,
        barType,
        configJson: configJsonOut,
        customHtml,
        customLiquid,
        customCss,
      },
    });
    if (result.count === 0) {
      return { ok: false, error: "Bar not found." };
    }
    return { ok: true };
  }

  return { ok: false, error: "Unknown action." };
};

export default function AnnouncementBarsPage() {
  const {
    shop,
    bars,
    editingBar,
    announcementBarEditorUrl,
    announcementBarBlockHeaderUrl,
    clientIdConfigured,
  } = useLoaderData();
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
    const s = parseConfig(editingBar.configJson).sectionHtmlId;
    return s || `sce-ab-${editingBar.id}`;
  });

  const editKey = editingBar?.id ?? "__new__";

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
    if (editingBar) {
      setName(editingBar.name);
      setBarType(editingBar.barType);
      setConfig(parseConfig(editingBar.configJson));
      setCustomHtml(editingBar.customHtml ?? "");
      setCustomLiquid(editingBar.customLiquid ?? "");
      setCustomCss(editingBar.customCss ?? "");
      setSectionHtmlId(
        parseConfig(editingBar.configJson).sectionHtmlId || `sce-ab-${editingBar.id}`,
      );
    } else {
      setName("");
      setBarType("sticky");
      setConfig(defaultConfig());
      setCustomHtml("");
      setCustomLiquid("");
      setCustomCss("");
      setSectionHtmlId(generateAnnouncementSectionHtmlId());
    }
  }, [editKey]);

  useEffect(() => {
    if (actionData?.ok && actionData?.createdId) {
      navigate(withShopifyParams(`/app/announcement-bars?edit=${actionData.createdId}`));
    }
  }, [actionData?.createdId, actionData?.ok, navigate, withShopifyParams]);

  useEffect(() => {
    if (actionData?.ok && actionData?.deleted && editingBar) {
      navigate(withShopifyParams("/app/announcement-bars"));
    }
  }, [actionData?.deleted, actionData?.ok, editingBar, navigate, withShopifyParams]);

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
      navigate(withShopifyParams("/app/announcement-bars"));
    }
  }, [editingBar, navigate, withShopifyParams]);

  const typeLabel = useMemo(() => {
    if (customLiquid.trim()) return "Custom Liquid";
    if (customHtml.trim()) return "Custom HTML";
    if (barType === "marquee") return "Marquee";
    if (barType === "rotating") return "Rotating";
    return "Sticky";
  }, [barType, customHtml, customLiquid]);

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
    <s-page heading="Announcement bars">
      <s-button
        slot="secondary-actions"
        variant="tertiary"
        onClick={() => navigate(withShopifyParams("/app/announcement-bars"))}
      >
        New bar
      </s-button>

      <s-section heading="Builder">
        <s-stack direction="block" gap="base">
          {!clientIdConfigured ? (
            <s-banner tone="warning" heading="Theme link may be incomplete">
                Set SHOPIFY_API_KEY in .env so the theme editor deep links (App embeds and Add block) work.
            </s-banner>
          ) : null}
          {actionData?.ok === false && actionData?.error ? (
            <s-banner tone="critical" heading="Could not save">
              {actionData.error}
            </s-banner>
          ) : null}
          <s-grid
            gridTemplateColumns="minmax(300px, 1fr) minmax(320px, 1.1fr)"
            gap="large"
            alignItems="start"
          >
            {/* ── Left: Controls ── */}
            <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
              <Form method="post" onSubmit={handleSave}>
                <s-stack direction="block" gap="base">
                  <s-text type="strong">Controls</s-text>

                  <s-text-field
                    label="Internal name"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    autocomplete="off"
                    required
                  />

                  <s-text-field
                    label="Section HTML ID"
                    value={sectionHtmlId}
                    details="One id for the whole bar on the storefront (including marquee text). Leave the generated value or set your own (letters, numbers, hyphens, underscores; must start with a letter). Merchants should paste this Section ID in the theme block."
                    onChange={(e) => setSectionHtmlId(e.currentTarget.value)}
                    autocomplete="off"
                  />

                  <s-select
                    label="Bar type"
                    value={barType}
                    details="Sticky: fixed top. Marquee: scrolling text. Rotating: cycles messages."
                    onChange={(e) => setBarType(e.currentTarget.value)}
                  >
                    <s-option value="sticky">Sticky</s-option>
                    <s-option value="marquee">Marquee</s-option>
                    <s-option value="rotating">Rotating</s-option>
                  </s-select>

                  <s-box padding="small" borderWidth="base" borderRadius="base" background="default">
                    <s-stack direction="block" gap="small">
                      <s-text type="strong">Quick styles</s-text>
                      <s-paragraph>
                        Apply a starter style for your banner examples, then fine-tune spacing/text/colors.
                      </s-paragraph>
                      <s-stack direction="inline" gap="small">
                        <s-button
                          type="button"
                          variant="secondary"
                          onClick={() => applyStylePreset("running")}
                        >
                          Running Bar
                        </s-button>
                        <s-button
                          type="button"
                          variant="secondary"
                          onClick={() => applyStylePreset("fixed")}
                        >
                          Fixed / Sticky
                        </s-button>
                        <s-button
                          type="button"
                          variant="secondary"
                          onClick={() => applyStylePreset("carousel")}
                        >
                          Carousel
                        </s-button>
                      </s-stack>
                    </s-stack>
                  </s-box>

                  {/* ── Messages ── */} 
                  {config.messages.map((msg, i) => (
                    <s-text-field
                      key={i}
                      label={config.messages.length > 1 ? `Message ${i + 1}` : "Message"}
                      value={msg}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        setConfig((c) => {
                          const messages = [...c.messages];
                          messages[i] = v;
                          return { ...c, messages };
                        });
                      }}
                      autocomplete="off"
                    />
                  ))}
                  <s-stack direction="inline" gap="small">
                    <s-button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setConfig((c) => ({ ...c, messages: [...c.messages, ""] }))
                      }
                    >
                      Add message
                    </s-button>
                    {config.messages.length > 1 ? (
                      <s-button
                        type="button"
                        variant="tertiary"
                        tone="critical"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            messages: c.messages.slice(0, -1),
                          }))
                        }
                      >
                        Remove last
                      </s-button>
                    ) : null}
                  </s-stack>

                  <s-divider />

                  {/* ── Link & behaviour ── */}
                  <s-text type="strong">Link & behavior</s-text>
                  <s-text-field
                    label="Link URL (optional)"
                    value={config.linkUrl}
                    onChange={(e) => {
                      const linkUrl = e.target?.value ?? "";
                      setConfig((c) => ({ ...c, linkUrl }));
                    }}
                    autocomplete="off"
                    placeholder="https://"
                  />
                  <s-checkbox
                    label="Underline link"
                    checked={config.linkUnderline}
                    onChange={(e) => {
                      const checked = e.target?.checked ?? false;
                      setConfig((c) => ({ ...c, linkUnderline: checked }));
                    }}
                  />
                  <s-checkbox
                    label="Dismissible (shopper can close)"
                    checked={config.dismissible}
                    onChange={(e) => {
                      const checked = e.target?.checked ?? false;
                      setConfig((c) => ({ ...c, dismissible: checked }));
                    }}
                  />

                  {barType === "marquee" ? (
                    <s-text-field
                      label="Marquee duration (seconds)"
                      type="number"
                      min={4}
                      max={120}
                      value={String(config.marqueeSpeedSeconds)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          marqueeSpeedSeconds: Math.max(4, n || c.marqueeSpeedSeconds),
                        }));
                      }}
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
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          rotateIntervalMs: Math.max(1500, n || c.rotateIntervalMs),
                        }));
                      }}
                    />
                  ) : null}

                  <s-divider />

                  {/* ── Colors (with pickers) ── */}
                  <s-text type="strong">Colors</s-text>
                  <div style={{ display: "grid"}}>
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
                    <s-text-field
                      label="Border width (px)"
                      type="number"
                      min={0}
                      max={16}
                      value={String(config.borderWidthPx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          borderWidthPx: Math.max(0, n || 0),
                        }));
                      }}
                    />
                  </div>

                  <s-divider />

                  {/* ── Typography & layout ── */}
                  <s-text type="strong">Typography & layout</s-text>
                  <s-select
                    label="Font"
                    value={config.fontFamily}
                    onChange={(e) => {
                      const fontFamily = e.target?.value ?? "inherit";
                      setConfig((c) => ({ ...c, fontFamily }));
                    }}
                  >
                    <s-option value="inherit">Inherit theme</s-option>
                    <s-option value="system">System UI</s-option>
                    <s-option value="serif">Serif</s-option>
                    <s-option value="mono">Monospace</s-option>
                  </s-select>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Font size (px)"
                      type="number"
                      min={10}
                      max={32}
                      value={String(config.fontSizePx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          fontSizePx: Math.max(10, n || c.fontSizePx),
                        }));
                      }}
                    />
                    <s-select
                      label="Weight"
                      value={config.fontWeight}
                      onChange={(e) => {
                        const fontWeight = e.target?.value ?? "500";
                        setConfig((c) => ({ ...c, fontWeight }));
                      }}
                    >
                      <s-option value="400">400</s-option>
                      <s-option value="500">500</s-option>
                      <s-option value="600">600</s-option>
                      <s-option value="700">700</s-option>
                    </s-select>
                  </s-grid>
                  <s-select
                    label="Text align"
                    value={config.textAlign}
                    onChange={(e) => {
                      const textAlign = e.target?.value ?? "center";
                      setConfig((c) => ({ ...c, textAlign }));
                    }}
                  >
                    <s-option value="left">Left</s-option>
                    <s-option value="center">Center</s-option>
                    <s-option value="right">Right</s-option>
                  </s-select>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Letter spacing (em)"
                      type="number"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={String(config.letterSpacingEm)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          letterSpacingEm: Math.max(0, n || 0),
                        }));
                      }}
                    />
                    <s-text-field
                      label="Line height"
                      type="number"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={String(config.lineHeight)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          lineHeight: Math.max(1, n || c.lineHeight),
                        }));
                      }}
                    />
                  </s-grid>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Padding Y (px)"
                      type="number"
                      min={0}
                      max={48}
                      value={String(config.paddingYpx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          paddingYpx: Math.max(0, n || 0),
                        }));
                      }}
                    />
                    <s-text-field
                      label="Padding X (px)"
                      type="number"
                      min={0}
                      max={64}
                      value={String(config.paddingXpx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          paddingXpx: Math.max(0, n || 0),
                        }));
                      }}
                    />
                  </s-grid>
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      label="Corner radius (px)"
                      type="number"
                      min={0}
                      max={32}
                      value={String(config.borderRadiusPx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          borderRadiusPx: Math.max(0, n || 0),
                        }));
                      }}
                    />
                    <s-text-field
                      label="Max content width (px, 0 = full)"
                      type="number"
                      min={0}
                      max={1600}
                      value={String(config.maxContentWidthPx)}
                      onChange={(e) => {
                        const n = Number(e.target?.value);
                        setConfig((c) => ({
                          ...c,
                          maxContentWidthPx: Math.max(0, n || 0),
                        }));
                      }}
                    />
                  </s-grid>
                  <s-select
                    label="Shadow"
                    value={config.shadow}
                    onChange={(e) => {
                      const shadow = e.target?.value ?? "none";
                      setConfig((c) => ({ ...c, shadow }));
                    }}
                  >
                    <s-option value="none">None</s-option>
                    <s-option value="subtle">Subtle</s-option>
                    <s-option value="medium">Medium</s-option>
                  </s-select>

                  <s-divider />

                  <s-stack direction="inline" gap="base">
                    <s-button variant="primary" type="submit">
                      {editingBar ? "Save changes" : "Create bar"}
                    </s-button>
                    <s-button type="button" variant="secondary" onClick={handleClear}>
                      Clear
                    </s-button>
                  </s-stack>

                  {editingBar ? (
                    <s-stack direction="block" gap="base">
                      <s-paragraph>
                        Section ID (paste this in section-ID based theme blocks):{" "}
                        <s-text fontVariantNumeric="tabular-nums" type="strong">
                          {parseConfig(editingBar.configJson).sectionHtmlId || `sce-ab-${editingBar.id}`}
                        </s-text>
                      </s-paragraph>
                      <s-stack direction="inline" gap="small">
                        <s-button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const sid =
                              parseConfig(editingBar.configJson).sectionHtmlId || `sce-ab-${editingBar.id}`;
                            void navigator.clipboard?.writeText(sid);
                          }}
                        >
                          Copy Section ID
                        </s-button>
                      </s-stack>

                     
                      
                      
                    </s-stack>
                  ) : null}
                </s-stack>
              </Form>
            </s-box>

            {/* ── Right: Live preview ── */}
            <div
              style={{
                position: "sticky",
                top: "12px",
                alignSelf: "start",
                maxWidth: "100%",
              }}
            >
              <s-stack direction="block" gap="base">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-text type="strong">Live preview</s-text>
                  <s-badge tone="success">Sticky column</s-badge>
                </s-stack>
                <s-text tone="neutral">
                  {typeLabel} — this preview column stays on screen while you scroll the main page
                  (sticky). Inside the frame, the bar stays fixed and only the sample page scrolls.
                </s-text>
                <s-box padding="none" borderWidth="base" borderRadius="base" background="base">
                  <div
                    style={{
                      height: 36,
                      background: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 12,
                      fontSize: 12,
                      color: "#374151",
                      borderBottom: "1px solid #d1d5db",
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
              </s-stack>
            </div>
          </s-grid>
        </s-stack>
      </s-section>

      {/* ── Bars table ── */}
      <s-section heading="Your bars">
        {bars.length === 0 ? (
          <s-box padding="large" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">No bars yet. Fill in the builder and create one.</s-text>
          </s-box>
        ) : (
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Name</s-table-header>
              <s-table-header listSlot="inline">Type</s-table-header>
              <s-table-header listSlot="labeled">Section ID</s-table-header>
              <s-table-header listSlot="labeled">Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {bars.map((b) => (
                <s-table-row key={b.id}>
                  <s-table-cell>
                    <s-text type="strong">{b.name}</s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone="info">
                      {(b.customLiquid ?? "").trim()
                        ? "Custom Liquid"
                        : (b.customHtml ?? "").trim()
                          ? "Custom HTML"
                          : b.barType}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="block" gap="small-100">
                      <s-text fontVariantNumeric="tabular-nums" type="strong">
                        {parseConfig(b.configJson).sectionHtmlId || `sce-ab-${b.id}`}
                      </s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-100">
                      <s-button
                        type="button"
                        variant="tertiary"
                        icon="edit"
                        onClick={() =>
                          navigate(withShopifyParams(`/app/announcement-bars?edit=${b.id}`))
                        }
                      >
                        Edit
                      </s-button>
                      <s-button
                        type="button"
                        variant="tertiary"
                        onClick={() => {
                          const sid = parseConfig(b.configJson).sectionHtmlId || `sce-ab-${b.id}`;
                          void navigator.clipboard?.writeText(sid);
                        }}
                      >
                        Copy Section ID
                      </s-button>
                      <s-button
                        type="button"
                        variant="tertiary"
                        tone="critical"
                        icon="delete"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("intent", "delete");
                          fd.set("id", b.id);
                          submit(fd, { method: "post" });
                        }}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);