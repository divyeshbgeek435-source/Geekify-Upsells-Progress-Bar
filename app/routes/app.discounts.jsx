// import { useEffect, useMemo, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useRouteError,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// const LIST_DISCOUNTS = `#graphql
//   query ListDiscountNodes($first: Int!) {
//     discountNodes(first: $first, reverse: true) {
//       nodes {
//         id
//         discount {
//           __typename
//           ... on DiscountCodeBasic {
//             title
//             status
//             startsAt
//             endsAt
//             codes(first: 1) { nodes { code } }
//           }
//           ... on DiscountAutomaticApp {
//             title
//             status
//             startsAt
//             endsAt
//             appDiscountType { functionId }
//           }
//         }
//       }
//     }
//     appDiscountTypes {
//       functionId
//       title
//       appKey
//     }
//   }
// `;

// const LIST_APP_DISCOUNT_TYPES = `#graphql
//   query ListAppDiscountTypes {
//     appDiscountTypes {
//       functionId
//       title
//       appKey
//     }
//   }
// `;

// const CREATE_CODE = `#graphql
//   mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CODE = `#graphql
//   mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const CREATE_CUSTOM = `#graphql
//   mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CUSTOM = `#graphql
//   mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_CODE = `#graphql
//   mutation DeleteCode($id: ID!) {
//     discountCodeDelete(id: $id) {
//       deletedCodeDiscountId
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_AUTOMATIC = `#graphql
//   mutation DeleteAutomatic($id: ID!) {
//     discountAutomaticDelete(id: $id) {
//       deletedAutomaticDiscountId
//       userErrors { field message }
//     }
//   }
// `;

// function makeFunctionConfig({ percentage }) {
//   return JSON.stringify({
//     discounts: [
//       {
//         value: { percentage: { value: percentage / 100 } },
//         targets: [{ orderSubtotal: { excludedVariantIds: [] } }],
//       },
//     ],
//     discountApplicationStrategy: "FIRST",
//   });
// }

// export const loader = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("editId");

//   const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
//   const json = await response.json();
//   const nodes = json?.data?.discountNodes?.nodes || [];
//   const currentAppKey = process.env.SHOPIFY_API_KEY?.trim() || null;
//   const appDiscountTypes = (json?.data?.appDiscountTypes || []).filter((t) =>
//     currentAppKey ? t?.appKey === currentAppKey : true,
//   );

//   const found = editId ? nodes.find((n) => n.id === editId) : null;
//   const discount = found?.discount;
//   const editDiscount = found
//     ? {
//         id: found.id,
//         mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
//         title: discount?.title || "",
//         code: discount?.codes?.nodes?.[0]?.code || "",
//         functionId: discount?.appDiscountType?.functionId || "",
//         startsAt: discount?.startsAt || "",
//         endsAt: discount?.endsAt || "",
//       }
//     : null;

//   return { nodes, appDiscountTypes, editDiscount, errors: json?.errors || null };
// };

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const intent = String(formData.get("intent") || "");
//   const id = String(formData.get("id") || "");
//   const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
//   const mode = modeRaw === "custom" ? "custom" : "code";

//   if (intent === "delete") {
//     const isAutomatic = id.includes("DiscountAutomaticNode");
//     const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, {
//       variables: { id },
//     });
//     const json = await response.json();
//     const payload = isAutomatic
//       ? json?.data?.discountAutomaticDelete
//       : json?.data?.discountCodeDelete;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const title = String(formData.get("title") || "").trim();
//   const code = String(formData.get("code") || "").trim().toUpperCase();
//   const functionId = String(formData.get("functionId") || "").trim();
//   const functionHandle = String(formData.get("functionHandle") || "").trim();
//   const startsAtRaw = String(formData.get("startsAt") || "").trim();
//   const endsAtRaw = String(formData.get("endsAt") || "").trim();
//   const segmentId = String(formData.get("segmentId") || "").trim();
//   const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
//   const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
//   const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
//   const appliesOnOneTimePurchase =
//     String(formData.get("appliesOnOneTimePurchase") || "") === "on";
//   const appliesOnSubscription =
//     String(formData.get("appliesOnSubscription") || "") === "on";
//   const percentage = Number(String(formData.get("percentage") || "").trim());
//   const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
//   const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
//   const errors = {};
//   if (!["code", "custom"].includes(modeRaw)) {
//     errors.mode = 'Mode must be "code" or "custom"';
//   }
//   if (!title) errors.title = "Title is required";
//   if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
//     errors.percentage = "Percentage must be between 1 and 100";
//   }
//   if (mode === "code" && !code) errors.code = "Code is required";
//   if (mode === "custom" && !functionId && !functionHandle) {
//     errors.functionId = "Function ID or Function Handle is required";
//   }
//   // Do not enforce UUID format here; Shopify can accept functionId/functionHandle
//   // shapes that vary by API/version or app setup. We only require one of them.
//   if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
//   if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) {
//     errors.endsAt = "Invalid end date";
//   }
//   if (!Number.isNaN(startsAt.getTime())) {
//     const y = startsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
//   }
//   if (endsAt && !Number.isNaN(endsAt.getTime())) {
//     const y = endsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
//   }
//   if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
//     errors.endsAt = "End date must be after start date";
//   }
//   if (Object.keys(errors).length) return { ok: false, errors };

//   if (mode === "custom") {
//     const functionTypesResp = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
//     const functionTypesJson = await functionTypesResp.json();
//     const currentAppKey = process.env.SHOPIFY_API_KEY?.trim() || null;
//     const availableFunctionTypes = (functionTypesJson?.data?.appDiscountTypes || []).filter(
//       (t) => (currentAppKey ? t?.appKey === currentAppKey : true),
//     );
//     const availableFunctionIds = new Set(
//       availableFunctionTypes.map((t) => t?.functionId).filter(Boolean),
//     );
//     if (functionId && !availableFunctionIds.has(functionId)) {
//       return {
//         ok: false,
//         errors: {
//           functionId:
//             "This Function ID is not available for the current app. Select from dropdown.",
//         },
//       };
//     }

//     const automaticAppDiscount = {
//       title,
//       ...(functionId ? { functionId } : {}),
//       ...(functionHandle ? { functionHandle } : {}),
//       startsAt: startsAt.toISOString(),
//       ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//       context: segmentId ? { customerSegments: { add: [segmentId] } } : { all: "ALL" },
//       appliesOnOneTimePurchase,
//       appliesOnSubscription,
//       combinesWith: {
//         orderDiscounts: combinesWithOrder,
//         productDiscounts: combinesWithProduct,
//         shippingDiscounts: combinesWithShipping,
//       },
//       metafields: [
//         {
//           namespace: "default",
//           key: "function-configuration",
//           type: "json",
//           value: makeFunctionConfig({ percentage }),
//         },
//       ],
//     };
//     const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
//     const variables = intent === "update" ? { id, automaticAppDiscount } : { automaticAppDiscount };
//     let json;
//     try {
//       const response = await admin.graphql(mutation, { variables });
//       json = await response.json();
//     } catch (error) {
//       return {
//         ok: false,
//         errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] },
//       };
//     }
//     const payload =
//       intent === "update"
//         ? json?.data?.discountAutomaticAppUpdate
//         : json?.data?.discountAutomaticAppCreate;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const basicCodeDiscount = {
//     title,
//     code,
//     startsAt: startsAt.toISOString(),
//     ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//     context: segmentId ? { customerSegments: { add: [segmentId] } } : { all: "ALL" },
//     combinesWith: {
//       orderDiscounts: combinesWithOrder,
//       productDiscounts: combinesWithProduct,
//       shippingDiscounts: combinesWithShipping,
//     },
//     customerGets: { items: { all: true }, value: { percentage: percentage / 100 } },
//   };
//   const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
//   const variables = intent === "update" ? { id, basicCodeDiscount } : { basicCodeDiscount };
//   let json;
//   try {
//     const response = await admin.graphql(mutation, { variables });
//     json = await response.json();
//   } catch (error) {
//     return {
//       ok: false,
//       errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] },
//     };
//   }
//   const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
//   if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//   if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//   return { ok: true };
// };

// export default function DiscountsIndex() {
//   const { nodes, appDiscountTypes, errors, editDiscount } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();
//   const [filter, setFilter] = useState("");
//   const [mode, setMode] = useState(editDiscount?.mode || "custom");
//   const [title, setTitle] = useState(editDiscount?.title || "Custom discount");
//   const [code, setCode] = useState(editDiscount?.code || "WELCOME10");
//   const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
//   const [functionHandle, setFunctionHandle] = useState("");
//   const [startsAt, setStartsAt] = useState("");
//   const [endsAt, setEndsAt] = useState("");
//   const [segmentId, setSegmentId] = useState("");
//   const [combinesWithOrder, setCombinesWithOrder] = useState(false);
//   const [combinesWithProduct, setCombinesWithProduct] = useState(false);
//   const [combinesWithShipping, setCombinesWithShipping] = useState(false);
//   const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(true);
//   const [appliesOnSubscription, setAppliesOnSubscription] = useState(false);
//   const [percentage, setPercentage] = useState("10");

//   useEffect(() => {
//     setMode(editDiscount?.mode || "custom");
//     setTitle(editDiscount?.title || "Custom discount");
//     setCode(editDiscount?.code || "WELCOME10");
//     setFunctionId(editDiscount?.functionId || "");
//     setStartsAt(editDiscount?.startsAt || "");
//     setEndsAt(editDiscount?.endsAt || "");
//   }, [editDiscount]);

//   const withShopifyParams = (path) => {
//     const [pathname, existingQuery = ""] = path.split("?");
//     const current = new URLSearchParams(location.search);
//     const keep = new URLSearchParams(existingQuery);
//     for (const key of ["host", "shop"]) {
//       const val = current.get(key);
//       if (val && !keep.has(key)) keep.set(key, val);
//     }
//     const qs = keep.toString();
//     return qs ? `${pathname}?${qs}` : pathname;
//   };

//   const filtered = useMemo(() => {
//     const q = filter.trim().toLowerCase();
//     if (!q) return nodes;
//     return nodes.filter((n) => {
//       const d = n.discount || {};
//       const codeVal = d?.codes?.nodes?.[0]?.code || "";
//       const text = `${d.title || ""} ${codeVal} ${d.__typename || ""}`;
//       return text.toLowerCase().includes(q);
//     });
//   }, [filter, nodes]);

//   const functionOptions = useMemo(() => {
//     const byId = new Map();
//     for (const t of appDiscountTypes || []) {
//       const id = t?.functionId;
//       if (!id) continue;
//       byId.set(id, t?.title ? `${t.title} — ${id}` : id);
//     }
//     for (const n of nodes || []) {
//       const d = n?.discount;
//       if (d?.__typename !== "DiscountAutomaticApp") continue;
//       const id = d?.appDiscountType?.functionId;
//       if (!id || byId.has(id)) continue;
//       byId.set(id, `${d?.title || "Existing discount"} — ${id}`);
//     }
//     return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
//   }, [appDiscountTypes, nodes]);

//   useEffect(() => {
//     if (mode === "custom" && !editDiscount && !functionId && functionOptions.length) {
//       setFunctionId(functionOptions[0].id || "");
//     }
//   }, [editDiscount, functionId, functionOptions, mode]);

//   return (
//     <s-page heading="Discounts">
//       <s-section heading={editDiscount ? "Edit discount" : "Create discount"}>
//         <Form method="post">
//           {editDiscount ? <input type="hidden" name="id" value={editDiscount.id} /> : null}
//           <label style={{ display: "block", marginBottom: 8 }}>
//             <div style={{ marginBottom: 4 }}>Mode</div>
//             <select name="mode" value={mode} onChange={(e) => setMode(e.currentTarget.value)}>
//               <option value="custom">Custom automatic (app function)</option>
//               <option value="code">Code discount</option>
//             </select>
//             {actionData?.errors?.mode ? (
//               <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.mode}</p>
//             ) : null}
//           </label>
//           <s-text-field name="title" label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} error={actionData?.errors?.title} autocomplete="off"></s-text-field>
//           {mode === "code" ? (
//             <s-text-field name="code" label="Code" value={code} onChange={(e) => setCode(e.currentTarget.value)} error={actionData?.errors?.code} autocomplete="off"></s-text-field>
//           ) : (
//             <>
//               <label style={{ display: "block", marginBottom: 8 }}>
//                 <div style={{ marginBottom: 4 }}>Available function IDs</div>
//                 <select
//                   value={functionId}
//                   onChange={(e) => setFunctionId(e.currentTarget.value)}
//                   required={mode === "custom" && !functionHandle}
//                   style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #c9cccf" }}
//                 >
//                   <option value="">Select function ID</option>
//                   {functionOptions.map((t) => (
//                     <option key={t.id} value={t.id}>
//                       {t.label}
//                     </option>
//                   ))}
//                 </select>
//                 {!functionOptions.length ? (
//                   <p style={{ marginTop: 6, color: "#6d7175" }}>
//                     No function IDs found. Deploy/release your discount function, then refresh.
//                   </p>
//                 ) : null}
//               </label>
//               <s-text-field name="functionId" label="Function ID" value={functionId} onChange={(e) => setFunctionId(e.currentTarget.value)} error={actionData?.errors?.functionId} autocomplete="off"></s-text-field>
//               <s-text-field name="functionHandle" label="Function Handle (optional)" value={functionHandle} onChange={(e) => setFunctionHandle(e.currentTarget.value)} autocomplete="off"></s-text-field>
//             </>
//           )}
//           <s-text-field name="percentage" label="Percentage off" value={percentage} onChange={(e) => setPercentage(e.currentTarget.value)} error={actionData?.errors?.percentage} autocomplete="off"></s-text-field>
//           <s-text-field name="startsAt" label="Starts at (ISO, optional)" value={startsAt} onChange={(e) => setStartsAt(e.currentTarget.value)} error={actionData?.errors?.startsAt} autocomplete="off"></s-text-field>
//           <s-text-field name="endsAt" label="Ends at (ISO, optional)" value={endsAt} onChange={(e) => setEndsAt(e.currentTarget.value)} error={actionData?.errors?.endsAt} autocomplete="off"></s-text-field>
//           <s-text-field name="segmentId" label="Customer segment ID (optional)" value={segmentId} onChange={(e) => setSegmentId(e.currentTarget.value)} autocomplete="off"></s-text-field>
//           <label style={{ display: "block", marginBottom: 6 }}>
//             <input type="checkbox" name="combinesWithOrder" checked={combinesWithOrder} onChange={(e) => setCombinesWithOrder(e.currentTarget.checked)} />{" "}
//             Combine with order discounts
//           </label>
//           <label style={{ display: "block", marginBottom: 6 }}>
//             <input type="checkbox" name="combinesWithProduct" checked={combinesWithProduct} onChange={(e) => setCombinesWithProduct(e.currentTarget.checked)} />{" "}
//             Combine with product discounts
//           </label>
//           <label style={{ display: "block", marginBottom: 6 }}>
//             <input type="checkbox" name="combinesWithShipping" checked={combinesWithShipping} onChange={(e) => setCombinesWithShipping(e.currentTarget.checked)} />{" "}
//             Combine with shipping discounts
//           </label>
//           {mode === "custom" ? (
//             <>
//               <label style={{ display: "block", marginBottom: 6 }}>
//                 <input type="checkbox" name="appliesOnOneTimePurchase" checked={appliesOnOneTimePurchase} onChange={(e) => setAppliesOnOneTimePurchase(e.currentTarget.checked)} />{" "}
//                 Applies on one-time purchases
//               </label>
//               <label style={{ display: "block", marginBottom: 6 }}>
//                 <input type="checkbox" name="appliesOnSubscription" checked={appliesOnSubscription} onChange={(e) => setAppliesOnSubscription(e.currentTarget.checked)} />{" "}
//                 Applies on subscription
//               </label>
//             </>
//           ) : null}
//           <s-stack direction="inline" gap="base">
//             <s-button type="submit" name="intent" value={editDiscount ? "update" : "create"}>
//               {editDiscount ? "Update" : "Create"}
//             </s-button>
//             {editDiscount ? <a href={withShopifyParams("/app/discounts")}>Cancel edit</a> : null}
//           </s-stack>
//         </Form>
//       </s-section>

//       {(errors?.length || actionData?.errors) ? (
//         <s-section heading="Errors">
//           <s-box padding="base" borderWidth="base" borderRadius="base" background="critical-subdued">
//             <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}><code>{JSON.stringify(errors || actionData?.errors, null, 2)}</code></pre>
//           </s-box>
//         </s-section>
//       ) : null}

//       <s-section heading="All discounts">
//         <s-text-field label="Search" value={filter} onChange={(e) => setFilter(e.currentTarget.value)} autocomplete="off"></s-text-field>
//         <s-box padding="base" borderWidth="base" borderRadius="base">
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Title</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Method</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Code/Function</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((n) => {
//                   const d = n.discount || {};
//                   const method = d.__typename === "DiscountAutomaticApp" ? "Automatic" : "Code";
//                   const ref = d.__typename === "DiscountAutomaticApp"
//                     ? d?.appDiscountType?.functionId || "—"
//                     : d?.codes?.nodes?.[0]?.code || "—";
//                   return (
//                     <tr key={n.id} style={{ borderTop: "1px solid #e1e3e5" }}>
//                       <td style={{ padding: "8px" }}>{d.title || "—"}</td>
//                       <td style={{ padding: "8px" }}>{method}</td>
//                       <td style={{ padding: "8px" }}>{ref}</td>
//                       <td style={{ padding: "8px" }}>{d.status || "—"}</td>
//                       <td style={{ padding: "8px" }}>
//                         <s-stack direction="inline" gap="base">
//                           <a href={withShopifyParams(`/app/discounts?editId=${encodeURIComponent(n.id)}`)}>Edit</a>
//                           <Form method="post">
//                             <input type="hidden" name="id" value={n.id} />
//                             <button type="submit" name="intent" value="delete" style={{ border: "none", background: "transparent", color: "#8a1f17", cursor: "pointer" }}>
//                               Delete
//                             </button>
//                           </Form>
//                         </s-stack>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </s-box>
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);



















































// import { useEffect, useMemo, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useRouteError,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// const LIST_DISCOUNTS = `#graphql
//   query ListDiscountNodes($first: Int!) {
//     discountNodes(first: $first, reverse: true) {
//       nodes {
//         id
//         discount {
//           __typename
//           ... on DiscountCodeBasic {
//             title
//             status
//             startsAt
//             endsAt
//             codes(first: 1) { nodes { code } }
//           }
//           ... on DiscountAutomaticApp {
//             title
//             status
//             startsAt
//             endsAt
//             asyncUsageCount
//             appliesOnOneTimePurchase
//             appliesOnSubscription
//             discountClasses
//             combinesWith {
//               orderDiscounts
//               productDiscounts
//               shippingDiscounts
//             }
//             appDiscountType { functionId }
//           }
//         }
//       }
//     }
//     appDiscountTypes {
//       functionId
//       title
//     }
//   }
// `;

// const LIST_APP_DISCOUNT_TYPES = `#graphql
//   query ListAppDiscountTypes {
//     appDiscountTypes {
//       functionId
//     }
//   }
// `;

// const CREATE_CODE = `#graphql
//   mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CODE = `#graphql
//   mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const CREATE_CUSTOM = `#graphql
//   mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CUSTOM = `#graphql
//   mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_CODE = `#graphql
//   mutation DeleteCode($id: ID!) {
//     discountCodeDelete(id: $id) {
//       deletedCodeDiscountId
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_AUTOMATIC = `#graphql
//   mutation DeleteAutomatic($id: ID!) {
//     discountAutomaticDelete(id: $id) {
//       deletedAutomaticDiscountId
//       userErrors { field message }
//     }
//   }
// `;

// function makeFunctionConfig({
//   discountValueType,
//   amountOff,
//   orderPercentage,
//   productPercentage,
//   shippingPercentage,
//   orderMessage,
//   productMessage,
//   shippingMessage,
//   orderSelectionStrategy,
//   productSelectionStrategy,
// }) {
//   const normalizedType = discountValueType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
//   const normalizedAmountOff = Number.isFinite(Number(amountOff)) ? Math.max(0, Number(amountOff)) : 0;

//   return JSON.stringify({
//     order: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: orderPercentage,
//       message: orderMessage,
//       selectionStrategy: orderSelectionStrategy,
//     },
//     product: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: productPercentage,
//       message: productMessage,
//       selectionStrategy: productSelectionStrategy,
//     },
//     shipping: {
//       percentage: shippingPercentage,
//       message: shippingMessage,
//     },
//   });
// }

// function isoToLocalDateTimeInput(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   const year = d.getFullYear();
//   const month = pad(d.getMonth() + 1);
//   const day = pad(d.getDate());
//   const hours = pad(d.getHours());
//   const minutes = pad(d.getMinutes());
//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// }

// function localDateTimeInputToIso(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   return d.toISOString();
// }

// export const loader = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("editId");

//   const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
//   const json = await response.json();
//   const appDiscountTypes = json?.data?.appDiscountTypes || [];
//   const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
//   const allNodes = json?.data?.discountNodes?.nodes || [];
//   const nodes = allNodes.filter((n) => {
//     const d = n?.discount;
//     if (d?.__typename !== "DiscountAutomaticApp") return false;
//     return appFunctionIds.has(d?.appDiscountType?.functionId);
//   });

//   const found = editId ? nodes.find((n) => n.id === editId) : null;
//   const discount = found?.discount;
//   const editDiscount = found
//     ? {
//         id: found.id,
//         mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
//         title: discount?.title || "",
//         code: discount?.codes?.nodes?.[0]?.code || "",
//         functionId: discount?.appDiscountType?.functionId || "",
//         discountClasses: discount?.discountClasses || [],
//         combinesWithOrder: Boolean(discount?.combinesWith?.orderDiscounts),
//         combinesWithProduct: Boolean(discount?.combinesWith?.productDiscounts),
//         combinesWithShipping: Boolean(discount?.combinesWith?.shippingDiscounts),
//         appliesOnOneTimePurchase: discount?.appliesOnOneTimePurchase ?? true,
//         appliesOnSubscription: discount?.appliesOnSubscription ?? false,
//         percentage: "",
//         startsAt: discount?.startsAt || "",
//         endsAt: discount?.endsAt || "",
//       }
//     : null;

//   return { nodes, appDiscountTypes, editDiscount, errors: json?.errors || null };
// };

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const intent = String(formData.get("intent") || "");
//   const id = String(formData.get("id") || "");
//   const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
//   const mode = modeRaw === "custom" ? "custom" : "code";

//   if (intent === "delete") {
//     const isAutomatic = id.includes("DiscountAutomaticNode");
//     const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, {
//       variables: { id },
//     });
//     const json = await response.json();
//     const payload = isAutomatic
//       ? json?.data?.discountAutomaticDelete
//       : json?.data?.discountCodeDelete;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const title = String(formData.get("title") || "").trim();
//   const code = String(formData.get("code") || "").trim().toUpperCase();
//   const functionId = String(formData.get("functionId") || "").trim();
//   const functionHandle = String(formData.get("functionHandle") || "").trim();
//   const startsAtRaw = String(formData.get("startsAt") || "").trim();
//   const endsAtRaw = String(formData.get("endsAt") || "").trim();
//   const segmentId = String(formData.get("segmentId") || "").trim();
//   const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
//   const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
//   const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
//   const appliesOnOneTimePurchase =
//     String(formData.get("appliesOnOneTimePurchase") || "") === "on";
//   const appliesOnSubscription =
//     String(formData.get("appliesOnSubscription") || "") === "on";
//   const discountClassProduct = String(formData.get("discountClassProduct") || "") === "on";
//   const discountClassOrder = String(formData.get("discountClassOrder") || "") === "on";
//   const discountClassShipping = String(formData.get("discountClassShipping") || "") === "on";
//   const discountClasses = [
//     ...(discountClassProduct ? ["PRODUCT"] : []),
//     ...(discountClassOrder ? ["ORDER"] : []),
//     ...(discountClassShipping ? ["SHIPPING"] : []),
//   ];
//   const orderPercentageRaw = String(formData.get("orderPercentage") ?? "").trim();
//   const productPercentageRaw = String(formData.get("productPercentage") ?? "").trim();
//   const shippingPercentageRaw = String(formData.get("shippingPercentage") ?? "").trim();
//   const orderPercentage = Number(orderPercentageRaw);
//   const productPercentage = Number(productPercentageRaw);
//   const shippingPercentage = Number(shippingPercentageRaw);
//   const orderMessage = String(formData.get("orderMessage") ?? "").trim();
//   const productMessage = String(formData.get("productMessage") ?? "").trim();
//   const shippingMessage = String(formData.get("shippingMessage") ?? "").trim();
//   const orderSelectionStrategy = String(formData.get("orderSelectionStrategy") || "FIRST")
//     .trim()
//     .toUpperCase();
//   const productSelectionStrategy = String(formData.get("productSelectionStrategy") || "FIRST")
//     .trim()
//     .toUpperCase();
//   const discountValueType = String(formData.get("discountValueType") || "PERCENTAGE")
//     .trim()
//     .toUpperCase();
//   const percentage = Number(String(formData.get("percentage") || "").trim());
//   const amountOff = Number(String(formData.get("amountOff") || "").trim());
//   const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
//   const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

//   const errors = {};
//   if (!["code", "custom"].includes(modeRaw)) {
//     errors.mode = 'Mode must be "code" or "custom"';
//   }
//   if (!title) errors.title = "Title is required";
//   if (mode === "code" && !["PERCENTAGE", "FIXED_AMOUNT"].includes(discountValueType)) {
//     errors.discountValueType = "Discount type must be Percentage or Price";
//   }
//   if (
//     mode === "code" &&
//     discountValueType === "PERCENTAGE" &&
//     (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100)
//   ) {
//     errors.percentage = "Percentage must be between 1 and 100";
//   }
//   if (
//     ["code", "custom"].includes(mode) &&
//     discountValueType === "FIXED_AMOUNT" &&
//     (!Number.isFinite(amountOff) || amountOff <= 0)
//   ) {
//     errors.amountOff = "Price off must be greater than 0";
//   }
//   if (mode === "code" && !code) errors.code = "Code is required";
//   if (mode === "custom" && !functionId && !functionHandle) {
//     errors.functionId = "Function ID or Function Handle is required";
//   }
//   if (mode === "custom" && !discountClasses.length) {
//     errors.discountClasses = "Select at least one discount class (Product, Order, or Shipping)";
//   }
//   if (mode === "custom" && (!Number.isFinite(orderPercentage) || orderPercentage < 0 || orderPercentage > 100)) {
//     errors.orderPercentage = "Order percentage must be between 0 and 100";
//   }
//   if (mode === "custom" && (!Number.isFinite(productPercentage) || productPercentage < 0 || productPercentage > 100)) {
//     errors.productPercentage = "Product percentage must be between 0 and 100";
//   }
//   if (mode === "custom" && (!Number.isFinite(shippingPercentage) || shippingPercentage < 0 || shippingPercentage > 100)) {
//     errors.shippingPercentage = "Shipping percentage must be between 0 and 100";
//   }
//   if (mode === "custom" && !orderMessage) {
//     errors.orderMessage = "Order discount message is required";
//   }
//   if (mode === "custom" && !productMessage) {
//     errors.productMessage = "Product discount message is required";
//   }
//   if (mode === "custom" && !shippingMessage) {
//     errors.shippingMessage = "Shipping discount message is required";
//   }
//   if (mode === "custom" && !["FIRST", "MAXIMUM"].includes(orderSelectionStrategy)) {
//     errors.orderSelectionStrategy = "Order selection strategy must be FIRST or MAXIMUM";
//   }
//   if (mode === "custom" && !["ALL", "FIRST", "MAXIMUM"].includes(productSelectionStrategy)) {
//     errors.productSelectionStrategy = "Product selection strategy must be ALL, FIRST, or MAXIMUM";
//   }
//   if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
//   if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) {
//     errors.endsAt = "Invalid end date";
//   }
//   if (!Number.isNaN(startsAt.getTime())) {
//     const y = startsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
//   }
//   if (endsAt && !Number.isNaN(endsAt.getTime())) {
//     const y = endsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
//   }
//   if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
//     errors.endsAt = "End date must be after start date";
//   }
//   if (mode === "custom" && !functionHandle && functionId) {
//     try {
//       const typesResponse = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
//       const typesJson = await typesResponse.json();
//       const availableFunctionIds = new Set(
//         (typesJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
//       );
//       if (!availableFunctionIds.has(functionId)) {
//         errors.functionId =
//           "Selected Function ID is no longer available in this app. Pick a current one or use Function Handle.";
//       }
//     } catch {
//       errors.functionId =
//         "Unable to validate Function ID right now. Try using Function Handle or refresh and submit again.";
//     }
//   }
//   if (Object.keys(errors).length) return { ok: false, errors };

//   if (mode === "custom") {
//     // Prefer functionHandle (stable string from shopify.extension.toml, always scoped
//     // to the installed app) over functionId (UUID that can become stale across deploys).
//     // Never send both — Shopify rejects the mutation if both fields are present.
//     const functionRef = functionHandle
//       ? { functionHandle }
//       : functionId
//       ? { functionId }
//       : {};

//     const automaticAppDiscount = {
//       title,
//       ...functionRef,
//       startsAt: startsAt.toISOString(),
//       ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//       // NOTE: DiscountAutomaticAppInput does NOT have a `context` or `customerGets` field.
//       // Customer segment targeting is handled inside the function metafield config below.
//       discountClasses,
//       appliesOnOneTimePurchase,
//       appliesOnSubscription,
//       combinesWith: {
//         orderDiscounts: combinesWithOrder,
//         productDiscounts: combinesWithProduct,
//         shippingDiscounts: combinesWithShipping,
//       },
//       metafields: [
//         {
//           namespace: "default",
//           key: "function-configuration",
//           type: "json",
//           value: makeFunctionConfig({
//             discountValueType,
//             amountOff,
//             orderPercentage,
//             productPercentage,
//             shippingPercentage,
//             orderMessage,
//             productMessage,
//             shippingMessage,
//             orderSelectionStrategy,
//             productSelectionStrategy,
//           }),
//         },
//       ],
//     };

//     const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
//     const variables = intent === "update" ? { id, automaticAppDiscount } : { automaticAppDiscount };
//     let json;
//     try {
//       const response = await admin.graphql(mutation, { variables });
//       json = await response.json();
//     } catch (error) {
//       return {
//         ok: false,
//         errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] },
//       };
//     }
//     const payload =
//       intent === "update"
//         ? json?.data?.discountAutomaticAppUpdate
//         : json?.data?.discountAutomaticAppCreate;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   // Code discount — uses `customerSelection` (not `context`) for targeting
//   const basicCodeDiscount = {
//     title,
//     code,
//     startsAt: startsAt.toISOString(),
//     ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//     customerSelection: segmentId
//       ? { customerSegments: { add: [segmentId] } }
//       : { all: true },
//     combinesWith: {
//       orderDiscounts: combinesWithOrder,
//       productDiscounts: combinesWithProduct,
//       shippingDiscounts: combinesWithShipping,
//     },
//     customerGets: {
//       items: { all: true },
//       value:
//         discountValueType === "FIXED_AMOUNT"
//           ? { discountAmount: { amount: String(amountOff), appliesOnEachItem: false } }
//           : { percentage: percentage / 100 },
//     },
//   };

//   const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
//   const variables = intent === "update" ? { id, basicCodeDiscount } : { basicCodeDiscount };
//   let json;
//   try {
//     const response = await admin.graphql(mutation, { variables });
//     json = await response.json();
//   } catch (error) {
//     return {
//       ok: false,
//       errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] },
//     };
//   }
//   const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
//   if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//   if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//   return { ok: true };
// };

// export default function DiscountsIndex() {
//   const { nodes, appDiscountTypes, errors, editDiscount } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();
//   const [filter, setFilter] = useState("");
//   const [mode, setMode] = useState(editDiscount?.mode || "custom");
//   const [title, setTitle] = useState(editDiscount?.title || "");
//   const [code, setCode] = useState(editDiscount?.code || "");
//   const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
//   const [functionHandle, setFunctionHandle] = useState("");
//   const [startsAt, setStartsAt] = useState("");
//   const [endsAt, setEndsAt] = useState("");
//   const [segmentId, setSegmentId] = useState("");
//   const [combinesWithOrder, setCombinesWithOrder] = useState(editDiscount?.combinesWithOrder ?? false);
//   const [combinesWithProduct, setCombinesWithProduct] = useState(
//     editDiscount?.combinesWithProduct ?? false,
//   );
//   const [combinesWithShipping, setCombinesWithShipping] = useState(
//     editDiscount?.combinesWithShipping ?? false,
//   );
//   const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(
//     editDiscount?.appliesOnOneTimePurchase ?? true,
//   );
//   const [appliesOnSubscription, setAppliesOnSubscription] = useState(
//     editDiscount?.appliesOnSubscription ?? false,
//   );
//   const [discountClassProduct, setDiscountClassProduct] = useState(
//     editDiscount?.discountClasses?.includes("PRODUCT") ?? true,
//   );
//   const [discountClassOrder, setDiscountClassOrder] = useState(
//     editDiscount?.discountClasses?.includes("ORDER") ?? false,
//   );
//   const [discountClassShipping, setDiscountClassShipping] = useState(
//     editDiscount?.discountClasses?.includes("SHIPPING") ?? true,
//   );
//   const [percentage, setPercentage] = useState(editDiscount?.percentage || "");
//   const [discountValueType, setDiscountValueType] = useState("PERCENTAGE");
//   const [amountOff, setAmountOff] = useState("");
//   const [orderPercentage, setOrderPercentage] = useState("");
//   const [productPercentage, setProductPercentage] = useState("");
//   const [shippingPercentage, setShippingPercentage] = useState("");
//   const [orderMessage, setOrderMessage] = useState("");
//   const [productMessage, setProductMessage] = useState("");
//   const [shippingMessage, setShippingMessage] = useState("");
//   const [orderSelectionStrategy, setOrderSelectionStrategy] = useState("FIRST");
//   const [productSelectionStrategy, setProductSelectionStrategy] = useState("FIRST");
//   const editDiscountId = editDiscount?.id || "__new__";

//   useEffect(() => {
//     setMode(editDiscount?.mode || "custom");
//     setTitle(editDiscount?.title || "");
//     setCode(editDiscount?.code || "");
//     setFunctionId(editDiscount?.functionId || "");
//     setDiscountClassProduct(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
//     setDiscountClassOrder(editDiscount?.discountClasses?.includes("ORDER") ?? false);
//     setDiscountClassShipping(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
//     setCombinesWithOrder(editDiscount?.combinesWithOrder ?? false);
//     setCombinesWithProduct(editDiscount?.combinesWithProduct ?? false);
//     setCombinesWithShipping(editDiscount?.combinesWithShipping ?? false);
//     setAppliesOnOneTimePurchase(editDiscount?.appliesOnOneTimePurchase ?? true);
//     setAppliesOnSubscription(editDiscount?.appliesOnSubscription ?? false);
//     setPercentage(editDiscount?.percentage || "");
//     setDiscountValueType("PERCENTAGE");
//     setAmountOff("");
//     setOrderPercentage("");
//     setProductPercentage("");
//     setShippingPercentage("");
//     setOrderMessage("");
//     setProductMessage("");
//     setShippingMessage("");
//     setOrderSelectionStrategy("FIRST");
//     setProductSelectionStrategy("FIRST");
//     setStartsAt(isoToLocalDateTimeInput(editDiscount?.startsAt || ""));
//     setEndsAt(isoToLocalDateTimeInput(editDiscount?.endsAt || ""));
//   }, [editDiscountId]);

//   const withShopifyParams = (path) => {
//     const [pathname, existingQuery = ""] = path.split("?");
//     const current = new URLSearchParams(location.search);
//     const keep = new URLSearchParams(existingQuery);
//     for (const key of ["host", "shop"]) {
//       const val = current.get(key);
//       if (val && !keep.has(key)) keep.set(key, val);
//     }
//     const qs = keep.toString();
//     return qs ? `${pathname}?${qs}` : pathname;
//   };

//   const filtered = useMemo(() => {
//     const q = filter.trim().toLowerCase();
//     if (!q) return nodes;
//     return nodes.filter((n) => {
//       const d = n.discount || {};
//       const codeVal = d?.codes?.nodes?.[0]?.code || "";
//       const text = `${d.title || ""} ${codeVal} ${d.__typename || ""}`;
//       return text.toLowerCase().includes(q);
//     });
//   }, [filter, nodes]);

//   const functionOptions = useMemo(() => {
//     const byId = new Map();
//     for (const t of appDiscountTypes || []) {
//       const id = t?.functionId;
//       if (!id) continue;
//       byId.set(id, t?.title ? `${t.title} — ${id}` : id);
//     }
//     return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
//   }, [appDiscountTypes]);

//   useEffect(() => {
//     if (mode === "custom" && !editDiscount && !functionId && functionOptions.length) {
//       setFunctionId(functionOptions[0].id || "");
//     }
//   }, [editDiscount, functionId, functionOptions, mode]);

//   useEffect(() => {
//     if (mode !== "custom" || functionHandle) return;
//     if (!functionOptions.length) return;
//     const validIds = new Set(functionOptions.map((o) => o.id));
//     if (!functionId || !validIds.has(functionId)) {
//       setFunctionId(functionOptions[0].id || "");
//     }
//   }, [functionHandle, functionId, functionOptions, mode]);

//   const sectionStyle = {
//     border: "1px solid #e1e3e5",
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 12,
//   };
//   const sectionHeadingStyle = { margin: "0 0 10px 0", fontSize: 14, fontWeight: 600 };
//   const checkboxStyle = { display: "block", marginBottom: 8 };

//   return (
//     <s-page heading="Discounts">
//       <s-section heading={editDiscount ? "Edit discount" : "Create discount"}>
//         <Form method="post">
//           {editDiscount ? <input type="hidden" name="id" value={editDiscount.id} /> : null}
//           <input type="hidden" name="intent" value={editDiscount ? "update" : "create"} />
//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>Basic settings</h3>
//             <label style={{ display: "block", marginBottom: 8 }}>
//               <div style={{ marginBottom: 4 }}>Mode</div>
//               <select name="mode" value={mode} onChange={(e) => setMode(e.currentTarget.value)}>
//                 <option value="custom">Custom automatic (app function)</option>
//                 <option value="code">Code discount</option>
//               </select>
//               {actionData?.errors?.mode ? (
//                 <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.mode}</p>
//               ) : null}
//             </label>
//             <s-text-field name="title" label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} error={actionData?.errors?.title} autocomplete="off"></s-text-field>
//             {mode === "code" ? (
//               <s-text-field name="code" label="Code" value={code} onChange={(e) => setCode(e.currentTarget.value)} error={actionData?.errors?.code} autocomplete="off"></s-text-field>
//             ) : (
//               <>
//                 <input type="hidden" name="functionId" value={functionId} />
//                 <p style={{ marginTop: 4, marginBottom: 8, color: "#6d7175", fontSize: 13 }}>
//                   Function ID is auto-selected by default from your app's available discount functions.
//                 </p>
//                 {!functionOptions.length ? (
//                   <p style={{ marginTop: 6, color: "#8a1f17" }}>
//                     No function IDs found. Deploy/release your discount function, then refresh.
//                   </p>
//                 ) : null}
//                 {actionData?.errors?.functionId ? (
//                   <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.functionId}</p>
//                 ) : null}
//                   <input type="hidden" name="functionHandle" value="" />
//               </>
//             )}
//             <>
//               <label style={{ display: "block", marginBottom: 8 }}>
//                 <div style={{ marginBottom: 4 }}>Discount value type</div>
//                 <select
//                   name="discountValueType"
//                   value={discountValueType}
//                   onChange={(e) => setDiscountValueType(e.currentTarget.value)}
//                 >
//                   <option value="PERCENTAGE">Percentage off</option>
//                   <option value="FIXED_AMOUNT">Price off</option>
//                 </select>
//                 {actionData?.errors?.discountValueType ? (
//                   <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.discountValueType}</p>
//                 ) : null}
//               </label>
//               {discountValueType === "FIXED_AMOUNT" ? (
//                 <s-text-field
//                   name="amountOff"
//                   label="Price off amount"
//                   value={amountOff}
//                   onChange={(e) => setAmountOff(e.currentTarget.value)}
//                   error={actionData?.errors?.amountOff}
//                   autocomplete="off"
//                 ></s-text-field>
//               ) : (
//                 <s-text-field
//                   name="percentage"
//                   label="Percentage off"
//                   value={percentage}
//                   onChange={(e) => setPercentage(e.currentTarget.value)}
//                   error={actionData?.errors?.percentage}
//                   autocomplete="off"
//                 ></s-text-field>
//               )}
//             </>
//           </div>

//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>Schedule and audience</h3>
//           <input type="hidden" name="startsAt" value={localDateTimeInputToIso(startsAt)} />
//           <input type="hidden" name="endsAt" value={localDateTimeInputToIso(endsAt)} />
//           <label style={{ display: "block", marginBottom: 8 }}>
//             <div style={{ marginBottom: 4 }}>Starts at (optional)</div>
//             <input
//               type="datetime-local"
//               value={startsAt}
//               onChange={(e) => setStartsAt(e.currentTarget.value)}
//               style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #c9cccf" }}
//             />
//             {actionData?.errors?.startsAt ? (
//               <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.startsAt}</p>
//             ) : null}
//           </label>
//           <label style={{ display: "block", marginBottom: 8 }}>
//             <div style={{ marginBottom: 4 }}>Ends at (optional)</div>
//             <input
//               type="datetime-local"
//               value={endsAt}
//               onChange={(e) => setEndsAt(e.currentTarget.value)}
//               style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #c9cccf" }}
//             />
//             {actionData?.errors?.endsAt ? (
//               <p style={{ color: "#8a1f17", marginTop: 6 }}>{actionData.errors.endsAt}</p>
//             ) : null}
//           </label>
//           <s-text-field name="segmentId" label="Customer segment ID (optional)" value={segmentId} onChange={(e) => setSegmentId(e.currentTarget.value)} autocomplete="off"></s-text-field>
//           </div>

//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>Combination rules</h3>
//             <label style={checkboxStyle}>
//             <input type="checkbox" name="combinesWithOrder" checked={combinesWithOrder} onChange={(e) => setCombinesWithOrder(e.currentTarget.checked)} />{" "}
//             Combine with order discounts
//           </label>
//           <label style={checkboxStyle}>
//             <input type="checkbox" name="combinesWithProduct" checked={combinesWithProduct} onChange={(e) => setCombinesWithProduct(e.currentTarget.checked)} />{" "}
//             Combine with product discounts
//           </label>
//           <label style={checkboxStyle}>
//             <input type="checkbox" name="combinesWithShipping" checked={combinesWithShipping} onChange={(e) => setCombinesWithShipping(e.currentTarget.checked)} />{" "}
//             Combine with shipping discounts
//           </label>
//           </div>

//           {mode === "custom" ? (
//             <div style={sectionStyle}>
//               <h3 style={sectionHeadingStyle}>Custom function options</h3>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassProduct" checked={discountClassProduct} onChange={(e) => setDiscountClassProduct(e.currentTarget.checked)} />{" "}
//                 Discount class: Product
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassOrder" checked={discountClassOrder} onChange={(e) => setDiscountClassOrder(e.currentTarget.checked)} />{" "}
//                 Discount class: Order
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassShipping" checked={discountClassShipping} onChange={(e) => setDiscountClassShipping(e.currentTarget.checked)} />{" "}
//                 Discount class: Shipping
//               </label>
//               {actionData?.errors?.discountClasses ? (
//                 <p style={{ color: "#8a1f17", marginTop: 4, marginBottom: 8 }}>
//                   {actionData.errors.discountClasses}
//                 </p>
//               ) : null}
//               <s-text-field
//                 name="orderPercentage"
//                 label="Order discount percentage"
//                 value={orderPercentage}
//                 onChange={(e) => setOrderPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.orderPercentage}
//                 autocomplete="off"
//               ></s-text-field>
//               <s-text-field
//                 name="productPercentage"
//                 label="Product discount percentage"
//                 value={productPercentage}
//                 onChange={(e) => setProductPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.productPercentage}
//                 autocomplete="off"
//               ></s-text-field>
//               <s-text-field
//                 name="shippingPercentage"
//                 label="Shipping discount percentage"
//                 value={shippingPercentage}
//                 onChange={(e) => setShippingPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingPercentage}
//                 autocomplete="off"
//               ></s-text-field>
//               <s-text-field
//                 name="orderMessage"
//                 label="Order discount message"
//                 value={orderMessage}
//                 onChange={(e) => setOrderMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.orderMessage}
//                 autocomplete="off"
//               ></s-text-field>
//               <s-text-field
//                 name="productMessage"
//                 label="Product discount message"
//                 value={productMessage}
//                 onChange={(e) => setProductMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.productMessage}
//                 autocomplete="off"
//               ></s-text-field>
//               <s-text-field
//                 name="shippingMessage"
//                 label="Shipping discount message"
//                 value={shippingMessage}
//                 onChange={(e) => setShippingMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingMessage}
//                 autocomplete="off"
//               ></s-text-field>
//               <label style={{ display: "block", marginBottom: 8 }}>
//                 <div style={{ marginBottom: 4 }}>Order selection strategy</div>
//                 <select
//                   name="orderSelectionStrategy"
//                   value={orderSelectionStrategy}
//                   onChange={(e) => setOrderSelectionStrategy(e.currentTarget.value)}
//                 >
//                   <option value="FIRST">FIRST</option>
//                   <option value="MAXIMUM">MAXIMUM</option>
//                 </select>
//                 {actionData?.errors?.orderSelectionStrategy ? (
//                   <p style={{ color: "#8a1f17", marginTop: 6 }}>
//                     {actionData.errors.orderSelectionStrategy}
//                   </p>
//                 ) : null}
//               </label>
//               <label style={{ display: "block", marginBottom: 8 }}>
//                 <div style={{ marginBottom: 4 }}>Product selection strategy</div>
//                 <select
//                   name="productSelectionStrategy"
//                   value={productSelectionStrategy}
//                   onChange={(e) => setProductSelectionStrategy(e.currentTarget.value)}
//                 >
//                   <option value="ALL">ALL</option>
//                   <option value="FIRST">FIRST</option>
//                   <option value="MAXIMUM">MAXIMUM</option>
//                 </select>
//                 {actionData?.errors?.productSelectionStrategy ? (
//                   <p style={{ color: "#8a1f17", marginTop: 6 }}>
//                     {actionData.errors.productSelectionStrategy}
//                   </p>
//                 ) : null}
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="appliesOnOneTimePurchase" checked={appliesOnOneTimePurchase} onChange={(e) => setAppliesOnOneTimePurchase(e.currentTarget.checked)} />{" "}
//                 Applies on one-time purchases
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="appliesOnSubscription" checked={appliesOnSubscription} onChange={(e) => setAppliesOnSubscription(e.currentTarget.checked)} />{" "}
//                 Applies on subscription
//               </label>
//             </div>
//           ) : null}
//           <s-stack direction="inline" gap="base">
//             <s-button type="submit">
//               {editDiscount ? "Update" : "Create"}
//             </s-button>
//             {editDiscount ? <a href={withShopifyParams("")}>Cancel edit</a> : null}
//           </s-stack>
//         </Form>
//       </s-section>

//       {(errors?.length || actionData?.errors) ? (
//         <s-section heading="Errors">
//           <s-box padding="base" borderWidth="base" borderRadius="base" background="critical-subdued">
//             <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}><code>{JSON.stringify(errors || actionData?.errors, null, 2)}</code></pre>
//           </s-box>
//         </s-section>
//       ) : null}

//       <s-section heading="My app discounts">
//         <s-text-field label="Search" value={filter} onChange={(e) => setFilter(e.currentTarget.value)} autocomplete="off"></s-text-field>
//         <s-box padding="base" borderWidth="base" borderRadius="base">
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Title</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Method</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Code/Function</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Used</th>
//                   <th style={{ textAlign: "left", padding: "8px" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((n) => {
//                   const d = n.discount || {};
//                   const method = d.__typename === "DiscountAutomaticApp" ? "Automatic" : "Code";
//                   const ref = d.__typename === "DiscountAutomaticApp"
//                     ? d?.appDiscountType?.functionId || "—"
//                     : d?.codes?.nodes?.[0]?.code || "—";
//                   const used = d?.asyncUsageCount ?? "—";
//                   return (
//                     <tr key={n.id} style={{ borderTop: "1px solid #e1e3e5" }}>
//                       <td style={{ padding: "8px" }}>{d.title || "—"}</td>
//                       <td style={{ padding: "8px" }}>{method}</td>
//                       <td style={{ padding: "8px" }}>{ref}</td>
//                       <td style={{ padding: "8px" }}>{d.status || "—"}</td>
//                       <td style={{ padding: "8px" }}>{used}</td>
//                       <td style={{ padding: "8px" }}>
//                         <s-stack direction="inline" gap="base">
//                           <Form method="get" action={withShopifyParams("")}>
//                             <input type="hidden" name="editId" value={n.id} />
//                             <button
//                               type="submit"
//                               style={{
//                                 border: "none",
//                                 background: "transparent",
//                                 color: "#005bd3",
//                                 cursor: "pointer",
//                                 padding: 0,
//                               }}
//                             >
//                               Edit
//                             </button>
//                           </Form>
//                           <Form method="post">
//                             <input type="hidden" name="id" value={n.id} />
//                             <button type="submit" name="intent" value="delete" style={{ border: "none", background: "transparent", color: "#8a1f17", cursor: "pointer" }}>
//                               Delete
//                             </button>
//                           </Form>
//                         </s-stack>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </s-box>
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);















// Original code




// import { useEffect, useMemo, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useRouteError,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// // ─── GraphQL ────────────────────────────────────────────────────────────────

// const LIST_DISCOUNTS = `#graphql
//   query ListDiscountNodes($first: Int!) {
//     discountNodes(first: $first, reverse: true) {
//       nodes {
//         id
//         metafield(namespace: "default", key: "function-configuration") {
//           jsonValue
//           value
//         }
//         discount {
//           __typename
//           ... on DiscountCodeBasic {
//             title
//             status
//             startsAt
//             endsAt
//             asyncUsageCount
//             codes(first: 1) { nodes { code } }
//             customerGets {
//               value {
//                 ... on DiscountPercentage { percentage }
//                 ... on DiscountAmount {
//                   amount { amount currencyCode }
//                   appliesOnEachItem
//                 }
//               }
//             }
//             combinesWith {
//               orderDiscounts
//               productDiscounts
//               shippingDiscounts
//             }
//           }
//           ... on DiscountAutomaticApp {
//             title
//             status
//             startsAt
//             endsAt
//             asyncUsageCount
//             appliesOnOneTimePurchase
//             appliesOnSubscription
//             discountClasses
//             combinesWith {
//               orderDiscounts
//               productDiscounts
//               shippingDiscounts
//             }
//             appDiscountType { functionId }
//           }
//         }
//       }
//     }
//     appDiscountTypes {
//       functionId
//       title
//     }
//   }
// `;

// const LIST_APP_DISCOUNT_TYPES = `#graphql
//   query ListAppDiscountTypes {
//     appDiscountTypes { functionId }
//   }
// `;

// const CREATE_CODE = `#graphql
//   mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CODE = `#graphql
//   mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const CREATE_CUSTOM = `#graphql
//   mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CUSTOM = `#graphql
//   mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_CODE = `#graphql
//   mutation DeleteCode($id: ID!) {
//     discountCodeDelete(id: $id) {
//       deletedCodeDiscountId
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_AUTOMATIC = `#graphql
//   mutation DeleteAutomatic($id: ID!) {
//     discountAutomaticDelete(id: $id) {
//       deletedAutomaticDiscountId
//       userErrors { field message }
//     }
//   }
// `;

// const GET_DISCOUNT_FUNCTION_CONFIG = `#graphql
//   query DiscountFunctionConfig($id: ID!) {
//     discountNode(id: $id) {
//       id
//       metafield(namespace: "default", key: "function-configuration") {
//         jsonValue
//         value
//       }
//     }
//   }
// `;

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// /** Parse Shopify metafield (json type) from Admin API */
// function parseFunctionConfigMetafield(metafield) {
//   if (!metafield) return null;
//   if (metafield.jsonValue != null && typeof metafield.jsonValue === "object") {
//     return metafield.jsonValue;
//   }
//   const raw = metafield.value;
//   if (typeof raw !== "string" || !raw.trim()) return null;
//   try {
//     const parsed = JSON.parse(raw);
//     return parsed && typeof parsed === "object" ? parsed : null;
//   } catch {
//     return null;
//   }
// }

// /** Build form defaults from stored function-configuration JSON */
// function customFieldsFromFunctionConfig(cfg) {
//   if (!cfg || typeof cfg !== "object") return null;
//   const o = cfg.order && typeof cfg.order === "object" ? cfg.order : {};
//   const p = cfg.product && typeof cfg.product === "object" ? cfg.product : {};
//   const s = cfg.shipping && typeof cfg.shipping === "object" ? cfg.shipping : {};
//   const numToStr = (v) => {
//     if (v == null || v === "") return "";
//     const n = Number(v);
//     return Number.isFinite(n) ? String(n) : String(v);
//   };
//   const valueType =
//     o.valueType === "FIXED_AMOUNT" || p.valueType === "FIXED_AMOUNT"
//       ? "FIXED_AMOUNT"
//       : "PERCENTAGE";
//   const amountStr =
//     o.amountOff != null && o.amountOff !== ""
//       ? String(o.amountOff)
//       : p.amountOff != null && p.amountOff !== ""
//         ? String(p.amountOff)
//         : "";
//   return {
//     discountValueType: valueType,
//     amountOff: amountStr,
//     percentage: numToStr(o.percentage),
//     orderPercentage: numToStr(o.percentage),
//     productPercentage: numToStr(p.percentage),
//     shippingPercentage: numToStr(s.percentage),
//     orderMessage: String(o.message || ""),
//     productMessage: String(p.message || ""),
//     shippingMessage: String(s.message || ""),
//     orderSelectionStrategy: String(o.selectionStrategy || "FIRST").toUpperCase(),
//     productSelectionStrategy: String(p.selectionStrategy || "FIRST").toUpperCase(),
//   };
// }

// function makeFunctionConfig({
//   existingConfig,
//   discountValueType, amountOff,
//   orderPercentage, productPercentage, shippingPercentage,
//   orderMessage, productMessage, shippingMessage,
//   orderSelectionStrategy, productSelectionStrategy,
// }) {
//   const normalizedType = discountValueType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
//   const normalizedAmountOff = Number.isFinite(Number(amountOff)) ? Math.max(0, Number(amountOff)) : 0;
//   const prev =
//     existingConfig && typeof existingConfig === "object" && !Array.isArray(existingConfig)
//       ? existingConfig
//       : {};
//   const shippingBase =
//     prev.shipping && typeof prev.shipping === "object" && !Array.isArray(prev.shipping)
//       ? prev.shipping
//       : {};
//   return JSON.stringify({
//     ...prev,
//     order: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: orderPercentage,
//       message: orderMessage,
//       selectionStrategy: orderSelectionStrategy,
//     },
//     product: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: productPercentage,
//       message: productMessage,
//       selectionStrategy: productSelectionStrategy,
//     },
//     shipping: {
//       ...shippingBase,
//       percentage: shippingPercentage,
//       message: shippingMessage,
//     },
//   });
// }

// function isoToLocalDateTimeInput(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }

// function localDateTimeInputToIso(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   return d.toISOString();
// }

// /**
//  * Convert a DiscountNode GID → the correct mutation GID.
//  *
//  * discountNodes returns:  gid://shopify/DiscountNode/123
//  * Delete/update need:     gid://shopify/DiscountAutomaticNode/123
//  *                      or gid://shopify/DiscountCodeNode/123
//  *
//  * The numeric part is identical — we just swap the type segment.
//  */
// function toMutationId(nodeId, typename) {
//   if (typename === "DiscountAutomaticApp") {
//     return nodeId.replace("/DiscountNode/", "/DiscountAutomaticNode/");
//   }
//   if (typename === "DiscountCodeBasic") {
//     return nodeId.replace("/DiscountNode/", "/DiscountCodeNode/");
//   }
//   return nodeId;
// }

// /** Human-readable discount value for a DiscountCodeBasic node */
// function formatCodeDiscountValue(discount) {
//   const val = discount?.customerGets?.value;
//   if (!val) return "—";
//   if (val.percentage != null) return `${(val.percentage * 100).toFixed(0)}% off`;
//   if (val.amount?.amount != null)
//     return `${val.amount.currencyCode} ${Number(val.amount.amount).toFixed(2)} off`;
//   return "—";
// }

// // ─── Loader ──────────────────────────────────────────────────────────────────

// export const loader = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("editId");

//   const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
//   const json = await response.json();
//   const appDiscountTypes = json?.data?.appDiscountTypes || [];
//   const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
//   const allNodes = json?.data?.discountNodes?.nodes || [];

//   // ✅ FIX: show BOTH code discounts AND this app's automatic discounts
//   const nodes = allNodes.filter((n) => {
//     const d = n?.discount;
//     if (!d) return false;
//     if (d.__typename === "DiscountCodeBasic") return true;
//     if (d.__typename === "DiscountAutomaticApp")
//       return appFunctionIds.has(d?.appDiscountType?.functionId);
//     return false;
//   });

//   const found = editId ? nodes.find((n) => n.id === editId) : null;
//   const discount = found?.discount;

//   // Restore value type + amounts when editing a code discount
//   const existingValueType =
//     discount?.__typename === "DiscountCodeBasic"
//       ? discount?.customerGets?.value?.percentage != null ? "PERCENTAGE" : "FIXED_AMOUNT"
//       : "PERCENTAGE";
//   const existingPercentage =
//     discount?.__typename === "DiscountCodeBasic" &&
//     discount?.customerGets?.value?.percentage != null
//       ? String((Number(discount.customerGets.value.percentage) * 100).toFixed(0))
//       : "";
//   const existingAmountOff =
//     discount?.__typename === "DiscountCodeBasic" &&
//     discount?.customerGets?.value?.amount?.amount != null
//       ? String(Number(discount.customerGets.value.amount.amount).toFixed(2))
//       : "";

//   const functionConfig =
//     discount?.__typename === "DiscountAutomaticApp"
//       ? parseFunctionConfigMetafield(found?.metafield)
//       : null;

//   const editDiscount = found ? {
//     id: found.id,
//     // ✅ FIX: pass typename so the action can convert DiscountNode → correct mutation ID
//     typename: discount?.__typename || "",
//     mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
//     title: discount?.title || "",
//     code: discount?.codes?.nodes?.[0]?.code || "",
//     functionId: discount?.appDiscountType?.functionId || "",
//     discountClasses: discount?.discountClasses || [],
//     combinesWithOrder: Boolean(discount?.combinesWith?.orderDiscounts),
//     combinesWithProduct: Boolean(discount?.combinesWith?.productDiscounts),
//     combinesWithShipping: Boolean(discount?.combinesWith?.shippingDiscounts),
//     appliesOnOneTimePurchase: discount?.appliesOnOneTimePurchase ?? true,
//     appliesOnSubscription: discount?.appliesOnSubscription ?? false,
//     discountValueType: existingValueType,
//     percentage: existingPercentage,
//     amountOff: existingAmountOff,
//     startsAt: discount?.startsAt || "",
//     endsAt: discount?.endsAt || "",
//     /** Parsed default/function-configuration metafield (automatic app discounts only) */
//     functionConfig,
//   } : null;

//   return { nodes, appDiscountTypes, editDiscount, errors: json?.errors || null };
// };

// // ─── Action ──────────────────────────────────────────────────────────────────

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const intent = String(formData.get("intent") || "");
//   const id = String(formData.get("id") || "");
//   const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
//   const mode = modeRaw === "custom" ? "custom" : "code";
//   // ✅ FIX: typename of the discount being edited — used to convert DiscountNode GID
//   const discountType = String(formData.get("discountType") || "");

//   if (intent === "delete") {
//     // discountType is already read above
//     const isAutomatic = discountType === "DiscountAutomaticApp";
//     // ✅ FIX: convert DiscountNode GID → DiscountAutomaticNode or DiscountCodeNode GID
//     const mutationId = toMutationId(id, discountType);
//     const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, { variables: { id: mutationId } });
//     const json = await response.json();
//     const payload = isAutomatic ? json?.data?.discountAutomaticDelete : json?.data?.discountCodeDelete;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const title = String(formData.get("title") || "").trim();
//   const code = String(formData.get("code") || "").trim().toUpperCase();
//   const functionId = String(formData.get("functionId") || "").trim();
//   const functionHandle = String(formData.get("functionHandle") || "").trim();
//   const startsAtRaw = String(formData.get("startsAt") || "").trim();
//   const endsAtRaw = String(formData.get("endsAt") || "").trim();
//   const segmentId = String(formData.get("segmentId") || "").trim();
//   const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
//   const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
//   const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
//   const appliesOnOneTimePurchase = String(formData.get("appliesOnOneTimePurchase") || "") === "on";
//   const appliesOnSubscription = String(formData.get("appliesOnSubscription") || "") === "on";
//   const discountClassProduct = String(formData.get("discountClassProduct") || "") === "on";
//   const discountClassOrder = String(formData.get("discountClassOrder") || "") === "on";
//   const discountClassShipping = String(formData.get("discountClassShipping") || "") === "on";
//   const discountClasses = [
//     ...(discountClassProduct ? ["PRODUCT"] : []),
//     ...(discountClassOrder ? ["ORDER"] : []),
//     ...(discountClassShipping ? ["SHIPPING"] : []),
//   ];
//   const orderPercentage = Number(String(formData.get("orderPercentage") ?? "").trim());
//   const productPercentage = Number(String(formData.get("productPercentage") ?? "").trim());
//   const shippingPercentage = Number(String(formData.get("shippingPercentage") ?? "").trim());
//   const orderMessage = String(formData.get("orderMessage") ?? "").trim();
//   const productMessage = String(formData.get("productMessage") ?? "").trim();
//   const shippingMessage = String(formData.get("shippingMessage") ?? "").trim();
//   const orderSelectionStrategy = String(formData.get("orderSelectionStrategy") || "FIRST").trim().toUpperCase();
//   const productSelectionStrategy = String(formData.get("productSelectionStrategy") || "FIRST").trim().toUpperCase();
//   const discountValueType = String(formData.get("discountValueType") || "PERCENTAGE").trim().toUpperCase();
//   const percentage = Number(String(formData.get("percentage") || "").trim());
//   const amountOff = Number(String(formData.get("amountOff") || "").trim());
//   const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
//   const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

//   const errors = {};
//   if (!["code", "custom"].includes(modeRaw)) errors.mode = 'Mode must be "code" or "custom"';
//   if (!title) errors.title = "Title is required";
//   if (!["PERCENTAGE", "FIXED_AMOUNT"].includes(discountValueType))
//     errors.discountValueType = "Discount type must be Percentage or Fixed Amount";
//   if (discountValueType === "PERCENTAGE" && (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100))
//     errors.percentage = "Percentage must be between 1 and 100";
//   if (discountValueType === "FIXED_AMOUNT" && (!Number.isFinite(amountOff) || amountOff <= 0))
//     errors.amountOff = "Price off must be greater than 0";
//   if (mode === "code" && !code) errors.code = "Code is required";
//   if (mode === "custom" && !functionId && !functionHandle)
//     errors.functionId = "Function ID or Function Handle is required";
//   if (mode === "custom" && !discountClasses.length)
//     errors.discountClasses = "Select at least one discount class (Product, Order, or Shipping)";
//   if (mode === "custom" && (!Number.isFinite(orderPercentage) || orderPercentage < 0 || orderPercentage > 100))
//     errors.orderPercentage = "Order percentage must be between 0 and 100";
//   if (mode === "custom" && (!Number.isFinite(productPercentage) || productPercentage < 0 || productPercentage > 100))
//     errors.productPercentage = "Product percentage must be between 0 and 100";
//   if (mode === "custom" && (!Number.isFinite(shippingPercentage) || shippingPercentage < 0 || shippingPercentage > 100))
//     errors.shippingPercentage = "Shipping percentage must be between 0 and 100";
//   if (mode === "custom" && !orderMessage) errors.orderMessage = "Order discount message is required";
//   if (mode === "custom" && !productMessage) errors.productMessage = "Product discount message is required";
//   if (mode === "custom" && !shippingMessage) errors.shippingMessage = "Shipping discount message is required";
//   if (mode === "custom" && !["FIRST", "MAXIMUM"].includes(orderSelectionStrategy))
//     errors.orderSelectionStrategy = "Order selection strategy must be FIRST or MAXIMUM";
//   if (mode === "custom" && !["ALL", "FIRST", "MAXIMUM"].includes(productSelectionStrategy))
//     errors.productSelectionStrategy = "Product selection strategy must be ALL, FIRST, or MAXIMUM";
//   if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
//   if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) errors.endsAt = "Invalid end date";
//   if (!Number.isNaN(startsAt.getTime())) {
//     const y = startsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
//   }
//   if (endsAt && !Number.isNaN(endsAt.getTime())) {
//     const y = endsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
//   }
//   if (endsAt && endsAt.getTime() <= startsAt.getTime())
//     errors.endsAt = "End date must be after start date";

//   if (mode === "custom" && !functionHandle && functionId) {
//     try {
//       const typesResponse = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
//       const typesJson = await typesResponse.json();
//       const availableFunctionIds = new Set(
//         (typesJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
//       );
//       if (!availableFunctionIds.has(functionId))
//         errors.functionId = "Selected Function ID is no longer available. Pick a current one or use Function Handle.";
//     } catch {
//       errors.functionId = "Unable to validate Function ID right now. Try using Function Handle or refresh and submit again.";
//     }
//   }

//   if (Object.keys(errors).length) return { ok: false, errors };

//   // ── Custom (automatic app) discount ───────────────────────────────────────
//   if (mode === "custom") {
//     let existingFunctionConfig = null;
//     if (intent === "update" && id) {
//       try {
//         const cfgRes = await admin.graphql(GET_DISCOUNT_FUNCTION_CONFIG, {
//           variables: { id },
//         });
//         const cfgJson = await cfgRes.json();
//         const mf = cfgJson?.data?.discountNode?.metafield;
//         existingFunctionConfig = parseFunctionConfigMetafield(mf);
//       } catch {
//         existingFunctionConfig = null;
//       }
//     }

//     const functionRef = functionHandle ? { functionHandle } : functionId ? { functionId } : {};
//     const automaticAppDiscount = {
//       title,
//       ...functionRef,
//       startsAt: startsAt.toISOString(),
//       ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//       discountClasses,
//       appliesOnOneTimePurchase,
//       appliesOnSubscription,
//       combinesWith: {
//         orderDiscounts: combinesWithOrder,
//         productDiscounts: combinesWithProduct,
//         shippingDiscounts: combinesWithShipping,
//       },
//       metafields: [{
//         namespace: "default",
//         key: "function-configuration",
//         type: "json",
//         value: makeFunctionConfig({
//           existingConfig: existingFunctionConfig,
//           discountValueType, amountOff,
//           orderPercentage, productPercentage, shippingPercentage,
//           orderMessage, productMessage, shippingMessage,
//           orderSelectionStrategy, productSelectionStrategy,
//         }),
//       }],
//     };
//     const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
//     // ✅ FIX: discountAutomaticAppUpdate needs DiscountAutomaticNode GID, not DiscountNode GID
//     const mutationId = toMutationId(id, discountType || "DiscountAutomaticApp");
//     const variables = intent === "update" ? { id: mutationId, automaticAppDiscount } : { automaticAppDiscount };
//     let json;
//     try {
//       const response = await admin.graphql(mutation, { variables });
//       json = await response.json();
//     } catch (error) {
//       return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] } };
//     }
//     const payload = intent === "update" ? json?.data?.discountAutomaticAppUpdate : json?.data?.discountAutomaticAppCreate;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   // ── Code discount ─────────────────────────────────────────────────────────
//   const basicCodeDiscount = {
//     title, code,
//     startsAt: startsAt.toISOString(),
//     ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//     customerSelection: segmentId ? { customerSegments: { add: [segmentId] } } : { all: true },
//     combinesWith: {
//       orderDiscounts: combinesWithOrder,
//       productDiscounts: combinesWithProduct,
//       shippingDiscounts: combinesWithShipping,
//     },
//     customerGets: {
//       items: { all: true },
//       value: discountValueType === "FIXED_AMOUNT"
//         ? { discountAmount: { amount: String(amountOff), appliesOnEachItem: false } }
//         : { percentage: percentage / 100 },
//     },
//   };
//   const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
//   // ✅ FIX: discountCodeBasicUpdate needs DiscountCodeNode GID, not DiscountNode GID
//   const mutationId = toMutationId(id, discountType || "DiscountCodeBasic");
//   const variables = intent === "update" ? { id: mutationId, basicCodeDiscount } : { basicCodeDiscount };
//   let json;
//   try {
//     const response = await admin.graphql(mutation, { variables });
//     json = await response.json();
//   } catch (error) {
//     return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] } };
//   }
//   const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
//   if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//   if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//   return { ok: true };
// };

// // ─── Component ───────────────────────────────────────────────────────────────

// export default function DiscountsIndex() {
//   const { nodes, appDiscountTypes, errors, editDiscount } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();

//   const [filter, setFilter] = useState("");
//   const [mode, setMode] = useState(editDiscount?.mode || "custom");
//   const [title, setTitle] = useState(editDiscount?.title || "");
//   const [code, setCode] = useState(editDiscount?.code || "");
//   const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
//   const [startsAt, setStartsAt] = useState("");
//   const [endsAt, setEndsAt] = useState("");
//   const [segmentId, setSegmentId] = useState("");
//   const [combinesWithOrder, setCombinesWithOrder] = useState(editDiscount?.combinesWithOrder ?? false);
//   const [combinesWithProduct, setCombinesWithProduct] = useState(editDiscount?.combinesWithProduct ?? false);
//   const [combinesWithShipping, setCombinesWithShipping] = useState(editDiscount?.combinesWithShipping ?? false);
//   const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(editDiscount?.appliesOnOneTimePurchase ?? true);
//   const [appliesOnSubscription, setAppliesOnSubscription] = useState(editDiscount?.appliesOnSubscription ?? false);
//   const [discountClassProduct, setDiscountClassProduct] = useState(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
//   const [discountClassOrder, setDiscountClassOrder] = useState(editDiscount?.discountClasses?.includes("ORDER") ?? false);
//   const [discountClassShipping, setDiscountClassShipping] = useState(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
//   // ✅ FIX: initialized from editDiscount so edit pre-fills correctly
//   const [discountValueType, setDiscountValueType] = useState(editDiscount?.discountValueType || "PERCENTAGE");
//   const [percentage, setPercentage] = useState(editDiscount?.percentage || "");
//   const [amountOff, setAmountOff] = useState(editDiscount?.amountOff || "");
//   const [orderPercentage, setOrderPercentage] = useState("");
//   const [productPercentage, setProductPercentage] = useState("");
//   const [shippingPercentage, setShippingPercentage] = useState("");
//   const [orderMessage, setOrderMessage] = useState("");
//   const [productMessage, setProductMessage] = useState("");
//   const [shippingMessage, setShippingMessage] = useState("");
//   const [orderSelectionStrategy, setOrderSelectionStrategy] = useState("FIRST");
//   const [productSelectionStrategy, setProductSelectionStrategy] = useState("FIRST");

//   const editDiscountId = editDiscount?.id || "__new__";

//   useEffect(() => {
//     setMode(editDiscount?.mode || "custom");
//     setTitle(editDiscount?.title || "");
//     setCode(editDiscount?.code || "");
//     setFunctionId(editDiscount?.functionId || "");
//     setDiscountClassProduct(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
//     setDiscountClassOrder(editDiscount?.discountClasses?.includes("ORDER") ?? false);
//     setDiscountClassShipping(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
//     setCombinesWithOrder(editDiscount?.combinesWithOrder ?? false);
//     setCombinesWithProduct(editDiscount?.combinesWithProduct ?? false);
//     setCombinesWithShipping(editDiscount?.combinesWithShipping ?? false);
//     setAppliesOnOneTimePurchase(editDiscount?.appliesOnOneTimePurchase ?? true);
//     setAppliesOnSubscription(editDiscount?.appliesOnSubscription ?? false);
//     const cf = customFieldsFromFunctionConfig(editDiscount?.functionConfig || null);
//     if (editDiscount?.mode === "custom" && cf) {
//       setDiscountValueType(cf.discountValueType);
//       setAmountOff(cf.amountOff);
//       setPercentage(cf.percentage || "");
//       setOrderPercentage(cf.orderPercentage);
//       setProductPercentage(cf.productPercentage);
//       setShippingPercentage(cf.shippingPercentage);
//       setOrderMessage(cf.orderMessage);
//       setProductMessage(cf.productMessage);
//       setShippingMessage(cf.shippingMessage);
//       setOrderSelectionStrategy(cf.orderSelectionStrategy);
//       setProductSelectionStrategy(cf.productSelectionStrategy);
//     } else {
//       setDiscountValueType(editDiscount?.discountValueType || "PERCENTAGE");
//       setPercentage(editDiscount?.percentage || "");
//       setAmountOff(editDiscount?.amountOff || "");
//       setOrderPercentage("");
//       setProductPercentage("");
//       setShippingPercentage("");
//       setOrderMessage("");
//       setProductMessage("");
//       setShippingMessage("");
//       setOrderSelectionStrategy("FIRST");
//       setProductSelectionStrategy("FIRST");
//     }
//     setStartsAt(isoToLocalDateTimeInput(editDiscount?.startsAt || ""));
//     setEndsAt(isoToLocalDateTimeInput(editDiscount?.endsAt || ""));
//   }, [editDiscountId]);

//   const withShopifyParams = (path) => {
//     const [pathname, existingQuery = ""] = path.split("?");
//     const current = new URLSearchParams(location.search);
//     const keep = new URLSearchParams(existingQuery);
//     for (const key of ["host", "shop"]) {
//       const val = current.get(key);
//       if (val && !keep.has(key)) keep.set(key, val);
//     }
//     const qs = keep.toString();
//     return qs ? `${pathname}?${qs}` : pathname;
//   };

//   const filtered = useMemo(() => {
//     const q = filter.trim().toLowerCase();
//     if (!q) return nodes;
//     return nodes.filter((n) => {
//       const d = n.discount || {};
//       const codeVal = d?.codes?.nodes?.[0]?.code || "";
//       return `${d.title || ""} ${codeVal} ${d.__typename || ""}`.toLowerCase().includes(q);
//     });
//   }, [filter, nodes]);

//   const functionOptions = useMemo(() => {
//     const byId = new Map();
//     for (const t of appDiscountTypes || []) {
//       const id = t?.functionId;
//       if (!id) continue;
//       byId.set(id, t?.title ? `${t.title} — ${id}` : id);
//     }
//     return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
//   }, [appDiscountTypes]);

//   useEffect(() => {
//     if (mode === "custom" && !editDiscount && !functionId && functionOptions.length)
//       setFunctionId(functionOptions[0].id || "");
//   }, [editDiscount, functionId, functionOptions, mode]);

//   useEffect(() => {
//     if (!functionOptions.length) return;
//     const validIds = new Set(functionOptions.map((o) => o.id));
//     if (mode === "custom" && (!functionId || !validIds.has(functionId)))
//       setFunctionId(functionOptions[0].id || "");
//   }, [functionId, functionOptions, mode]);

//   const sectionStyle = { border: "1px solid #e1e3e5", borderRadius: 10, padding: 16, marginBottom: 14, background: "#fafafa" };
//   const sectionHeadingStyle = { margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#1a1a1a" };
//   const checkboxStyle = { display: "block", marginBottom: 8 };
//   const errorStyle = { color: "#8a1f17", marginTop: 6, fontSize: 13 };
//   const selectStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid #c9cccf", minWidth: 220 };
//   const subHeadStyle = { margin: "12px 0 8px", fontSize: 13, fontWeight: 600 };

//   return (
//     <s-page heading="Discounts">
//       {/* ── Create / Edit form ─────────────────────────────────────────────── */}
//       <s-section heading={editDiscount ? "Edit discount" : "Create discount"}>
//         <Form method="post">
//           {editDiscount && <input type="hidden" name="id" value={editDiscount.id} />}
//           {/* ✅ FIX: pass typename so action can convert DiscountNode → correct mutation ID on update */}
//           {editDiscount && <input type="hidden" name="discountType" value={editDiscount.typename} />}
//           <input type="hidden" name="intent" value={editDiscount ? "update" : "create"} />

//           {/* 1. Basic settings */}
//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>1. Basic settings</h3>

//             <label style={{ display: "block", marginBottom: 10 }}>
//               <div style={{ marginBottom: 4, fontWeight: 500 }}>Discount mode</div>
//               <select name="mode" value={mode} onChange={(e) => setMode(e.currentTarget.value)} style={selectStyle}>
//                 <option value="custom">Automatic (app function)</option>
//                 <option value="code">Code discount</option>
//               </select>
//               {actionData?.errors?.mode && <p style={errorStyle}>{actionData.errors.mode}</p>}
//             </label>

//             <s-text-field name="title" label="Title" value={title}
//               onChange={(e) => setTitle(e.currentTarget.value)}
//               error={actionData?.errors?.title} autocomplete="off">
//             </s-text-field>

//             {mode === "code" ? (
//               <s-text-field name="code" label="Discount code (e.g. SUMMER20)" value={code}
//                 onChange={(e) => setCode(e.currentTarget.value)}
//                 error={actionData?.errors?.code} autocomplete="off">
//               </s-text-field>
//             ) : (
//               <>
//                 <input type="hidden" name="functionId" value={functionId} />
//                 <input type="hidden" name="functionHandle" value="" />
//                 {functionOptions.length > 0
//                   ? <p style={{ marginTop: 4, marginBottom: 8, color: "#6d7175", fontSize: 13 }}>✅ Function ID auto-selected: <strong>{functionId || "none"}</strong></p>
//                   : <p style={{ marginTop: 6, color: "#8a1f17", fontSize: 13 }}>⚠️ No function IDs found. Deploy your discount function then refresh.</p>
//                 }
//                 {actionData?.errors?.functionId && <p style={errorStyle}>{actionData.errors.functionId}</p>}
//               </>
//             )}
//           </div>

//           {/* 2. Discount value — shown for BOTH modes ✅ */}
//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>2. Discount value</h3>

//             <label style={{ display: "block", marginBottom: 10 }}>
//               <div style={{ marginBottom: 4, fontWeight: 500 }}>Discount type</div>
//               <select name="discountValueType" value={discountValueType}
//                 onChange={(e) => setDiscountValueType(e.currentTarget.value)} style={selectStyle}>
//                 <option value="PERCENTAGE">Percentage off (%)</option>
//                 <option value="FIXED_AMOUNT">Fixed price off ($)</option>
//               </select>
//               {actionData?.errors?.discountValueType && <p style={errorStyle}>{actionData.errors.discountValueType}</p>}
//             </label>

//             {discountValueType === "PERCENTAGE" ? (
//               <>
//                 <s-text-field name="percentage" label="Percentage off (e.g. 10 for 10%)" value={percentage}
//                   onChange={(e) => setPercentage(e.currentTarget.value)}
//                   error={actionData?.errors?.percentage} autocomplete="off" type="number" min="1" max="100">
//                 </s-text-field>
//                 <input type="hidden" name="amountOff" value="" />
//               </>
//             ) : (
//               <>
//                 <s-text-field name="amountOff" label="Fixed price off amount (e.g. 5.00)" value={amountOff}
//                   onChange={(e) => setAmountOff(e.currentTarget.value)}
//                   error={actionData?.errors?.amountOff} autocomplete="off" type="number" min="0.01" step="0.01">
//                 </s-text-field>
//                 <input type="hidden" name="percentage" value="" />
//               </>
//             )}
//           </div>

//           {/* 3. Schedule and audience */}
//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>3. Schedule and audience</h3>
//             <input type="hidden" name="startsAt" value={localDateTimeInputToIso(startsAt)} />
//             <input type="hidden" name="endsAt" value={localDateTimeInputToIso(endsAt)} />
//             <label style={{ display: "block", marginBottom: 10 }}>
//               <div style={{ marginBottom: 4, fontWeight: 500 }}>Starts at (optional)</div>
//               <input type="datetime-local" value={startsAt}
//                 onChange={(e) => setStartsAt(e.currentTarget.value)}
//                 style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #c9cccf", boxSizing: "border-box" }} />
//               {actionData?.errors?.startsAt && <p style={errorStyle}>{actionData.errors.startsAt}</p>}
//             </label>
//             <label style={{ display: "block", marginBottom: 10 }}>
//               <div style={{ marginBottom: 4, fontWeight: 500 }}>Ends at (optional)</div>
//               <input type="datetime-local" value={endsAt}
//                 onChange={(e) => setEndsAt(e.currentTarget.value)}
//                 style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #c9cccf", boxSizing: "border-box" }} />
//               {actionData?.errors?.endsAt && <p style={errorStyle}>{actionData.errors.endsAt}</p>}
//             </label>
//             <s-text-field name="segmentId" label="Customer segment ID (optional)" value={segmentId}
//               onChange={(e) => setSegmentId(e.currentTarget.value)} autocomplete="off">
//             </s-text-field>
//           </div>

//           {/* 4. Combination rules */}
//           <div style={sectionStyle}>
//             <h3 style={sectionHeadingStyle}>4. Combination rules</h3>
//             <label style={checkboxStyle}>
//               <input type="checkbox" name="combinesWithOrder" checked={combinesWithOrder}
//                 onChange={(e) => setCombinesWithOrder(e.currentTarget.checked)} />{" "}
//               Combine with order discounts
//             </label>
//             <label style={checkboxStyle}>
//               <input type="checkbox" name="combinesWithProduct" checked={combinesWithProduct}
//                 onChange={(e) => setCombinesWithProduct(e.currentTarget.checked)} />{" "}
//               Combine with product discounts
//             </label>
//             <label style={checkboxStyle}>
//               <input type="checkbox" name="combinesWithShipping" checked={combinesWithShipping}
//                 onChange={(e) => setCombinesWithShipping(e.currentTarget.checked)} />{" "}
//               Combine with shipping discounts
//             </label>
//           </div>

//           {/* 5. Custom function options (automatic mode only) */}
//           {mode === "custom" && (
//             <div style={sectionStyle}>
//               <h3 style={sectionHeadingStyle}>5. Custom function options</h3>

//               <p style={subHeadStyle}>Discount classes</p>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassProduct" checked={discountClassProduct}
//                   onChange={(e) => setDiscountClassProduct(e.currentTarget.checked)} /> Product
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassOrder" checked={discountClassOrder}
//                   onChange={(e) => setDiscountClassOrder(e.currentTarget.checked)} /> Order
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="discountClassShipping" checked={discountClassShipping}
//                   onChange={(e) => setDiscountClassShipping(e.currentTarget.checked)} /> Shipping
//               </label>
//               {actionData?.errors?.discountClasses && (
//                 <p style={{ ...errorStyle, marginBottom: 10 }}>{actionData.errors.discountClasses}</p>
//               )}

//               <p style={subHeadStyle}>Per-class percentages (passed to your function)</p>
//               <s-text-field name="orderPercentage" label="Order discount %" value={orderPercentage}
//                 onChange={(e) => setOrderPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.orderPercentage} autocomplete="off" type="number" min="0" max="100">
//               </s-text-field>
//               <s-text-field name="productPercentage" label="Product discount %" value={productPercentage}
//                 onChange={(e) => setProductPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.productPercentage} autocomplete="off" type="number" min="0" max="100">
//               </s-text-field>
//               <s-text-field name="shippingPercentage" label="Shipping discount %" value={shippingPercentage}
//                 onChange={(e) => setShippingPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingPercentage} autocomplete="off" type="number" min="0" max="100">
//               </s-text-field>

//               <p style={subHeadStyle}>Discount messages (shown to customer)</p>
//               <s-text-field name="orderMessage" label="Order discount message" value={orderMessage}
//                 onChange={(e) => setOrderMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.orderMessage} autocomplete="off">
//               </s-text-field>
//               <s-text-field name="productMessage" label="Product discount message" value={productMessage}
//                 onChange={(e) => setProductMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.productMessage} autocomplete="off">
//               </s-text-field>
//               <s-text-field name="shippingMessage" label="Shipping discount message" value={shippingMessage}
//                 onChange={(e) => setShippingMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingMessage} autocomplete="off">
//               </s-text-field>

//               <p style={subHeadStyle}>Selection strategies</p>
//               <label style={{ display: "block", marginBottom: 10 }}>
//                 <div style={{ marginBottom: 4 }}>Order selection strategy</div>
//                 <select name="orderSelectionStrategy" value={orderSelectionStrategy}
//                   onChange={(e) => setOrderSelectionStrategy(e.currentTarget.value)} style={selectStyle}>
//                   <option value="FIRST">FIRST</option>
//                   <option value="MAXIMUM">MAXIMUM</option>
//                 </select>
//                 {actionData?.errors?.orderSelectionStrategy && <p style={errorStyle}>{actionData.errors.orderSelectionStrategy}</p>}
//               </label>
//               <label style={{ display: "block", marginBottom: 10 }}>
//                 <div style={{ marginBottom: 4 }}>Product selection strategy</div>
//                 <select name="productSelectionStrategy" value={productSelectionStrategy}
//                   onChange={(e) => setProductSelectionStrategy(e.currentTarget.value)} style={selectStyle}>
//                   <option value="ALL">ALL</option>
//                   <option value="FIRST">FIRST</option>
//                   <option value="MAXIMUM">MAXIMUM</option>
//                 </select>
//                 {actionData?.errors?.productSelectionStrategy && <p style={errorStyle}>{actionData.errors.productSelectionStrategy}</p>}
//               </label>

//               <p style={subHeadStyle}>Application scope</p>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="appliesOnOneTimePurchase" checked={appliesOnOneTimePurchase}
//                   onChange={(e) => setAppliesOnOneTimePurchase(e.currentTarget.checked)} /> Applies on one-time purchases
//               </label>
//               <label style={checkboxStyle}>
//                 <input type="checkbox" name="appliesOnSubscription" checked={appliesOnSubscription}
//                   onChange={(e) => setAppliesOnSubscription(e.currentTarget.checked)} /> Applies on subscriptions
//               </label>
//             </div>
//           )}

//           <s-stack direction="inline" gap="base">
//             <s-button type="submit">{editDiscount ? "Update discount" : "Create discount"}</s-button>
//             {editDiscount && <a href={withShopifyParams("")}>Cancel edit</a>}
//           </s-stack>
//         </Form>
//       </s-section>

//       {/* ── Errors ─────────────────────────────────────────────────────────── */}
//       {(errors?.length || actionData?.errors) && (
//         <s-section heading="Errors">
//           <s-box padding="base" borderWidth="base" borderRadius="base" background="critical-subdued">
//             <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
//               <code>{JSON.stringify(errors || actionData?.errors, null, 2)}</code>
//             </pre>
//           </s-box>
//         </s-section>
//       )}

//       {/* ── Discounts table ────────────────────────────────────────────────── */}
//       <s-section heading="My app discounts">
//         <s-text-field label="Search discounts" value={filter}
//           onChange={(e) => setFilter(e.currentTarget.value)} autocomplete="off">
//         </s-text-field>
//         <s-box padding="base" borderWidth="base" borderRadius="base">
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
//               <thead>
//                 <tr style={{ background: "#f6f6f7" }}>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Title</th>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Mode</th>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Code / Function ID</th>
//                   {/* ✅ NEW: Discount value column */}
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Discount value</th>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Status</th>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Used</th>
//                   <th style={{ textAlign: "left", padding: "10px 8px" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={7} style={{ padding: "20px 8px", color: "#6d7175", textAlign: "center" }}>
//                       No discounts found.
//                     </td>
//                   </tr>
//                 )}
//                 {filtered.map((n) => {
//                   const d = n.discount || {};
//                   const isAutomatic = d.__typename === "DiscountAutomaticApp";
//                   const method = isAutomatic ? "Automatic" : "Code";
//                   const ref = isAutomatic
//                     ? (d?.appDiscountType?.functionId || "—")
//                     : (d?.codes?.nodes?.[0]?.code || "—");
//                   const used = d?.asyncUsageCount ?? "—";
//                   // ✅ Show actual value for code discounts
//                   const valueDisplay = isAutomatic ? "Via function config" : formatCodeDiscountValue(d);
//                   return (
//                     <tr key={n.id} style={{ borderTop: "1px solid #e1e3e5" }}>
//                       <td style={{ padding: "9px 8px", fontWeight: 500 }}>{d.title || "—"}</td>
//                       <td style={{ padding: "9px 8px" }}>
//                         <span style={{
//                           display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 12,
//                           background: isAutomatic ? "#e3f1df" : "#e8f4fd",
//                           color: isAutomatic ? "#1d6226" : "#0b5394", fontWeight: 600,
//                         }}>{method}</span>
//                       </td>
//                       <td style={{ padding: "9px 8px", fontFamily: "monospace", fontSize: 12 }}>{ref}</td>
//                       <td style={{ padding: "9px 8px" }}>{valueDisplay}</td>
//                       <td style={{ padding: "9px 8px" }}>
//                         <span style={{
//                           display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 12,
//                           background: d.status === "ACTIVE" ? "#e3f1df" : "#f6f6f7",
//                           color: d.status === "ACTIVE" ? "#1d6226" : "#6d7175", fontWeight: 600,
//                         }}>{d.status || "—"}</span>
//                       </td>
//                       <td style={{ padding: "9px 8px" }}>{used}</td>
//                       <td style={{ padding: "9px 8px" }}>
//                         <s-stack direction="inline" gap="base">
//                           <Form method="get" action={withShopifyParams("")}>
//                             <input type="hidden" name="editId" value={n.id} />
//                             <button type="submit" style={{ border: "none", background: "transparent", color: "#005bd3", cursor: "pointer", padding: 0, fontWeight: 500 }}>
//                               Edit
//                             </button>
//                           </Form>
//                           <Form method="post">
//                             <input type="hidden" name="id" value={n.id} />
//                             {/* ✅ FIX: pass typename so action knows automatic vs code */}
//                             <input type="hidden" name="discountType" value={d.__typename} />
//                             <button type="submit" name="intent" value="delete"
//                               style={{ border: "none", background: "transparent", color: "#8a1f17", cursor: "pointer", padding: 0, fontWeight: 500 }}>
//                               Delete
//                             </button>
//                           </Form>
//                         </s-stack>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </s-box>
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);
















// import { useEffect, useMemo, useState } from "react";
// import {
//   Form,
//   useActionData,
//   useLoaderData,
//   useLocation,
//   useRouteError,
// } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// // ─── Style Injection ─────────────────────────────────────────────────────────

// function StyleInjector() {
//   useEffect(() => {
//     const fontLink = document.createElement("link");
//     fontLink.rel = "stylesheet";
//     fontLink.href =
//       "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap";
//     document.head.appendChild(fontLink);

//     const style = document.createElement("style");
//     style.id = "discount-ui-styles";
//     style.textContent = `
//       /* ── Base ─────────────────────────────────────────────────────── */
//       .d-root * {
//         font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
//         box-sizing: border-box;
//       }

//       /* ── Layout ───────────────────────────────────────────────────── */
//       .d-form-wrapper {
//         display: flex;
//         flex-direction: column;
//         gap: 0;
//       }

//       /* ── Section Cards ────────────────────────────────────────────── */
//       .d-section-card {
//         background: #ffffff;
//         border: 1px solid #e8eaed;
//         border-radius: 14px;
//         padding: 24px 28px;
//         margin-bottom: 16px;
//         box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 0 0 0 transparent;
//         transition: box-shadow 0.2s ease, border-color 0.2s ease;
//         position: relative;
//         overflow: hidden;
//       }
//       .d-section-card::before {
//         content: '';
//         position: absolute;
//         top: 0; left: 0; right: 0;
//         height: 3px;
//         background: linear-gradient(90deg, #2563eb, #7c3aed, #06b6d4);
//         opacity: 0;
//         transition: opacity 0.25s ease;
//       }
//       .d-section-card:focus-within::before { opacity: 1; }
//       .d-section-card:focus-within {
//         border-color: #c7d2fe;
//         box-shadow: 0 4px 20px rgba(37,99,235,0.08);
//       }

//       /* ── Section Heading ──────────────────────────────────────────── */
//       .d-section-heading {
//         display: flex;
//         align-items: center;
//         gap: 12px;
//         margin: 0 0 20px 0;
//       }
//       .d-step-badge {
//         width: 28px;
//         height: 28px;
//         border-radius: 50%;
//         background: linear-gradient(135deg, #2563eb, #7c3aed);
//         color: #fff;
//         font-size: 12px;
//         font-weight: 700;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         flex-shrink: 0;
//         letter-spacing: -0.3px;
//       }
//       .d-section-title {
//         font-size: 14px;
//         font-weight: 650;
//         color: #111827;
//         letter-spacing: -0.2px;
//         margin: 0;
//       }

//       /* ── Field Groups ─────────────────────────────────────────────── */
//       .d-field-row {
//         display: grid;
//         grid-template-columns: 1fr 1fr;
//         gap: 14px;
//       }
//       @media (max-width: 640px) {
//         .d-field-row { grid-template-columns: 1fr; }
//       }
//       .d-field-group {
//         display: flex;
//         flex-direction: column;
//         gap: 6px;
//         margin-bottom: 14px;
//       }
//       .d-field-group:last-child { margin-bottom: 0; }

//       /* ── Labels ───────────────────────────────────────────────────── */
//       .d-label {
//         font-size: 13px;
//         font-weight: 575;
//         color: #374151;
//         letter-spacing: 0.01em;
//       }
//       .d-label-sub {
//         font-size: 12px;
//         color: #6b7280;
//         font-weight: 400;
//         margin-top: 1px;
//       }

//       /* ── Inputs & Selects ─────────────────────────────────────────── */
//       .d-select, .d-datetime-input {
//         width: 100%;
//         padding: 10px 14px;
//         border-radius: 9px;
//         border: 1.5px solid #e5e7eb;
//         font-size: 14px;
//         font-family: 'DM Sans', system-ui, sans-serif;
//         font-weight: 450;
//         color: #111827;
//         background: #fafafa;
//         outline: none;
//         transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
//         -webkit-appearance: none;
//         appearance: none;
//       }
//       .d-select {
//         background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
//         background-repeat: no-repeat;
//         background-position: right 12px center;
//         padding-right: 36px;
//       }
//       .d-select:focus, .d-datetime-input:focus {
//         border-color: #2563eb;
//         background: #fff;
//         box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
//       }
//       .d-select:hover:not(:focus), .d-datetime-input:hover:not(:focus) {
//         border-color: #9ca3af;
//         background: #f9fafb;
//       }

//       /* ── Checkboxes ───────────────────────────────────────────────── */
//       .d-checkbox-group {
//         display: flex;
//         flex-direction: column;
//         gap: 2px;
//         margin-bottom: 4px;
//       }
//       .d-checkbox-label {
//         display: flex;
//         align-items: center;
//         gap: 10px;
//         padding: 9px 12px;
//         border-radius: 8px;
//         cursor: pointer;
//         font-size: 13.5px;
//         color: #374151;
//         font-weight: 450;
//         transition: background 0.15s ease;
//         border: 1.5px solid transparent;
//         user-select: none;
//       }
//       .d-checkbox-label:hover { background: #f3f4f6; border-color: #e5e7eb; }
//       .d-checkbox-label input[type="checkbox"] {
//         width: 16px;
//         height: 16px;
//         border-radius: 4px;
//         accent-color: #2563eb;
//         cursor: pointer;
//         flex-shrink: 0;
//       }
//       .d-checkbox-label.d-checked {
//         background: #eff6ff;
//         border-color: #bfdbfe;
//         color: #1d4ed8;
//         font-weight: 525;
//       }

//       /* ── Sub-headings inside sections ─────────────────────────────── */
//       .d-sub-heading {
//         font-size: 12px;
//         font-weight: 650;
//         color: #6b7280;
//         letter-spacing: 0.07em;
//         text-transform: uppercase;
//         margin: 18px 0 10px 0;
//         padding-bottom: 6px;
//         border-bottom: 1px solid #f3f4f6;
//       }
//       .d-sub-heading:first-child { margin-top: 0; }

//       /* ── Error messages ───────────────────────────────────────────── */
//       .d-error {
//         display: flex;
//         align-items: center;
//         gap: 5px;
//         font-size: 12.5px;
//         color: #dc2626;
//         font-weight: 475;
//         margin-top: 4px;
//         animation: d-shake 0.3s ease;
//       }
//       .d-error::before {
//         content: '!';
//         width: 15px;
//         height: 15px;
//         border-radius: 50%;
//         background: #dc2626;
//         color: #fff;
//         font-size: 10px;
//         font-weight: 700;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         flex-shrink: 0;
//       }
//       @keyframes d-shake {
//         0%, 100% { transform: translateX(0); }
//         25% { transform: translateX(-4px); }
//         75% { transform: translateX(4px); }
//       }

//       /* ── Info chips ───────────────────────────────────────────────── */
//       .d-info-chip {
//         display: inline-flex;
//         align-items: center;
//         gap: 6px;
//         padding: 6px 12px;
//         border-radius: 8px;
//         font-size: 12.5px;
//         font-weight: 525;
//         margin-top: 4px;
//       }
//       .d-info-chip.success {
//         background: #f0fdf4;
//         color: #166534;
//         border: 1px solid #bbf7d0;
//       }
//       .d-info-chip.warning {
//         background: #fffbeb;
//         color: #92400e;
//         border: 1px solid #fde68a;
//       }
//       .d-info-chip.info {
//         background: #eff6ff;
//         color: #1e40af;
//         border: 1px solid #bfdbfe;
//         font-family: 'DM Mono', monospace;
//         font-size: 11.5px;
//       }

//       /* ── Form Actions ─────────────────────────────────────────────── */
//       .d-form-actions {
//         display: flex;
//         align-items: center;
//         gap: 12px;
//         padding-top: 4px;
//         margin-top: 8px;
//       }
//       .d-btn-primary {
//         display: inline-flex;
//         align-items: center;
//         gap: 8px;
//         padding: 11px 22px;
//         border-radius: 9px;
//         background: linear-gradient(135deg, #2563eb, #4f46e5);
//         color: #fff;
//         font-size: 14px;
//         font-weight: 600;
//         font-family: 'DM Sans', sans-serif;
//         border: none;
//         cursor: pointer;
//         transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
//         box-shadow: 0 2px 8px rgba(37,99,235,0.3);
//         letter-spacing: -0.1px;
//       }
//       .d-btn-primary:hover {
//         transform: translateY(-1px);
//         box-shadow: 0 4px 16px rgba(37,99,235,0.4);
//       }
//       .d-btn-primary:active { transform: translateY(0); }
//       .d-cancel-link {
//         font-size: 13.5px;
//         font-weight: 500;
//         color: #6b7280;
//         text-decoration: none;
//         padding: 10px 14px;
//         border-radius: 8px;
//         transition: background 0.15s ease, color 0.15s ease;
//         border: 1.5px solid #e5e7eb;
//       }
//       .d-cancel-link:hover { background: #f3f4f6; color: #374151; }

//       /* ── Error Panel ──────────────────────────────────────────────── */
//       .d-error-panel {
//         background: #fef2f2;
//         border: 1.5px solid #fecaca;
//         border-radius: 12px;
//         padding: 16px 20px;
//       }
//       .d-error-panel pre {
//         margin: 0;
//         white-space: pre-wrap;
//         font-family: 'DM Mono', monospace;
//         font-size: 12px;
//         color: #991b1b;
//         line-height: 1.5;
//       }

//       /* ── Search bar ───────────────────────────────────────────────── */
//       .d-search-wrapper {
//         position: relative;
//         margin-bottom: 18px;
//       }
//       .d-search-icon {
//         position: absolute;
//         left: 14px;
//         top: 50%;
//         transform: translateY(-50%);
//         color: #9ca3af;
//         pointer-events: none;
//       }
//       .d-search-input {
//         width: 100%;
//         padding: 10px 14px 10px 40px;
//         border-radius: 10px;
//         border: 1.5px solid #e5e7eb;
//         font-size: 14px;
//         font-family: 'DM Sans', sans-serif;
//         color: #111827;
//         background: #fafafa;
//         outline: none;
//         transition: border-color 0.18s ease, box-shadow 0.18s ease;
//       }
//       .d-search-input:focus {
//         border-color: #2563eb;
//         box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
//         background: #fff;
//       }

//       /* ── Table ────────────────────────────────────────────────────── */
//       .d-table-wrapper {
//         overflow: hidden;
//         border-radius: 12px;
//         border: 1.5px solid #e8eaed;
//         box-shadow: 0 1px 6px rgba(0,0,0,0.04);
//       }
//       .d-table {
//         width: 100%;
//         border-collapse: collapse;
//         font-size: 13.5px;
//       }
//       .d-table thead tr {
//         background: linear-gradient(to right, #f8f9fb, #f1f3f8);
//       }
//       .d-table thead th {
//         padding: 13px 16px;
//         text-align: left;
//         font-size: 11.5px;
//         font-weight: 680;
//         color: #6b7280;
//         letter-spacing: 0.06em;
//         text-transform: uppercase;
//         white-space: nowrap;
//         border-bottom: 1.5px solid #e8eaed;
//       }
//       .d-table tbody tr {
//         border-top: 1px solid #f1f3f5;
//         transition: background 0.15s ease;
//       }
//       .d-table tbody tr:hover { background: #f8faff; }
//       .d-table tbody tr:first-child { border-top: none; }
//       .d-table td {
//         padding: 13px 16px;
//         vertical-align: middle;
//         color: #374151;
//       }
//       .d-table .td-title {
//         font-weight: 600;
//         color: #111827;
//         font-size: 13.5px;
//       }
//       .d-table .td-mono {
//         font-family: 'DM Mono', monospace;
//         font-size: 12px;
//         color: #4b5563;
//         background: #f3f4f6;
//         padding: 3px 8px;
//         border-radius: 5px;
//         display: inline-block;
//       }
//       .d-table .td-empty {
//         text-align: center;
//         padding: 40px;
//         color: #9ca3af;
//         font-size: 14px;
//       }

//       /* ── Badges ───────────────────────────────────────────────────── */
//       .d-badge {
//         display: inline-flex;
//         align-items: center;
//         gap: 5px;
//         padding: 3px 10px;
//         border-radius: 20px;
//         font-size: 11.5px;
//         font-weight: 650;
//         letter-spacing: 0.02em;
//         white-space: nowrap;
//       }
//       .d-badge::before {
//         content: '';
//         width: 6px;
//         height: 6px;
//         border-radius: 50%;
//         flex-shrink: 0;
//       }
//       .d-badge.badge-auto {
//         background: #f0fdf4;
//         color: #166534;
//         border: 1px solid #bbf7d0;
//       }
//       .d-badge.badge-auto::before { background: #22c55e; }
//       .d-badge.badge-code {
//         background: #eff6ff;
//         color: #1e40af;
//         border: 1px solid #bfdbfe;
//       }
//       .d-badge.badge-code::before { background: #3b82f6; }
//       .d-badge.badge-active {
//         background: #f0fdf4;
//         color: #166534;
//         border: 1px solid #bbf7d0;
//       }
//       .d-badge.badge-active::before { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
//       .d-badge.badge-inactive {
//         background: #f9fafb;
//         color: #6b7280;
//         border: 1px solid #e5e7eb;
//       }
//       .d-badge.badge-inactive::before { background: #d1d5db; }
//       .d-badge.badge-value {
//         background: #faf5ff;
//         color: #6d28d9;
//         border: 1px solid #ddd6fe;
//       }
//       .d-badge.badge-value::before { background: #8b5cf6; }

//       /* ── Action Buttons in table ──────────────────────────────────── */
//       .d-tbl-btn {
//         background: none;
//         border: 1.5px solid transparent;
//         border-radius: 6px;
//         cursor: pointer;
//         padding: 4px 10px;
//         font-size: 12.5px;
//         font-weight: 575;
//         font-family: 'DM Sans', sans-serif;
//         transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
//       }
//       .d-tbl-btn.edit {
//         color: #2563eb;
//       }
//       .d-tbl-btn.edit:hover {
//         background: #eff6ff;
//         border-color: #bfdbfe;
//       }
//       .d-tbl-btn.delete {
//         color: #dc2626;
//       }
//       .d-tbl-btn.delete:hover {
//         background: #fef2f2;
//         border-color: #fecaca;
//       }

//       /* ── Usage count ──────────────────────────────────────────────── */
//       .d-usage-count {
//         font-variant-numeric: tabular-nums;
//         font-weight: 600;
//         color: #111827;
//       }

//       /* ── Divider between checkbox groups ──────────────────────────── */
//       .d-divider {
//         border: none;
//         border-top: 1px solid #f3f4f6;
//         margin: 14px 0;
//       }
//     `;
//     document.head.appendChild(style);
//     return () => {
//       document.head.removeChild(fontLink);
//       document.head.removeChild(style);
//     };
//   }, []);
//   return null;
// }

// // ─── GraphQL ────────────────────────────────────────────────────────────────

// const LIST_DISCOUNTS = `#graphql
//   query ListDiscountNodes($first: Int!) {
//     discountNodes(first: $first, reverse: true) {
//       nodes {
//         id
//         metafield(namespace: "default", key: "function-configuration") {
//           jsonValue
//           value
//         }
//         discount {
//           __typename
//           ... on DiscountCodeBasic {
//             title
//             status
//             startsAt
//             endsAt
//             asyncUsageCount
//             codes(first: 1) { nodes { code } }
//             customerGets {
//               value {
//                 ... on DiscountPercentage { percentage }
//                 ... on DiscountAmount {
//                   amount { amount currencyCode }
//                   appliesOnEachItem
//                 }
//               }
//             }
//             combinesWith {
//               orderDiscounts
//               productDiscounts
//               shippingDiscounts
//             }
//           }
//           ... on DiscountAutomaticApp {
//             title
//             status
//             startsAt
//             endsAt
//             asyncUsageCount
//             appliesOnOneTimePurchase
//             appliesOnSubscription
//             discountClasses
//             combinesWith {
//               orderDiscounts
//               productDiscounts
//               shippingDiscounts
//             }
//             appDiscountType { functionId }
//           }
//         }
//       }
//     }
//     appDiscountTypes {
//       functionId
//       title
//     }
//   }
// `;

// const LIST_APP_DISCOUNT_TYPES = `#graphql
//   query ListAppDiscountTypes {
//     appDiscountTypes { functionId }
//   }
// `;

// const CREATE_CODE = `#graphql
//   mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CODE = `#graphql
//   mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
//     discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
//       codeDiscountNode { id }
//       userErrors { field message }
//     }
//   }
// `;
// const CREATE_CUSTOM = `#graphql
//   mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const UPDATE_CUSTOM = `#graphql
//   mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
//       automaticAppDiscount { discountId title }
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_CODE = `#graphql
//   mutation DeleteCode($id: ID!) {
//     discountCodeDelete(id: $id) {
//       deletedCodeDiscountId
//       userErrors { field message }
//     }
//   }
// `;
// const DELETE_AUTOMATIC = `#graphql
//   mutation DeleteAutomatic($id: ID!) {
//     discountAutomaticDelete(id: $id) {
//       deletedAutomaticDiscountId
//       userErrors { field message }
//     }
//   }
// `;

// const GET_DISCOUNT_FUNCTION_CONFIG = `#graphql
//   query DiscountFunctionConfig($id: ID!) {
//     discountNode(id: $id) {
//       id
//       metafield(namespace: "default", key: "function-configuration") {
//         jsonValue
//         value
//       }
//     }
//   }
// `;

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// function parseFunctionConfigMetafield(metafield) {
//   if (!metafield) return null;
//   if (metafield.jsonValue != null && typeof metafield.jsonValue === "object") {
//     return metafield.jsonValue;
//   }
//   const raw = metafield.value;
//   if (typeof raw !== "string" || !raw.trim()) return null;
//   try {
//     const parsed = JSON.parse(raw);
//     return parsed && typeof parsed === "object" ? parsed : null;
//   } catch {
//     return null;
//   }
// }

// function customFieldsFromFunctionConfig(cfg) {
//   if (!cfg || typeof cfg !== "object") return null;
//   const o = cfg.order && typeof cfg.order === "object" ? cfg.order : {};
//   const p = cfg.product && typeof cfg.product === "object" ? cfg.product : {};
//   const s = cfg.shipping && typeof cfg.shipping === "object" ? cfg.shipping : {};
//   const numToStr = (v) => {
//     if (v == null || v === "") return "";
//     const n = Number(v);
//     return Number.isFinite(n) ? String(n) : String(v);
//   };
//   const valueType =
//     o.valueType === "FIXED_AMOUNT" || p.valueType === "FIXED_AMOUNT"
//       ? "FIXED_AMOUNT"
//       : "PERCENTAGE";
//   const amountStr =
//     o.amountOff != null && o.amountOff !== ""
//       ? String(o.amountOff)
//       : p.amountOff != null && p.amountOff !== ""
//         ? String(p.amountOff)
//         : "";
//   return {
//     discountValueType: valueType,
//     amountOff: amountStr,
//     percentage: numToStr(o.percentage),
//     orderPercentage: numToStr(o.percentage),
//     productPercentage: numToStr(p.percentage),
//     shippingPercentage: numToStr(s.percentage),
//     orderMessage: String(o.message || ""),
//     productMessage: String(p.message || ""),
//     shippingMessage: String(s.message || ""),
//     orderSelectionStrategy: String(o.selectionStrategy || "FIRST").toUpperCase(),
//     productSelectionStrategy: String(p.selectionStrategy || "FIRST").toUpperCase(),
//   };
// }

// function makeFunctionConfig({
//   existingConfig,
//   discountValueType, amountOff,
//   orderPercentage, productPercentage, shippingPercentage,
//   orderMessage, productMessage, shippingMessage,
//   orderSelectionStrategy, productSelectionStrategy,
// }) {
//   const normalizedType = discountValueType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
//   const normalizedAmountOff = Number.isFinite(Number(amountOff)) ? Math.max(0, Number(amountOff)) : 0;
//   const prev =
//     existingConfig && typeof existingConfig === "object" && !Array.isArray(existingConfig)
//       ? existingConfig
//       : {};
//   const shippingBase =
//     prev.shipping && typeof prev.shipping === "object" && !Array.isArray(prev.shipping)
//       ? prev.shipping
//       : {};
//   return JSON.stringify({
//     ...prev,
//     order: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: orderPercentage,
//       message: orderMessage,
//       selectionStrategy: orderSelectionStrategy,
//     },
//     product: {
//       valueType: normalizedType,
//       amountOff: normalizedAmountOff,
//       percentage: productPercentage,
//       message: productMessage,
//       selectionStrategy: productSelectionStrategy,
//     },
//     shipping: {
//       ...shippingBase,
//       percentage: shippingPercentage,
//       message: shippingMessage,
//     },
//   });
// }

// function isoToLocalDateTimeInput(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   const pad = (n) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// }

// function localDateTimeInputToIso(value) {
//   if (!value) return "";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   return d.toISOString();
// }

// function toMutationId(nodeId, typename) {
//   if (typename === "DiscountAutomaticApp") {
//     return nodeId.replace("/DiscountNode/", "/DiscountAutomaticNode/");
//   }
//   if (typename === "DiscountCodeBasic") {
//     return nodeId.replace("/DiscountNode/", "/DiscountCodeNode/");
//   }
//   return nodeId;
// }

// function formatCodeDiscountValue(discount) {
//   const val = discount?.customerGets?.value;
//   if (!val) return null;
//   if (val.percentage != null) return `${(val.percentage * 100).toFixed(0)}% off`;
//   if (val.amount?.amount != null)
//     return `${val.amount.currencyCode} ${Number(val.amount.amount).toFixed(2)} off`;
//   return null;
// }

// // ─── Loader ──────────────────────────────────────────────────────────────────

// export const loader = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const url = new URL(request.url);
//   const editId = url.searchParams.get("editId");

//   const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
//   const json = await response.json();
//   const appDiscountTypes = json?.data?.appDiscountTypes || [];
//   const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
//   const allNodes = json?.data?.discountNodes?.nodes || [];

//   const nodes = allNodes.filter((n) => {
//     const d = n?.discount;
//     if (!d) return false;
//     if (d.__typename === "DiscountCodeBasic") return true;
//     if (d.__typename === "DiscountAutomaticApp")
//       return appFunctionIds.has(d?.appDiscountType?.functionId);
//     return false;
//   });

//   const found = editId ? nodes.find((n) => n.id === editId) : null;
//   const discount = found?.discount;

//   const existingValueType =
//     discount?.__typename === "DiscountCodeBasic"
//       ? discount?.customerGets?.value?.percentage != null ? "PERCENTAGE" : "FIXED_AMOUNT"
//       : "PERCENTAGE";
//   const existingPercentage =
//     discount?.__typename === "DiscountCodeBasic" &&
//     discount?.customerGets?.value?.percentage != null
//       ? String((Number(discount.customerGets.value.percentage) * 100).toFixed(0))
//       : "";
//   const existingAmountOff =
//     discount?.__typename === "DiscountCodeBasic" &&
//     discount?.customerGets?.value?.amount?.amount != null
//       ? String(Number(discount.customerGets.value.amount.amount).toFixed(2))
//       : "";

//   const functionConfig =
//     discount?.__typename === "DiscountAutomaticApp"
//       ? parseFunctionConfigMetafield(found?.metafield)
//       : null;

//   const editDiscount = found ? {
//     id: found.id,
//     typename: discount?.__typename || "",
//     mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
//     title: discount?.title || "",
//     code: discount?.codes?.nodes?.[0]?.code || "",
//     functionId: discount?.appDiscountType?.functionId || "",
//     discountClasses: discount?.discountClasses || [],
//     combinesWithOrder: Boolean(discount?.combinesWith?.orderDiscounts),
//     combinesWithProduct: Boolean(discount?.combinesWith?.productDiscounts),
//     combinesWithShipping: Boolean(discount?.combinesWith?.shippingDiscounts),
//     appliesOnOneTimePurchase: discount?.appliesOnOneTimePurchase ?? true,
//     appliesOnSubscription: discount?.appliesOnSubscription ?? false,
//     discountValueType: existingValueType,
//     percentage: existingPercentage,
//     amountOff: existingAmountOff,
//     startsAt: discount?.startsAt || "",
//     endsAt: discount?.endsAt || "",
//     functionConfig,
//   } : null;

//   return { nodes, appDiscountTypes, editDiscount, errors: json?.errors || null };
// };

// // ─── Action ──────────────────────────────────────────────────────────────────

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const intent = String(formData.get("intent") || "");
//   const id = String(formData.get("id") || "");
//   const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
//   const mode = modeRaw === "custom" ? "custom" : "code";
//   const discountType = String(formData.get("discountType") || "");

//   if (intent === "delete") {
//     const isAutomatic = discountType === "DiscountAutomaticApp";
//     const mutationId = toMutationId(id, discountType);
//     const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, { variables: { id: mutationId } });
//     const json = await response.json();
//     const payload = isAutomatic ? json?.data?.discountAutomaticDelete : json?.data?.discountCodeDelete;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const title = String(formData.get("title") || "").trim();
//   const code = String(formData.get("code") || "").trim().toUpperCase();
//   const functionId = String(formData.get("functionId") || "").trim();
//   const functionHandle = String(formData.get("functionHandle") || "").trim();
//   const startsAtRaw = String(formData.get("startsAt") || "").trim();
//   const endsAtRaw = String(formData.get("endsAt") || "").trim();
//   const segmentId = String(formData.get("segmentId") || "").trim();
//   const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
//   const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
//   const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
//   const appliesOnOneTimePurchase = String(formData.get("appliesOnOneTimePurchase") || "") === "on";
//   const appliesOnSubscription = String(formData.get("appliesOnSubscription") || "") === "on";
//   const discountClassProduct = String(formData.get("discountClassProduct") || "") === "on";
//   const discountClassOrder = String(formData.get("discountClassOrder") || "") === "on";
//   const discountClassShipping = String(formData.get("discountClassShipping") || "") === "on";
//   const discountClasses = [
//     ...(discountClassProduct ? ["PRODUCT"] : []),
//     ...(discountClassOrder ? ["ORDER"] : []),
//     ...(discountClassShipping ? ["SHIPPING"] : []),
//   ];
//   const orderPercentage = Number(String(formData.get("orderPercentage") ?? "").trim());
//   const productPercentage = Number(String(formData.get("productPercentage") ?? "").trim());
//   const shippingPercentage = Number(String(formData.get("shippingPercentage") ?? "").trim());
//   const orderMessage = String(formData.get("orderMessage") ?? "").trim();
//   const productMessage = String(formData.get("productMessage") ?? "").trim();
//   const shippingMessage = String(formData.get("shippingMessage") ?? "").trim();
//   const orderSelectionStrategy = String(formData.get("orderSelectionStrategy") || "FIRST").trim().toUpperCase();
//   const productSelectionStrategy = String(formData.get("productSelectionStrategy") || "FIRST").trim().toUpperCase();
//   const discountValueType = String(formData.get("discountValueType") || "PERCENTAGE").trim().toUpperCase();
//   const percentage = Number(String(formData.get("percentage") || "").trim());
//   const amountOff = Number(String(formData.get("amountOff") || "").trim());
//   const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
//   const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

//   const errors = {};
//   if (!["code", "custom"].includes(modeRaw)) errors.mode = 'Mode must be "code" or "custom"';
//   if (!title) errors.title = "Title is required";
//   if (!["PERCENTAGE", "FIXED_AMOUNT"].includes(discountValueType))
//     errors.discountValueType = "Discount type must be Percentage or Fixed Amount";
//   if (discountValueType === "PERCENTAGE" && (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100))
//     errors.percentage = "Percentage must be between 1 and 100";
//   if (discountValueType === "FIXED_AMOUNT" && (!Number.isFinite(amountOff) || amountOff <= 0))
//     errors.amountOff = "Price off must be greater than 0";
//   if (mode === "code" && !code) errors.code = "Code is required";
//   if (mode === "custom" && !functionId && !functionHandle)
//     errors.functionId = "Function ID or Function Handle is required";
//   if (mode === "custom" && !discountClasses.length)
//     errors.discountClasses = "Select at least one discount class (Product, Order, or Shipping)";
//   if (mode === "custom" && (!Number.isFinite(orderPercentage) || orderPercentage < 0 || orderPercentage > 100))
//     errors.orderPercentage = "Order percentage must be between 0 and 100";
//   if (mode === "custom" && (!Number.isFinite(productPercentage) || productPercentage < 0 || productPercentage > 100))
//     errors.productPercentage = "Product percentage must be between 0 and 100";
//   if (mode === "custom" && (!Number.isFinite(shippingPercentage) || shippingPercentage < 0 || shippingPercentage > 100))
//     errors.shippingPercentage = "Shipping percentage must be between 0 and 100";
//   if (mode === "custom" && !orderMessage) errors.orderMessage = "Order discount message is required";
//   if (mode === "custom" && !productMessage) errors.productMessage = "Product discount message is required";
//   if (mode === "custom" && !shippingMessage) errors.shippingMessage = "Shipping discount message is required";
//   if (mode === "custom" && !["FIRST", "MAXIMUM"].includes(orderSelectionStrategy))
//     errors.orderSelectionStrategy = "Order selection strategy must be FIRST or MAXIMUM";
//   if (mode === "custom" && !["ALL", "FIRST", "MAXIMUM"].includes(productSelectionStrategy))
//     errors.productSelectionStrategy = "Product selection strategy must be ALL, FIRST, or MAXIMUM";
//   if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
//   if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) errors.endsAt = "Invalid end date";
//   if (!Number.isNaN(startsAt.getTime())) {
//     const y = startsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
//   }
//   if (endsAt && !Number.isNaN(endsAt.getTime())) {
//     const y = endsAt.getUTCFullYear();
//     if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
//   }
//   if (endsAt && endsAt.getTime() <= startsAt.getTime())
//     errors.endsAt = "End date must be after start date";

//   if (mode === "custom" && !functionHandle && functionId) {
//     try {
//       const typesResponse = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
//       const typesJson = await typesResponse.json();
//       const availableFunctionIds = new Set(
//         (typesJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
//       );
//       if (!availableFunctionIds.has(functionId))
//         errors.functionId = "Selected Function ID is no longer available. Pick a current one or use Function Handle.";
//     } catch {
//       errors.functionId = "Unable to validate Function ID right now. Try using Function Handle or refresh and submit again.";
//     }
//   }

//   if (Object.keys(errors).length) return { ok: false, errors };

//   if (mode === "custom") {
//     let existingFunctionConfig = null;
//     if (intent === "update" && id) {
//       try {
//         const cfgRes = await admin.graphql(GET_DISCOUNT_FUNCTION_CONFIG, { variables: { id } });
//         const cfgJson = await cfgRes.json();
//         const mf = cfgJson?.data?.discountNode?.metafield;
//         existingFunctionConfig = parseFunctionConfigMetafield(mf);
//       } catch {
//         existingFunctionConfig = null;
//       }
//     }

//     const functionRef = functionHandle ? { functionHandle } : functionId ? { functionId } : {};
//     const automaticAppDiscount = {
//       title,
//       ...functionRef,
//       startsAt: startsAt.toISOString(),
//       ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//       discountClasses,
//       appliesOnOneTimePurchase,
//       appliesOnSubscription,
//       combinesWith: {
//         orderDiscounts: combinesWithOrder,
//         productDiscounts: combinesWithProduct,
//         shippingDiscounts: combinesWithShipping,
//       },
//       metafields: [{
//         namespace: "default",
//         key: "function-configuration",
//         type: "json",
//         value: makeFunctionConfig({
//           existingConfig: existingFunctionConfig,
//           discountValueType, amountOff,
//           orderPercentage, productPercentage, shippingPercentage,
//           orderMessage, productMessage, shippingMessage,
//           orderSelectionStrategy, productSelectionStrategy,
//         }),
//       }],
//     };
//     const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
//     const mutationId = toMutationId(id, discountType || "DiscountAutomaticApp");
//     const variables = intent === "update" ? { id: mutationId, automaticAppDiscount } : { automaticAppDiscount };
//     let json;
//     try {
//       const response = await admin.graphql(mutation, { variables });
//       json = await response.json();
//     } catch (error) {
//       return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] } };
//     }
//     const payload = intent === "update" ? json?.data?.discountAutomaticAppUpdate : json?.data?.discountAutomaticAppCreate;
//     if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//     if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//     return { ok: true };
//   }

//   const basicCodeDiscount = {
//     title, code,
//     startsAt: startsAt.toISOString(),
//     ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
//     customerSelection: segmentId ? { customerSegments: { add: [segmentId] } } : { all: true },
//     combinesWith: {
//       orderDiscounts: combinesWithOrder,
//       productDiscounts: combinesWithProduct,
//       shippingDiscounts: combinesWithShipping,
//     },
//     customerGets: {
//       items: { all: true },
//       value: discountValueType === "FIXED_AMOUNT"
//         ? { discountAmount: { amount: String(amountOff), appliesOnEachItem: false } }
//         : { percentage: percentage / 100 },
//     },
//   };
//   const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
//   const mutationId = toMutationId(id, discountType || "DiscountCodeBasic");
//   const variables = intent === "update" ? { id: mutationId, basicCodeDiscount } : { basicCodeDiscount };
//   let json;
//   try {
//     const response = await admin.graphql(mutation, { variables });
//     json = await response.json();
//   } catch (error) {
//     return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] } };
//   }
//   const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
//   if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
//   if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
//   return { ok: true };
// };

// // ─── Sub-components ───────────────────────────────────────────────────────────

// function SectionCard({ step, title, children }) {
//   return (
//     <div className="d-section-card">
//       <div className="d-section-heading">
//         {step && <span className="d-step-badge">{step}</span>}
//         <h3 className="d-section-title">{title}</h3>
//       </div>
//       {children}
//     </div>
//   );
// }

// function FieldGroup({ label, sublabel, error, children }) {
//   return (
//     <div className="d-field-group">
//       {label && (
//         <label className="d-label">
//           {label}
//           {sublabel && <span className="d-label-sub">{sublabel}</span>}
//         </label>
//       )}
//       {children}
//       {error && <span className="d-error">{error}</span>}
//     </div>
//   );
// }

// function CheckboxLabel({ checked, onChange, name, children }) {
//   return (
//     <label className={`d-checkbox-label${checked ? " d-checked" : ""}`}>
//       <input type="checkbox" name={name} checked={checked} onChange={onChange} />
//       {children}
//     </label>
//   );
// }

// function SubHeading({ children }) {
//   return <p className="d-sub-heading">{children}</p>;
// }

// // ─── Component ───────────────────────────────────────────────────────────────

// export default function DiscountsIndex() {
//   const { nodes, appDiscountTypes, errors, editDiscount } = useLoaderData();
//   const actionData = useActionData();
//   const location = useLocation();

//   const [filter, setFilter] = useState("");
//   const [mode, setMode] = useState(editDiscount?.mode || "custom");
//   const [title, setTitle] = useState(editDiscount?.title || "");
//   const [code, setCode] = useState(editDiscount?.code || "");
//   const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
//   const [startsAt, setStartsAt] = useState("");
//   const [endsAt, setEndsAt] = useState("");
//   const [segmentId, setSegmentId] = useState("");
//   const [combinesWithOrder, setCombinesWithOrder] = useState(editDiscount?.combinesWithOrder ?? false);
//   const [combinesWithProduct, setCombinesWithProduct] = useState(editDiscount?.combinesWithProduct ?? false);
//   const [combinesWithShipping, setCombinesWithShipping] = useState(editDiscount?.combinesWithShipping ?? false);
//   const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(editDiscount?.appliesOnOneTimePurchase ?? true);
//   const [appliesOnSubscription, setAppliesOnSubscription] = useState(editDiscount?.appliesOnSubscription ?? false);
//   const [discountClassProduct, setDiscountClassProduct] = useState(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
//   const [discountClassOrder, setDiscountClassOrder] = useState(editDiscount?.discountClasses?.includes("ORDER") ?? false);
//   const [discountClassShipping, setDiscountClassShipping] = useState(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
//   const [discountValueType, setDiscountValueType] = useState(editDiscount?.discountValueType || "PERCENTAGE");
//   const [percentage, setPercentage] = useState(editDiscount?.percentage || "");
//   const [amountOff, setAmountOff] = useState(editDiscount?.amountOff || "");
//   const [orderPercentage, setOrderPercentage] = useState("");
//   const [productPercentage, setProductPercentage] = useState("");
//   const [shippingPercentage, setShippingPercentage] = useState("");
//   const [orderMessage, setOrderMessage] = useState("");
//   const [productMessage, setProductMessage] = useState("");
//   const [shippingMessage, setShippingMessage] = useState("");
//   const [orderSelectionStrategy, setOrderSelectionStrategy] = useState("FIRST");
//   const [productSelectionStrategy, setProductSelectionStrategy] = useState("FIRST");

//   const editDiscountId = editDiscount?.id || "__new__";

//   useEffect(() => {
//     setMode(editDiscount?.mode || "custom");
//     setTitle(editDiscount?.title || "");
//     setCode(editDiscount?.code || "");
//     setFunctionId(editDiscount?.functionId || "");
//     setDiscountClassProduct(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
//     setDiscountClassOrder(editDiscount?.discountClasses?.includes("ORDER") ?? false);
//     setDiscountClassShipping(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
//     setCombinesWithOrder(editDiscount?.combinesWithOrder ?? false);
//     setCombinesWithProduct(editDiscount?.combinesWithProduct ?? false);
//     setCombinesWithShipping(editDiscount?.combinesWithShipping ?? false);
//     setAppliesOnOneTimePurchase(editDiscount?.appliesOnOneTimePurchase ?? true);
//     setAppliesOnSubscription(editDiscount?.appliesOnSubscription ?? false);
//     const cf = customFieldsFromFunctionConfig(editDiscount?.functionConfig || null);
//     if (editDiscount?.mode === "custom" && cf) {
//       setDiscountValueType(cf.discountValueType);
//       setAmountOff(cf.amountOff);
//       setPercentage(cf.percentage || "");
//       setOrderPercentage(cf.orderPercentage);
//       setProductPercentage(cf.productPercentage);
//       setShippingPercentage(cf.shippingPercentage);
//       setOrderMessage(cf.orderMessage);
//       setProductMessage(cf.productMessage);
//       setShippingMessage(cf.shippingMessage);
//       setOrderSelectionStrategy(cf.orderSelectionStrategy);
//       setProductSelectionStrategy(cf.productSelectionStrategy);
//     } else {
//       setDiscountValueType(editDiscount?.discountValueType || "PERCENTAGE");
//       setPercentage(editDiscount?.percentage || "");
//       setAmountOff(editDiscount?.amountOff || "");
//       setOrderPercentage("");
//       setProductPercentage("");
//       setShippingPercentage("");
//       setOrderMessage("");
//       setProductMessage("");
//       setShippingMessage("");
//       setOrderSelectionStrategy("FIRST");
//       setProductSelectionStrategy("FIRST");
//     }
//     setStartsAt(isoToLocalDateTimeInput(editDiscount?.startsAt || ""));
//     setEndsAt(isoToLocalDateTimeInput(editDiscount?.endsAt || ""));
//   }, [editDiscountId]);

//   const withShopifyParams = (path) => {
//     const [pathname, existingQuery = ""] = path.split("?");
//     const current = new URLSearchParams(location.search);
//     const keep = new URLSearchParams(existingQuery);
//     for (const key of ["host", "shop"]) {
//       const val = current.get(key);
//       if (val && !keep.has(key)) keep.set(key, val);
//     }
//     const qs = keep.toString();
//     return qs ? `${pathname}?${qs}` : pathname;
//   };

//   const filtered = useMemo(() => {
//     const q = filter.trim().toLowerCase();
//     if (!q) return nodes;
//     return nodes.filter((n) => {
//       const d = n.discount || {};
//       const codeVal = d?.codes?.nodes?.[0]?.code || "";
//       return `${d.title || ""} ${codeVal} ${d.__typename || ""}`.toLowerCase().includes(q);
//     });
//   }, [filter, nodes]);

//   const functionOptions = useMemo(() => {
//     const byId = new Map();
//     for (const t of appDiscountTypes || []) {
//       const id = t?.functionId;
//       if (!id) continue;
//       byId.set(id, t?.title ? `${t.title} — ${id}` : id);
//     }
//     return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
//   }, [appDiscountTypes]);

//   useEffect(() => {
//     if (mode === "custom" && !editDiscount && !functionId && functionOptions.length)
//       setFunctionId(functionOptions[0].id || "");
//   }, [editDiscount, functionId, functionOptions, mode]);

//   useEffect(() => {
//     if (!functionOptions.length) return;
//     const validIds = new Set(functionOptions.map((o) => o.id));
//     if (mode === "custom" && (!functionId || !validIds.has(functionId)))
//       setFunctionId(functionOptions[0].id || "");
//   }, [functionId, functionOptions, mode]);

//   return (
//     <s-page heading="Discounts" className="d-root">
//       <StyleInjector />

//       {/* ── Create / Edit form ─────────────────────────────────────────────── */}
//       <s-section heading={editDiscount ? "Edit discount" : "Create discount"}>
//         <Form method="post" className="d-form-wrapper">
//           {editDiscount && <input type="hidden" name="id" value={editDiscount.id} />}
//           {editDiscount && <input type="hidden" name="discountType" value={editDiscount.typename} />}
//           <input type="hidden" name="intent" value={editDiscount ? "update" : "create"} />

//           {/* 1. Basic settings */}
//           <SectionCard step="1" title="Basic settings">
//             <FieldGroup label="Discount mode" error={actionData?.errors?.mode}>
//               <select
//                 name="mode"
//                 value={mode}
//                 onChange={(e) => setMode(e.currentTarget.value)}
//                 className="d-select"
//               >
//                 <option value="custom">Automatic (app function)</option>
//                 <option value="code">Code discount</option>
//               </select>
//             </FieldGroup>

//             <s-text-field
//               name="title"
//               label="Title"
//               value={title}
//               onChange={(e) => setTitle(e.currentTarget.value)}
//               error={actionData?.errors?.title}
//               autocomplete="off"
//             />

//             {mode === "code" ? (
//               <s-text-field
//                 name="code"
//                 label="Discount code (e.g. SUMMER20)"
//                 value={code}
//                 onChange={(e) => setCode(e.currentTarget.value)}
//                 error={actionData?.errors?.code}
//                 autocomplete="off"
//               />
//             ) : (
//               <>
//                 <input type="hidden" name="functionId" value={functionId} />
//                 <input type="hidden" name="functionHandle" value="" />
//                 {functionOptions.length > 0 ? (
//                   <div className={`d-info-chip info`}>
//                     ✓ Function ID: {functionId || "none"}
//                   </div>
//                 ) : (
//                   <div className="d-info-chip warning">
//                     ⚠ No function IDs found — deploy your discount function and refresh.
//                   </div>
//                 )}
//                 {actionData?.errors?.functionId && (
//                   <span className="d-error">{actionData.errors.functionId}</span>
//                 )}
//               </>
//             )}
//           </SectionCard>

//           {/* 2. Discount value */}
//           <SectionCard step="2" title="Discount value">
//             <FieldGroup label="Discount type" error={actionData?.errors?.discountValueType}>
//               <select
//                 name="discountValueType"
//                 value={discountValueType}
//                 onChange={(e) => setDiscountValueType(e.currentTarget.value)}
//                 className="d-select"
//               >
//                 <option value="PERCENTAGE">Percentage off (%)</option>
//                 <option value="FIXED_AMOUNT">Fixed price off ($)</option>
//               </select>
//             </FieldGroup>

//             {discountValueType === "PERCENTAGE" ? (
//               <>
//                 <s-text-field
//                   name="percentage"
//                   label="Percentage off (e.g. 10 for 10%)"
//                   value={percentage}
//                   onChange={(e) => setPercentage(e.currentTarget.value)}
//                   error={actionData?.errors?.percentage}
//                   autocomplete="off"
//                   type="number"
//                   min="1"
//                   max="100"
//                 />
//                 <input type="hidden" name="amountOff" value="" />
//               </>
//             ) : (
//               <>
//                 <s-text-field
//                   name="amountOff"
//                   label="Fixed price off amount (e.g. 5.00)"
//                   value={amountOff}
//                   onChange={(e) => setAmountOff(e.currentTarget.value)}
//                   error={actionData?.errors?.amountOff}
//                   autocomplete="off"
//                   type="number"
//                   min="0.01"
//                   step="0.01"
//                 />
//                 <input type="hidden" name="percentage" value="" />
//               </>
//             )}
//           </SectionCard>

//           {/* 3. Schedule and audience */}
//           <SectionCard step="3" title="Schedule & audience">
//             <input type="hidden" name="startsAt" value={localDateTimeInputToIso(startsAt)} />
//             <input type="hidden" name="endsAt" value={localDateTimeInputToIso(endsAt)} />

//             <div className="d-field-row">
//               <FieldGroup label="Starts at" sublabel="Optional" error={actionData?.errors?.startsAt}>
//                 <input
//                   type="datetime-local"
//                   value={startsAt}
//                   onChange={(e) => setStartsAt(e.currentTarget.value)}
//                   className="d-datetime-input"
//                 />
//               </FieldGroup>
//               <FieldGroup label="Ends at" sublabel="Optional" error={actionData?.errors?.endsAt}>
//                 <input
//                   type="datetime-local"
//                   value={endsAt}
//                   onChange={(e) => setEndsAt(e.currentTarget.value)}
//                   className="d-datetime-input"
//                 />
//               </FieldGroup>
//             </div>

//             <s-text-field
//               name="segmentId"
//               label="Customer segment ID (optional)"
//               value={segmentId}
//               onChange={(e) => setSegmentId(e.currentTarget.value)}
//               autocomplete="off"
//             />
//           </SectionCard>

//           {/* 4. Combination rules */}
//           <SectionCard step="4" title="Combination rules">
//             <div className="d-checkbox-group">
//               <CheckboxLabel
//                 name="combinesWithOrder"
//                 checked={combinesWithOrder}
//                 onChange={(e) => setCombinesWithOrder(e.currentTarget.checked)}
//               >
//                 Combine with order discounts
//               </CheckboxLabel>
//               <CheckboxLabel
//                 name="combinesWithProduct"
//                 checked={combinesWithProduct}
//                 onChange={(e) => setCombinesWithProduct(e.currentTarget.checked)}
//               >
//                 Combine with product discounts
//               </CheckboxLabel>
//               <CheckboxLabel
//                 name="combinesWithShipping"
//                 checked={combinesWithShipping}
//                 onChange={(e) => setCombinesWithShipping(e.currentTarget.checked)}
//               >
//                 Combine with shipping discounts
//               </CheckboxLabel>
//             </div>
//           </SectionCard>

//           {/* 5. Custom function options (automatic mode only) */}
//           {mode === "custom" && (
//             <SectionCard step="5" title="Custom function options">
//               <SubHeading>Discount classes</SubHeading>
//               <div className="d-checkbox-group">
//                 <CheckboxLabel
//                   name="discountClassProduct"
//                   checked={discountClassProduct}
//                   onChange={(e) => setDiscountClassProduct(e.currentTarget.checked)}
//                 >
//                   Product discounts
//                 </CheckboxLabel>
//                 <CheckboxLabel
//                   name="discountClassOrder"
//                   checked={discountClassOrder}
//                   onChange={(e) => setDiscountClassOrder(e.currentTarget.checked)}
//                 >
//                   Order discounts
//                 </CheckboxLabel>
//                 <CheckboxLabel
//                   name="discountClassShipping"
//                   checked={discountClassShipping}
//                   onChange={(e) => setDiscountClassShipping(e.currentTarget.checked)}
//                 >
//                   Shipping discounts
//                 </CheckboxLabel>
//               </div>
//               {actionData?.errors?.discountClasses && (
//                 <span className="d-error">{actionData.errors.discountClasses}</span>
//               )}

//               <hr className="d-divider" />
//               <SubHeading>Per-class percentages</SubHeading>
//               <div className="d-field-row">
//                 <s-text-field
//                   name="orderPercentage"
//                   label="Order discount %"
//                   value={orderPercentage}
//                   onChange={(e) => setOrderPercentage(e.currentTarget.value)}
//                   error={actionData?.errors?.orderPercentage}
//                   autocomplete="off"
//                   type="number"
//                   min="0"
//                   max="100"
//                 />
//                 <s-text-field
//                   name="productPercentage"
//                   label="Product discount %"
//                   value={productPercentage}
//                   onChange={(e) => setProductPercentage(e.currentTarget.value)}
//                   error={actionData?.errors?.productPercentage}
//                   autocomplete="off"
//                   type="number"
//                   min="0"
//                   max="100"
//                 />
//               </div>
//               <s-text-field
//                 name="shippingPercentage"
//                 label="Shipping discount %"
//                 value={shippingPercentage}
//                 onChange={(e) => setShippingPercentage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingPercentage}
//                 autocomplete="off"
//                 type="number"
//                 min="0"
//                 max="100"
//               />

//               <hr className="d-divider" />
//               <SubHeading>Customer-facing messages</SubHeading>
//               <s-text-field
//                 name="orderMessage"
//                 label="Order discount message"
//                 value={orderMessage}
//                 onChange={(e) => setOrderMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.orderMessage}
//                 autocomplete="off"
//               />
//               <s-text-field
//                 name="productMessage"
//                 label="Product discount message"
//                 value={productMessage}
//                 onChange={(e) => setProductMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.productMessage}
//                 autocomplete="off"
//               />
//               <s-text-field
//                 name="shippingMessage"
//                 label="Shipping discount message"
//                 value={shippingMessage}
//                 onChange={(e) => setShippingMessage(e.currentTarget.value)}
//                 error={actionData?.errors?.shippingMessage}
//                 autocomplete="off"
//               />

//               <hr className="d-divider" />
//               <SubHeading>Selection strategies</SubHeading>
//               <div className="d-field-row">
//                 <FieldGroup label="Order selection strategy" error={actionData?.errors?.orderSelectionStrategy}>
//                   <select
//                     name="orderSelectionStrategy"
//                     value={orderSelectionStrategy}
//                     onChange={(e) => setOrderSelectionStrategy(e.currentTarget.value)}
//                     className="d-select"
//                   >
//                     <option value="FIRST">FIRST</option>
//                     <option value="MAXIMUM">MAXIMUM</option>
//                   </select>
//                 </FieldGroup>
//                 <FieldGroup label="Product selection strategy" error={actionData?.errors?.productSelectionStrategy}>
//                   <select
//                     name="productSelectionStrategy"
//                     value={productSelectionStrategy}
//                     onChange={(e) => setProductSelectionStrategy(e.currentTarget.value)}
//                     className="d-select"
//                   >
//                     <option value="ALL">ALL</option>
//                     <option value="FIRST">FIRST</option>
//                     <option value="MAXIMUM">MAXIMUM</option>
//                   </select>
//                 </FieldGroup>
//               </div>

//               <hr className="d-divider" />
//               <SubHeading>Application scope</SubHeading>
//               <div className="d-checkbox-group">
//                 <CheckboxLabel
//                   name="appliesOnOneTimePurchase"
//                   checked={appliesOnOneTimePurchase}
//                   onChange={(e) => setAppliesOnOneTimePurchase(e.currentTarget.checked)}
//                 >
//                   Applies on one-time purchases
//                 </CheckboxLabel>
//                 <CheckboxLabel
//                   name="appliesOnSubscription"
//                   checked={appliesOnSubscription}
//                   onChange={(e) => setAppliesOnSubscription(e.currentTarget.checked)}
//                 >
//                   Applies on subscriptions
//                 </CheckboxLabel>
//               </div>
//             </SectionCard>
//           )}

//           {/* Submit */}
//           <div className="d-form-actions">
//             <button type="submit" className="d-btn-primary">
//               {editDiscount ? "↑ Update discount" : "+ Create discount"}
//             </button>
//             {editDiscount && (
//               <a href={withShopifyParams("")} className="d-cancel-link">
//                 Cancel
//               </a>
//             )}
//           </div>
//         </Form>
//       </s-section>

//       {/* ── Errors ─────────────────────────────────────────────────────────── */}
//       {(errors?.length || actionData?.errors) && (
//         <s-section heading="Errors">
//           <div className="d-error-panel">
//             <pre>
//               <code>{JSON.stringify(errors || actionData?.errors, null, 2)}</code>
//             </pre>
//           </div>
//         </s-section>
//       )}

//       {/* ── Discounts table ────────────────────────────────────────────────── */}
//       <s-section heading="My app discounts">
//         <div className="d-search-wrapper">
//           <svg className="d-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//             <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
//           </svg>
//           <input
//             type="text"
//             placeholder="Search discounts by title, code, or type…"
//             value={filter}
//             onChange={(e) => setFilter(e.currentTarget.value)}
//             className="d-search-input"
//           />
//         </div>

//         <div className="d-table-wrapper">
//           <table className="d-table">
//             <thead>
//               <tr>
//                 <th>Title</th>
//                 <th>Mode</th>
//                 <th>Code / Function ID</th>
//                 <th>Value</th>
//                 <th>Status</th>
//                 <th>Used</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={7} className="td-empty">
//                     <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
//                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
//                         <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
//                         <rect x="9" y="3" width="6" height="4" rx="2" />
//                       </svg>
//                       No discounts found.
//                     </div>
//                   </td>
//                 </tr>
//               )}
//               {filtered.map((n) => {
//                 const d = n.discount || {};
//                 const isAutomatic = d.__typename === "DiscountAutomaticApp";
//                 const ref = isAutomatic
//                   ? (d?.appDiscountType?.functionId || "—")
//                   : (d?.codes?.nodes?.[0]?.code || "—");
//                 const used = d?.asyncUsageCount ?? "—";
//                 const valueDisplay = isAutomatic ? null : formatCodeDiscountValue(d);
//                 return (
//                   <tr key={n.id}>
//                     <td className="td-title">{d.title || "—"}</td>
//                     <td>
//                       <span className={`d-badge ${isAutomatic ? "badge-auto" : "badge-code"}`}>
//                         {isAutomatic ? "Automatic" : "Code"}
//                       </span>
//                     </td>
//                     <td>
//                       <span className="td-mono">{ref}</span>
//                     </td>
//                     <td>
//                       {valueDisplay ? (
//                         <span className="d-badge badge-value">{valueDisplay}</span>
//                       ) : (
//                         <span style={{ color: "#9ca3af", fontSize: 12 }}>Via function</span>
//                       )}
//                     </td>
//                     <td>
//                       <span className={`d-badge ${d.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}>
//                         {d.status || "—"}
//                       </span>
//                     </td>
//                     <td>
//                       <span className="d-usage-count">{used}</span>
//                     </td>
//                     <td>
//                       <div style={{ display: "flex", gap: 4 }}>
//                         <Form method="get" action={withShopifyParams("")}>
//                           <input type="hidden" name="editId" value={n.id} />
//                           <button type="submit" className="d-tbl-btn edit">Edit</button>
//                         </Form>
//                         <Form method="post">
//                           <input type="hidden" name="id" value={n.id} />
//                           <input type="hidden" name="discountType" value={d.__typename} />
//                           <button type="submit" name="intent" value="delete" className="d-tbl-btn delete">
//                             Delete
//                           </button>
//                         </Form>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       </s-section>
//     </s-page>
//   );
// }

// export function ErrorBoundary() {
//   return boundary.error(useRouteError());
// }

// export const headers = (headersArgs) => boundary.headers(headersArgs);



































import { useCallback, useEffect, useMemo, useState } from "react";
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

// ─── GraphQL ────────────────────────────────────────────────────────────────

const LIST_DISCOUNTS = `#graphql
  query ListDiscountNodes($first: Int!) {
    discountNodes(first: $first, reverse: true) {
      nodes {
        id
        metafield(namespace: "default", key: "function-configuration") {
          jsonValue
          value
        }
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            status
            startsAt
            endsAt
            asyncUsageCount
            codes(first: 1) { nodes { code } }
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount {
                  amount { amount currencyCode }
                  appliesOnEachItem
                }
              }
            }
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
          ... on DiscountAutomaticApp {
            title
            status
            startsAt
            endsAt
            asyncUsageCount
            appliesOnOneTimePurchase
            appliesOnSubscription
            discountClasses
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            appDiscountType { functionId }
          }
        }
      }
    }
    appDiscountTypes {
      functionId
      title
    }
  }
`;

const LIST_APP_DISCOUNT_TYPES = `#graphql
  query ListAppDiscountTypes {
    appDiscountTypes { functionId }
  }
`;

const CREATE_CODE = `#graphql
  mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;
const UPDATE_CODE = `#graphql
  mutation UpdateCode($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;
const CREATE_CUSTOM = `#graphql
  mutation CreateCustom($automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount { discountId title }
      userErrors { field message }
    }
  }
`;
const UPDATE_CUSTOM = `#graphql
  mutation UpdateCustom($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount { discountId title }
      userErrors { field message }
    }
  }
`;
const DELETE_CODE = `#graphql
  mutation DeleteCode($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`;
const DELETE_AUTOMATIC = `#graphql
  mutation DeleteAutomatic($id: ID!) {
    discountAutomaticDelete(id: $id) {
      deletedAutomaticDiscountId
      userErrors { field message }
    }
  }
`;

const GET_DISCOUNT_FUNCTION_CONFIG = `#graphql
  query DiscountFunctionConfig($id: ID!) {
    discountNode(id: $id) {
      id
      metafield(namespace: "default", key: "function-configuration") {
        jsonValue
        value
      }
    }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFunctionConfigMetafield(metafield) {
  if (!metafield) return null;
  if (metafield.jsonValue != null && typeof metafield.jsonValue === "object") {
    return metafield.jsonValue;
  }
  const raw = metafield.value;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function customFieldsFromFunctionConfig(cfg) {
  if (!cfg || typeof cfg !== "object") return null;
  const o = cfg.order && typeof cfg.order === "object" ? cfg.order : {};
  const p = cfg.product && typeof cfg.product === "object" ? cfg.product : {};
  const s = cfg.shipping && typeof cfg.shipping === "object" ? cfg.shipping : {};
  const numToStr = (v) => {
    if (v == null || v === "") return "";
    const n = Number(v);
    return Number.isFinite(n) ? String(n) : String(v);
  };
  const valueType =
    o.valueType === "FIXED_AMOUNT" || p.valueType === "FIXED_AMOUNT"
      ? "FIXED_AMOUNT"
      : "PERCENTAGE";
  const amountStr =
    o.amountOff != null && o.amountOff !== ""
      ? String(o.amountOff)
      : p.amountOff != null && p.amountOff !== ""
        ? String(p.amountOff)
        : "";
  return {
    discountValueType: valueType,
    amountOff: amountStr,
    percentage: numToStr(o.percentage),
    orderPercentage: numToStr(o.percentage),
    productPercentage: numToStr(p.percentage),
    shippingPercentage: numToStr(s.percentage),
    orderMessage: String(o.message || ""),
    productMessage: String(p.message || ""),
    shippingMessage: String(s.message || ""),
    orderSelectionStrategy: String(o.selectionStrategy || "FIRST").toUpperCase(),
    productSelectionStrategy: String(p.selectionStrategy || "FIRST").toUpperCase(),
  };
}

function makeFunctionConfig({
  existingConfig,
  discountValueType, amountOff,
  orderPercentage, productPercentage, shippingPercentage,
  orderMessage, productMessage, shippingMessage,
  orderSelectionStrategy, productSelectionStrategy,
}) {
  const normalizedType = discountValueType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
  const normalizedAmountOff = Number.isFinite(Number(amountOff)) ? Math.max(0, Number(amountOff)) : 0;
  const prev =
    existingConfig && typeof existingConfig === "object" && !Array.isArray(existingConfig)
      ? existingConfig
      : {};
  const shippingBase =
    prev.shipping && typeof prev.shipping === "object" && !Array.isArray(prev.shipping)
      ? prev.shipping
      : {};
  return JSON.stringify({
    ...prev,
    order: {
      valueType: normalizedType,
      amountOff: normalizedAmountOff,
      percentage: orderPercentage,
      message: orderMessage,
      selectionStrategy: orderSelectionStrategy,
    },
    product: {
      valueType: normalizedType,
      amountOff: normalizedAmountOff,
      percentage: productPercentage,
      message: productMessage,
      selectionStrategy: productSelectionStrategy,
    },
    shipping: {
      ...shippingBase,
      percentage: shippingPercentage,
      message: shippingMessage,
    },
  });
}

function isoToLocalDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDateTimeInputToIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function toMutationId(nodeId, typename) {
  if (typename === "DiscountAutomaticApp") {
    return nodeId.replace("/DiscountNode/", "/DiscountAutomaticNode/");
  }
  if (typename === "DiscountCodeBasic") {
    return nodeId.replace("/DiscountNode/", "/DiscountCodeNode/");
  }
  return nodeId;
}

function formatCodeDiscountValue(discount) {
  const val = discount?.customerGets?.value;
  if (!val) return null;
  if (val.percentage != null) return `${(val.percentage * 100).toFixed(0)}% off`;
  if (val.amount?.amount != null)
    return `${val.amount.currencyCode} ${Number(val.amount.amount).toFixed(2)} off`;
  return null;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const editId = url.searchParams.get("editId");

  const response = await admin.graphql(LIST_DISCOUNTS, { variables: { first: 50 } });
  const json = await response.json();
  const appDiscountTypes = json?.data?.appDiscountTypes || [];
  const appFunctionIds = new Set(appDiscountTypes.map((t) => t?.functionId).filter(Boolean));
  const allNodes = json?.data?.discountNodes?.nodes || [];

  const nodes = allNodes.filter((n) => {
    const d = n?.discount;
    if (!d) return false;
    if (d.__typename === "DiscountCodeBasic") return true;
    if (d.__typename === "DiscountAutomaticApp")
      return appFunctionIds.has(d?.appDiscountType?.functionId);
    return false;
  });

  const found = editId ? nodes.find((n) => n.id === editId) : null;
  const discount = found?.discount;

  const existingValueType =
    discount?.__typename === "DiscountCodeBasic"
      ? discount?.customerGets?.value?.percentage != null ? "PERCENTAGE" : "FIXED_AMOUNT"
      : "PERCENTAGE";
  const existingPercentage =
    discount?.__typename === "DiscountCodeBasic" &&
    discount?.customerGets?.value?.percentage != null
      ? String((Number(discount.customerGets.value.percentage) * 100).toFixed(0))
      : "";
  const existingAmountOff =
    discount?.__typename === "DiscountCodeBasic" &&
    discount?.customerGets?.value?.amount?.amount != null
      ? String(Number(discount.customerGets.value.amount.amount).toFixed(2))
      : "";

  const functionConfig =
    discount?.__typename === "DiscountAutomaticApp"
      ? parseFunctionConfigMetafield(found?.metafield)
      : null;

  const editDiscount = found ? {
    id: found.id,
    typename: discount?.__typename || "",
    mode: discount?.__typename === "DiscountAutomaticApp" ? "custom" : "code",
    title: discount?.title || "",
    code: discount?.codes?.nodes?.[0]?.code || "",
    functionId: discount?.appDiscountType?.functionId || "",
    discountClasses: discount?.discountClasses || [],
    combinesWithOrder: Boolean(discount?.combinesWith?.orderDiscounts),
    combinesWithProduct: Boolean(discount?.combinesWith?.productDiscounts),
    combinesWithShipping: Boolean(discount?.combinesWith?.shippingDiscounts),
    appliesOnOneTimePurchase: discount?.appliesOnOneTimePurchase ?? true,
    appliesOnSubscription: discount?.appliesOnSubscription ?? false,
    discountValueType: existingValueType,
    percentage: existingPercentage,
    amountOff: existingAmountOff,
    startsAt: discount?.startsAt || "",
    endsAt: discount?.endsAt || "",
    functionConfig,
  } : null;

  return { nodes, appDiscountTypes, editDiscount, errors: json?.errors || null };
};

// ─── Action ──────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");
  const modeRaw = String(formData.get("mode") || "code").trim().toLowerCase();
  const mode = modeRaw === "custom" ? "custom" : "code";
  const discountType = String(formData.get("discountType") || "");

  if (intent === "delete") {
    const isAutomatic = discountType === "DiscountAutomaticApp";
    const mutationId = toMutationId(id, discountType);
    const response = await admin.graphql(isAutomatic ? DELETE_AUTOMATIC : DELETE_CODE, { variables: { id: mutationId } });
    const json = await response.json();
    const payload = isAutomatic ? json?.data?.discountAutomaticDelete : json?.data?.discountCodeDelete;
    if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
    if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
    return { ok: true };
  }

  const title = String(formData.get("title") || "").trim();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const functionId = String(formData.get("functionId") || "").trim();
  const functionHandle = String(formData.get("functionHandle") || "").trim();
  const startsAtRaw = String(formData.get("startsAt") || "").trim();
  const endsAtRaw = String(formData.get("endsAt") || "").trim();
  const segmentId = String(formData.get("segmentId") || "").trim();
  const combinesWithOrder = String(formData.get("combinesWithOrder") || "") === "on";
  const combinesWithProduct = String(formData.get("combinesWithProduct") || "") === "on";
  const combinesWithShipping = String(formData.get("combinesWithShipping") || "") === "on";
  const appliesOnOneTimePurchase = String(formData.get("appliesOnOneTimePurchase") || "") === "on";
  const appliesOnSubscription = String(formData.get("appliesOnSubscription") || "") === "on";
  const discountClassProduct = String(formData.get("discountClassProduct") || "") === "on";
  const discountClassOrder = String(formData.get("discountClassOrder") || "") === "on";
  const discountClassShipping = String(formData.get("discountClassShipping") || "") === "on";
  const discountClasses = [
    ...(discountClassProduct ? ["PRODUCT"] : []),
    ...(discountClassOrder ? ["ORDER"] : []),
    ...(discountClassShipping ? ["SHIPPING"] : []),
  ];
  const orderPercentage = Number(String(formData.get("orderPercentage") ?? "").trim());
  const productPercentage = Number(String(formData.get("productPercentage") ?? "").trim());
  const shippingPercentage = Number(String(formData.get("shippingPercentage") ?? "").trim());
  const orderMessage = String(formData.get("orderMessage") ?? "").trim();
  const productMessage = String(formData.get("productMessage") ?? "").trim();
  const shippingMessage = String(formData.get("shippingMessage") ?? "").trim();
  const orderSelectionStrategy = String(formData.get("orderSelectionStrategy") || "FIRST").trim().toUpperCase();
  const productSelectionStrategy = String(formData.get("productSelectionStrategy") || "FIRST").trim().toUpperCase();
  const discountValueType = String(formData.get("discountValueType") || "PERCENTAGE").trim().toUpperCase();
  const percentage = Number(String(formData.get("percentage") || "").trim());
  const amountOff = Number(String(formData.get("amountOff") || "").trim());
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : new Date();
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  const errors = {};
  if (!["code", "custom"].includes(modeRaw)) errors.mode = 'Mode must be "code" or "custom"';
  if (!title) errors.title = "Title is required";
  if (!["PERCENTAGE", "FIXED_AMOUNT"].includes(discountValueType))
    errors.discountValueType = "Discount type must be Percentage or Fixed Amount";
  if (discountValueType === "PERCENTAGE" && (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100))
    errors.percentage = "Percentage must be between 1 and 100";
  if (discountValueType === "FIXED_AMOUNT" && (!Number.isFinite(amountOff) || amountOff <= 0))
    errors.amountOff = "Price off must be greater than 0";
  if (mode === "code" && !code) errors.code = "Code is required";
  if (mode === "custom" && !functionId && !functionHandle)
    errors.functionId = "Function ID or Function Handle is required";
  if (mode === "custom" && !discountClasses.length)
    errors.discountClasses = "Select at least one discount class (Product, Order, or Shipping)";
  if (mode === "custom" && (!Number.isFinite(orderPercentage) || orderPercentage < 0 || orderPercentage > 100))
    errors.orderPercentage = "Order percentage must be between 0 and 100";
  if (mode === "custom" && (!Number.isFinite(productPercentage) || productPercentage < 0 || productPercentage > 100))
    errors.productPercentage = "Product percentage must be between 0 and 100";
  if (mode === "custom" && (!Number.isFinite(shippingPercentage) || shippingPercentage < 0 || shippingPercentage > 100))
    errors.shippingPercentage = "Shipping percentage must be between 0 and 100";
  if (mode === "custom" && !orderMessage) errors.orderMessage = "Order discount message is required";
  if (mode === "custom" && !productMessage) errors.productMessage = "Product discount message is required";
  if (mode === "custom" && !shippingMessage) errors.shippingMessage = "Shipping discount message is required";
  if (mode === "custom" && !["FIRST", "MAXIMUM"].includes(orderSelectionStrategy))
    errors.orderSelectionStrategy = "Order selection strategy must be FIRST or MAXIMUM";
  if (mode === "custom" && !["ALL", "FIRST", "MAXIMUM"].includes(productSelectionStrategy))
    errors.productSelectionStrategy = "Product selection strategy must be ALL, FIRST, or MAXIMUM";
  if (startsAtRaw && Number.isNaN(startsAt.getTime())) errors.startsAt = "Invalid start date";
  if (endsAtRaw && (!endsAt || Number.isNaN(endsAt.getTime()))) errors.endsAt = "Invalid end date";
  if (!Number.isNaN(startsAt.getTime())) {
    const y = startsAt.getUTCFullYear();
    if (y < 1970 || y > 9999) errors.startsAt = "Start date year must be between 1970 and 9999";
  }
  if (endsAt && !Number.isNaN(endsAt.getTime())) {
    const y = endsAt.getUTCFullYear();
    if (y < 1970 || y > 9999) errors.endsAt = "End date year must be between 1970 and 9999";
  }
  if (endsAt && endsAt.getTime() <= startsAt.getTime())
    errors.endsAt = "End date must be after start date";

  if (mode === "custom" && !functionHandle && functionId) {
    try {
      const typesResponse = await admin.graphql(LIST_APP_DISCOUNT_TYPES);
      const typesJson = await typesResponse.json();
      const availableFunctionIds = new Set(
        (typesJson?.data?.appDiscountTypes || []).map((t) => t?.functionId).filter(Boolean),
      );
      if (!availableFunctionIds.has(functionId))
        errors.functionId = "Selected Function ID is no longer available. Pick a current one or use Function Handle.";
    } catch {
      errors.functionId = "Unable to validate Function ID right now. Try using Function Handle or refresh and submit again.";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  if (mode === "custom") {
    let existingFunctionConfig = null;
    if (intent === "update" && id) {
      try {
        const cfgRes = await admin.graphql(GET_DISCOUNT_FUNCTION_CONFIG, { variables: { id } });
        const cfgJson = await cfgRes.json();
        const mf = cfgJson?.data?.discountNode?.metafield;
        existingFunctionConfig = parseFunctionConfigMetafield(mf);
      } catch {
        existingFunctionConfig = null;
      }
    }

    const functionRef = functionHandle ? { functionHandle } : functionId ? { functionId } : {};
    const automaticAppDiscount = {
      title,
      ...functionRef,
      startsAt: startsAt.toISOString(),
      ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
      discountClasses,
      appliesOnOneTimePurchase,
      appliesOnSubscription,
      combinesWith: {
        orderDiscounts: combinesWithOrder,
        productDiscounts: combinesWithProduct,
        shippingDiscounts: combinesWithShipping,
      },
      metafields: [{
        namespace: "default",
        key: "function-configuration",
        type: "json",
        value: makeFunctionConfig({
          existingConfig: existingFunctionConfig,
          discountValueType, amountOff,
          orderPercentage, productPercentage, shippingPercentage,
          orderMessage, productMessage, shippingMessage,
          orderSelectionStrategy, productSelectionStrategy,
        }),
      }],
    };
    const mutation = intent === "update" ? UPDATE_CUSTOM : CREATE_CUSTOM;
    const mutationId = toMutationId(id, discountType || "DiscountAutomaticApp");
    const variables = intent === "update" ? { id: mutationId, automaticAppDiscount } : { automaticAppDiscount };
    let json;
    try {
      const response = await admin.graphql(mutation, { variables });
      json = await response.json();
    } catch (error) {
      return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update custom discount" }] } };
    }
    const payload = intent === "update" ? json?.data?.discountAutomaticAppUpdate : json?.data?.discountAutomaticAppCreate;
    if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
    if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
    return { ok: true };
  }

  const basicCodeDiscount = {
    title, code,
    startsAt: startsAt.toISOString(),
    ...(endsAt ? { endsAt: endsAt.toISOString() } : {}),
    customerSelection: segmentId ? { customerSegments: { add: [segmentId] } } : { all: true },
    combinesWith: {
      orderDiscounts: combinesWithOrder,
      productDiscounts: combinesWithProduct,
      shippingDiscounts: combinesWithShipping,
    },
    customerGets: {
      items: { all: true },
      value: discountValueType === "FIXED_AMOUNT"
        ? { discountAmount: { amount: String(amountOff), appliesOnEachItem: false } }
        : { percentage: percentage / 100 },
    },
  };
  const mutation = intent === "update" ? UPDATE_CODE : CREATE_CODE;
  const mutationId = toMutationId(id, discountType || "DiscountCodeBasic");
  const variables = intent === "update" ? { id: mutationId, basicCodeDiscount } : { basicCodeDiscount };
  let json;
  try {
    const response = await admin.graphql(mutation, { variables });
    json = await response.json();
  } catch (error) {
    return { ok: false, errors: { runtime: [{ message: error?.message || "Failed to create/update code discount" }] } };
  }
  const payload = intent === "update" ? json?.data?.discountCodeBasicUpdate : json?.data?.discountCodeBasicCreate;
  if (json?.errors?.length) return { ok: false, errors: { graphql: json.errors } };
  if (payload?.userErrors?.length) return { ok: false, errors: { shopify: payload.userErrors } };
  return { ok: true };
};

// ─── Sub-components (Polaris web components) ────────────────────────────────
/* eslint-disable react/prop-types -- small layout helpers; props are obvious at call sites */

function SectionCard({ step, title, children }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small" alignItems="center">
          {step != null && step !== "" ? <s-badge tone="info">{step}</s-badge> : null}
          <s-heading>{title}</s-heading>
        </s-stack>
        {children}
      </s-stack>
    </s-box>
  );
}

function SubHeading({ children }) {
  return (
    <s-box paddingBlockStart="base" paddingBlockEnd="small">
      <s-text type="strong" tone="neutral">
        {children}
      </s-text>
    </s-box>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DiscountsIndex() {
  const { nodes, appDiscountTypes, errors, editDiscount } = useLoaderData();
  const actionData = useActionData();
  const location = useLocation();
  const navigate = useNavigate();
  const submit = useSubmit();

  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState(editDiscount?.mode || "custom");
  const [title, setTitle] = useState(editDiscount?.title || "");
  const [code, setCode] = useState(editDiscount?.code || "");
  const [functionId, setFunctionId] = useState(editDiscount?.functionId || "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [combinesWithOrder, setCombinesWithOrder] = useState(editDiscount?.combinesWithOrder ?? false);
  const [combinesWithProduct, setCombinesWithProduct] = useState(editDiscount?.combinesWithProduct ?? false);
  const [combinesWithShipping, setCombinesWithShipping] = useState(editDiscount?.combinesWithShipping ?? false);
  const [appliesOnOneTimePurchase, setAppliesOnOneTimePurchase] = useState(editDiscount?.appliesOnOneTimePurchase ?? true);
  const [appliesOnSubscription, setAppliesOnSubscription] = useState(editDiscount?.appliesOnSubscription ?? false);
  const [discountClassProduct, setDiscountClassProduct] = useState(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
  const [discountClassOrder, setDiscountClassOrder] = useState(editDiscount?.discountClasses?.includes("ORDER") ?? false);
  const [discountClassShipping, setDiscountClassShipping] = useState(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
  const [discountValueType, setDiscountValueType] = useState(editDiscount?.discountValueType || "PERCENTAGE");
  const [percentage, setPercentage] = useState(editDiscount?.percentage || "");
  const [amountOff, setAmountOff] = useState(editDiscount?.amountOff || "");
  const [orderPercentage, setOrderPercentage] = useState("");
  const [productPercentage, setProductPercentage] = useState("");
  const [shippingPercentage, setShippingPercentage] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [orderSelectionStrategy, setOrderSelectionStrategy] = useState("FIRST");
  const [productSelectionStrategy, setProductSelectionStrategy] = useState("FIRST");

  const editDiscountId = editDiscount?.id || "__new__";

  useEffect(() => {
    setMode(editDiscount?.mode || "custom");
    setTitle(editDiscount?.title || "");
    setCode(editDiscount?.code || "");
    setFunctionId(editDiscount?.functionId || "");
    setDiscountClassProduct(editDiscount?.discountClasses?.includes("PRODUCT") ?? true);
    setDiscountClassOrder(editDiscount?.discountClasses?.includes("ORDER") ?? false);
    setDiscountClassShipping(editDiscount?.discountClasses?.includes("SHIPPING") ?? true);
    setCombinesWithOrder(editDiscount?.combinesWithOrder ?? false);
    setCombinesWithProduct(editDiscount?.combinesWithProduct ?? false);
    setCombinesWithShipping(editDiscount?.combinesWithShipping ?? false);
    setAppliesOnOneTimePurchase(editDiscount?.appliesOnOneTimePurchase ?? true);
    setAppliesOnSubscription(editDiscount?.appliesOnSubscription ?? false);
    const cf = customFieldsFromFunctionConfig(editDiscount?.functionConfig || null);
    if (editDiscount?.mode === "custom" && cf) {
      setDiscountValueType(cf.discountValueType);
      setAmountOff(cf.amountOff);
      setPercentage(cf.percentage || "");
      setOrderPercentage(cf.orderPercentage);
      setProductPercentage(cf.productPercentage);
      setShippingPercentage(cf.shippingPercentage);
      setOrderMessage(cf.orderMessage);
      setProductMessage(cf.productMessage);
      setShippingMessage(cf.shippingMessage);
      setOrderSelectionStrategy(cf.orderSelectionStrategy);
      setProductSelectionStrategy(cf.productSelectionStrategy);
    } else {
      setDiscountValueType(editDiscount?.discountValueType || "PERCENTAGE");
      setPercentage(editDiscount?.percentage || "");
      setAmountOff(editDiscount?.amountOff || "");
      setOrderPercentage("");
      setProductPercentage("");
      setShippingPercentage("");
      setOrderMessage("");
      setProductMessage("");
      setShippingMessage("");
      setOrderSelectionStrategy("FIRST");
      setProductSelectionStrategy("FIRST");
    }
    setStartsAt(isoToLocalDateTimeInput(editDiscount?.startsAt || ""));
    setEndsAt(isoToLocalDateTimeInput(editDiscount?.endsAt || ""));
  }, [editDiscountId]);

  // Reset all fields to blank defaults after a successful create (not update)
  useEffect(() => {
    if (actionData?.ok && !editDiscount) {
      setTitle("");
      setCode("");
      setSegmentId("");
      setStartsAt("");
      setEndsAt("");
      setDiscountValueType("PERCENTAGE");
      setPercentage("");
      setAmountOff("");
      setCombinesWithOrder(false);
      setCombinesWithProduct(false);
      setCombinesWithShipping(false);
      setAppliesOnOneTimePurchase(true);
      setAppliesOnSubscription(false);
      setDiscountClassProduct(true);
      setDiscountClassOrder(false);
      setDiscountClassShipping(true);
      setOrderPercentage("");
      setProductPercentage("");
      setShippingPercentage("");
      setOrderMessage("");
      setProductMessage("");
      setShippingMessage("");
      setOrderSelectionStrategy("FIRST");
      setProductSelectionStrategy("FIRST");
    }
  }, [actionData]);

  const withShopifyParams = (path) => {
    const [pathname, existingQuery = ""] = path.split("?");
    const current = new URLSearchParams(location.search);
    const keep = new URLSearchParams(existingQuery);
    for (const key of ["host", "shop"]) {
      const val = current.get(key);
      if (val && !keep.has(key)) keep.set(key, val);
    }
    const qs = keep.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => {
      const d = n.discount || {};
      const codeVal = d?.codes?.nodes?.[0]?.code || "";
      return `${d.title || ""} ${codeVal} ${d.__typename || ""}`.toLowerCase().includes(q);
    });
  }, [filter, nodes]);

  const functionOptions = useMemo(() => {
    const byId = new Map();
    for (const t of appDiscountTypes || []) {
      const id = t?.functionId;
      if (!id) continue;
      byId.set(id, t?.title ? `${t.title} — ${id}` : id);
    }
    return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
  }, [appDiscountTypes]);

  useEffect(() => {
    if (mode === "custom" && !editDiscount && !functionId && functionOptions.length)
      setFunctionId(functionOptions[0].id || "");
  }, [editDiscount, functionId, functionOptions, mode]);

  useEffect(() => {
    if (!functionOptions.length) return;
    const validIds = new Set(functionOptions.map((o) => o.id));
    if (mode === "custom" && (!functionId || !validIds.has(functionId)))
      setFunctionId(functionOptions[0].id || "");
  }, [functionId, functionOptions, mode]);

  const handleDiscountFormSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      formData.set("intent", editDiscount ? "update" : "create");
      if (editDiscount?.id) formData.set("id", editDiscount.id);
      if (editDiscount?.typename) formData.set("discountType", editDiscount.typename);
      if (mode === "custom") {
        formData.set("functionId", functionId);
        formData.set("functionHandle", "");
      }
      formData.set("startsAt", localDateTimeInputToIso(startsAt));
      formData.set("endsAt", localDateTimeInputToIso(endsAt));
      if (discountValueType === "PERCENTAGE") formData.set("amountOff", "");
      else formData.set("percentage", "");
      submit(formData, { method: "post" });
    },
    [
      editDiscount,
      mode,
      functionId,
      startsAt,
      endsAt,
      discountValueType,
      submit,
    ],
  );

  return (
    <s-page heading="Discounts">
      {/* ── Create / Edit form ─────────────────────────────────────────────── */}
      <s-section heading={editDiscount ? "Edit discount" : "Create discount"}>
        <Form method="post" onSubmit={handleDiscountFormSubmit}>
          <s-stack direction="block" gap="base">
            {/* 1. Basic settings */}
            <SectionCard step="1" title="Basic settings">
              <s-select
                name="mode"
                label="Discount mode"
                value={mode}
                details=""
                placeholder=""
                onChange={(e) => setMode(e.currentTarget.value)}
                error={actionData?.errors?.mode}
              >
                <s-option value="custom">Automatic (app function)</s-option>
                <s-option value="code">Code discount</s-option>
              </s-select>

              <s-text-field
                name="title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                error={actionData?.errors?.title}
                autocomplete="off"
              />

              {mode === "code" ? (
                <s-text-field
                  name="code"
                  label="Discount code (e.g. SUMMER20)"
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value)}
                  error={actionData?.errors?.code}
                  autocomplete="off"
                />
              ) : (
                <s-stack direction="block" gap="small">
                  {functionOptions.length > 0 ? (
                    <s-box padding="small" borderWidth="base" borderRadius="base" background="subdued">
                      <s-stack direction="inline" gap="small" alignItems="center">
                        <s-icon type="check-circle" tone="success" size="small" />
                        <s-text>Function ID: {functionId || "none"}</s-text>
                      </s-stack>
                    </s-box>
                  ) : (
                    <s-banner tone="warning" heading="No discount functions found">
                      Deploy your discount function and refresh this page.
                    </s-banner>
                  )}
                  {actionData?.errors?.functionId ? (
                    <s-text tone="critical">{actionData.errors.functionId}</s-text>
                  ) : null}
                </s-stack>
              )}
            </SectionCard>

            {/* 2. Discount value */}
            <SectionCard step="2" title="Discount value">
              <s-select
                name="discountValueType"
                label="Discount type"
                value={discountValueType}
                details=""
                placeholder=""
                onChange={(e) => setDiscountValueType(e.currentTarget.value)}
                error={actionData?.errors?.discountValueType}
              >
                <s-option value="PERCENTAGE">Percentage off (%)</s-option>
                <s-option value="FIXED_AMOUNT">Fixed price off ($)</s-option>
              </s-select>

            {discountValueType === "PERCENTAGE" ? (
              <s-text-field
                name="percentage"
                label="Percentage off (e.g. 10 for 10%)"
                value={percentage}
                onChange={(e) => setPercentage(e.currentTarget.value)}
                error={actionData?.errors?.percentage}
                autocomplete="off"
                type="number"
                min="1"
                max="100"
              />
            ) : (
              <s-text-field
                name="amountOff"
                label="Fixed price off amount (e.g. 5.00)"
                value={amountOff}
                onChange={(e) => setAmountOff(e.currentTarget.value)}
                error={actionData?.errors?.amountOff}
                autocomplete="off"
                type="number"
                min="0.01"
                step="0.01"
              />
            )}
            </SectionCard>

            {/* 3. Schedule and audience */}
            <SectionCard step="3" title="Schedule & audience">
              <s-stack direction="block" gap="base">
                <s-text-field
                  type="datetime-local"
                  label="Starts at"
                  details="Optional"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.currentTarget.value)}
                  error={actionData?.errors?.startsAt}
                />
                <s-text-field
                  type="datetime-local"
                  label="Ends at"
                  details="Optional"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.currentTarget.value)}
                  error={actionData?.errors?.endsAt}
                />
              </s-stack>

              <s-text-field
                name="segmentId"
                label="Customer segment ID (optional)"
                value={segmentId}
                onChange={(e) => setSegmentId(e.currentTarget.value)}
                autocomplete="off"
              />
            </SectionCard>

            {/* 4. Combination rules */}
            <SectionCard step="4" title="Combination rules">
              <s-stack direction="block" gap="small">
                <s-checkbox
                  name="combinesWithOrder"
                  value="on"
                  label="Combine with order discounts"
                  checked={combinesWithOrder}
                  onChange={(e) => setCombinesWithOrder(e.currentTarget.checked)}
                />
                <s-checkbox
                  name="combinesWithProduct"
                  value="on"
                  label="Combine with product discounts"
                  checked={combinesWithProduct}
                  onChange={(e) => setCombinesWithProduct(e.currentTarget.checked)}
                />
                <s-checkbox
                  name="combinesWithShipping"
                  value="on"
                  label="Combine with shipping discounts"
                  checked={combinesWithShipping}
                  onChange={(e) => setCombinesWithShipping(e.currentTarget.checked)}
                />
              </s-stack>
            </SectionCard>

            {/* 5. Custom function options (automatic mode only) */}
            {mode === "custom" && (
              <SectionCard step="5" title="Custom function options">
                <SubHeading>Discount classes</SubHeading>
                <s-stack direction="block" gap="small">
                  <s-checkbox
                    name="discountClassProduct"
                    value="on"
                    label="Product discounts"
                    checked={discountClassProduct}
                    onChange={(e) => setDiscountClassProduct(e.currentTarget.checked)}
                  />
                  <s-checkbox
                    name="discountClassOrder"
                    value="on"
                    label="Order discounts"
                    checked={discountClassOrder}
                    onChange={(e) => setDiscountClassOrder(e.currentTarget.checked)}
                  />
                  <s-checkbox
                    name="discountClassShipping"
                    value="on"
                    label="Shipping discounts"
                    checked={discountClassShipping}
                    onChange={(e) => setDiscountClassShipping(e.currentTarget.checked)}
                  />
                </s-stack>
                {actionData?.errors?.discountClasses ? (
                  <s-text tone="critical">{actionData.errors.discountClasses}</s-text>
                ) : null}

                <s-divider />
                <SubHeading>Per-class percentages</SubHeading>
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                    <s-text-field
                      name="orderPercentage"
                      label="Order discount %"
                      value={orderPercentage}
                      onChange={(e) => setOrderPercentage(e.currentTarget.value)}
                      error={actionData?.errors?.orderPercentage}
                      autocomplete="off"
                      type="number"
                      min="0"
                      max="100"
                    />
                    <s-text-field
                      name="productPercentage"
                      label="Product discount %"
                      value={productPercentage}
                      onChange={(e) => setProductPercentage(e.currentTarget.value)}
                      error={actionData?.errors?.productPercentage}
                      autocomplete="off"
                      type="number"
                      min="0"
                      max="100"
                    />
                  </s-grid>
                  <s-text-field
                    name="shippingPercentage"
                    label="Shipping discount %"
                    value={shippingPercentage}
                    onChange={(e) => setShippingPercentage(e.currentTarget.value)}
                    error={actionData?.errors?.shippingPercentage}
                    autocomplete="off"
                    type="number"
                    min="0"
                    max="100"
                  />
                </s-stack>

                <s-divider />
                <SubHeading>Customer-facing messages</SubHeading>
                <s-text-field
                  name="orderMessage"
                  label="Order discount message"
                  value={orderMessage}
                  onChange={(e) => setOrderMessage(e.currentTarget.value)}
                  error={actionData?.errors?.orderMessage}
                  autocomplete="off"
                />
                <s-text-field
                  name="productMessage"
                  label="Product discount message"
                  value={productMessage}
                  onChange={(e) => setProductMessage(e.currentTarget.value)}
                  error={actionData?.errors?.productMessage}
                  autocomplete="off"
                />
                <s-text-field
                  name="shippingMessage"
                  label="Shipping discount message"
                  value={shippingMessage}
                  onChange={(e) => setShippingMessage(e.currentTarget.value)}
                  error={actionData?.errors?.shippingMessage}
                  autocomplete="off"
                />

                <s-divider />
                <SubHeading>Selection strategies</SubHeading>
                <s-stack direction="block" gap="base">
                  <s-select
                    name="orderSelectionStrategy"
                    label="Order selection strategy"
                    value={orderSelectionStrategy}
                    details=""
                    placeholder=""
                    onChange={(e) => setOrderSelectionStrategy(e.currentTarget.value)}
                    error={actionData?.errors?.orderSelectionStrategy}
                  >
                    <s-option value="FIRST">FIRST</s-option>
                    <s-option value="MAXIMUM">MAXIMUM</s-option>
                  </s-select>
                  <s-select
                    name="productSelectionStrategy"
                    label="Product selection strategy"
                    value={productSelectionStrategy}
                    details=""
                    placeholder=""
                    onChange={(e) => setProductSelectionStrategy(e.currentTarget.value)}
                    error={actionData?.errors?.productSelectionStrategy}
                  >
                    <s-option value="ALL">ALL</s-option>
                    <s-option value="FIRST">FIRST</s-option>
                    <s-option value="MAXIMUM">MAXIMUM</s-option>
                  </s-select>
                </s-stack>

                <s-divider />
                <SubHeading>Application scope</SubHeading>
                <s-stack direction="block" gap="small">
                  <s-checkbox
                    name="appliesOnOneTimePurchase"
                    value="on"
                    label="Applies on one-time purchases"
                    checked={appliesOnOneTimePurchase}
                    onChange={(e) => setAppliesOnOneTimePurchase(e.currentTarget.checked)}
                  />
                  <s-checkbox
                    name="appliesOnSubscription"
                    value="on"
                    label="Applies on subscriptions"
                    checked={appliesOnSubscription}
                    onChange={(e) => setAppliesOnSubscription(e.currentTarget.checked)}
                  />
                </s-stack>
              </SectionCard>
            )}

            {/* Submit */}
            <s-stack direction="inline" gap="base">
              <s-button type="submit" variant="primary" icon={editDiscount ? "save" : "plus"}>
                {editDiscount ? "Update discount" : "Create discount"}
              </s-button>
              {editDiscount ? (
                <s-button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const params = new URLSearchParams(location.search);
                    params.delete("editId");
                    const q = params.toString();
                    navigate(q ? `${location.pathname}?${q}` : location.pathname);
                  }}
                >
                  Cancel
                </s-button>
              ) : null}
            </s-stack>
          </s-stack>
        </Form>
      </s-section>

      {/* ── Errors ─────────────────────────────────────────────────────────── */}
      {(errors?.length || actionData?.errors) && (
        <s-section heading="Errors">
          <s-banner tone="critical" heading="Request could not be completed">
            <s-text-area
              label="Error details"
              readOnly
              rows={12}
              minLength={0}
              maxLength={100000}
              autocomplete="off"
              value={JSON.stringify(errors || actionData?.errors, null, 2)}
            />
          </s-banner>
        </s-section>
      )}

      {/* ── Discounts table ────────────────────────────────────────────────── */}
      <s-section heading="My app discounts">
        <s-stack direction="block" gap="base">
          <s-search-field
            label="Search discounts"
            labelAccessibilityVisibility="exclusive"
            placeholder="Search by title, code, or type…"
            value={filter}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />
          {filtered.length === 0 ? (
            <s-box padding="large" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base" alignItems="center">
                <s-icon type="discount" tone="neutral" size="base" />
                <s-text tone="neutral">No discounts found.</s-text>
              </s-stack>
            </s-box>
          ) : (
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Title</s-table-header>
                <s-table-header listSlot="inline">Mode</s-table-header>
                <s-table-header listSlot="labeled">Code / function</s-table-header>
                <s-table-header listSlot="labeled">Value</s-table-header>
                <s-table-header listSlot="inline">Status</s-table-header>
                <s-table-header listSlot="labeled" format="numeric">
                  Used
                </s-table-header>
                <s-table-header listSlot="labeled">Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {filtered.map((n) => {
                  const d = n.discount || {};
                  const isAutomatic = d.__typename === "DiscountAutomaticApp";
                  const ref = isAutomatic
                    ? (d?.appDiscountType?.functionId || "—")
                    : (d?.codes?.nodes?.[0]?.code || "—");
                  const used = d?.asyncUsageCount ?? "—";
                  const valueDisplay = isAutomatic ? null : formatCodeDiscountValue(d);
                  return (
                    <s-table-row key={n.id}>
                      <s-table-cell>
                        <s-text type="strong">{d.title || "—"}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={isAutomatic ? "success" : "info"}>
                          {isAutomatic ? "Automatic" : "Code"}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text fontVariantNumeric="tabular-nums">{ref}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        {valueDisplay ? (
                          <s-badge tone="info">{valueDisplay}</s-badge>
                        ) : (
                          <s-text tone="neutral">Via function</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={d.status === "ACTIVE" ? "success" : "neutral"}>
                          {d.status || "—"}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text fontVariantNumeric="tabular-nums" type="strong">
                          {String(used)}
                        </s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <s-stack direction="inline" gap="small-100">
                          <s-button
                            type="button"
                            variant="tertiary"
                            icon="edit"
                            onClick={() => {
                              const params = new URLSearchParams(location.search);
                              params.set("editId", n.id);
                              navigate(
                                withShopifyParams(`${location.pathname}?${params.toString()}`),
                              );
                            }}
                          >
                            Edit
                          </s-button>
                          <s-button
                            type="button"
                            variant="tertiary"
                            tone="critical"
                            icon="delete"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("intent", "delete");
                              fd.set("id", n.id);
                              fd.set("discountType", d.__typename);
                              submit(fd, { method: "post" });
                            }}
                          >
                            Delete
                          </s-button>
                        </s-stack>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);