import { createHash } from "node:crypto";
import { GraphqlQueryError } from "@shopify/shopify-api";
import { SessionNotFoundError } from "@shopify/shopify-app-react-router/server";
import shopify, { authenticate } from "../shopify.server";
import { parsePopupDesignConfig, resolvePopupDesignId } from "../lib/popup-design-config.js";
import { templateRenderPayload } from "../lib/popup-design-template.js";
import prisma from "../db.server";

const BAR_TYPE = "popup_design";

/** Tag applied to customers created from the storefront popup (override with POPUP_CUSTOMER_APP_TAG). */
const POPUP_CUSTOMER_SOURCE_TAG = String(process.env.POPUP_CUSTOMER_APP_TAG || process.env.SHOPIFY_APP_NAME || "cart")
  .trim()
  .replace(/[^a-zA-Z0-9 _-]/g, "")
  .slice(0, 60) || "cart";

/** Request only `id` on the created customer to reduce Protected Customer Data exposure on read-back. */
const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation scePopupCustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FIND_CUSTOMER_BY_EMAIL_QUERY = `#graphql
  query scePopupFindCustomerByEmail($q: String!) {
    customers(first: 1, query: $q) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

/** Shown in the storefront JSON - must stay shopper-safe (no Partner Dashboard / internal setup text). */
const PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE =
  "We can't complete your signup right now. Please try again later or contact the storessssssssssss.";

function isProtectedCustomerDataAccessError(err) {
  if (!err) return false;
  if (err instanceof GraphqlQueryError) {
    const m = String(err.message || "").toLowerCase();
    return m.includes("protected customer data") || m.includes("not approved to access the customer");
  }
  const m = String(err.message || "").toLowerCase();
  return m.includes("protected customer data") || m.includes("not approved to access the customer");
}

function graphQlErrorsLookLikeProtectedCustomerData(errors) {
  if (!Array.isArray(errors) || !errors.length) return false;
  return errors.some((e) => {
    const m = String(e?.message || "").toLowerCase();
    return m.includes("protected customer data") || m.includes("not approved to access the customer");
  });
}

function hasDuplicateEmailCustomerUserError(userErrors) {
  if (!Array.isArray(userErrors) || !userErrors.length) return false;
  return userErrors.some((err) => {
    const m = String(err?.message || "").toLowerCase();
    return (
      m.includes("taken") ||
      m.includes("already exists") ||
      m.includes("already been taken") ||
      m.includes("already registered") ||
      m.includes("has already been") ||
      m.includes("duplicate") ||
      m.includes("identical") ||
      m.includes("in use")
    );
  });
}

/**
 * Looks up a customer by email for duplicate / verify flows.
 * @returns {{ customer: { id?: string, email?: string } | null, lookupBlocked: boolean }} `lookupBlocked` is true when Shopify PCD blocks all Customer reads (not "not found").
 */
async function findCustomerByEmailWithMeta(admin, email) {
  const e = String(email || "").trim();
  if (!e) return { customer: null, lookupBlocked: false };
  const lower = e.toLowerCase();
  /** Shopify search works best as `email:user@shop.com`; quoted form often returns no matches. */
  const quoted = `email:"${e.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const attempts = [`email:${e}`, `email:${lower}`, quoted];
  const seen = new Set();
  for (const q of attempts) {
    if (!q || seen.has(q)) continue;
    seen.add(q);
    try {
      const response = await admin.graphql(FIND_CUSTOMER_BY_EMAIL_QUERY, { variables: { q } });
      console.log("response=========>", response);
      const json = await response.json();
      if (graphQlErrorsLookLikeProtectedCustomerData(json?.errors)) {
        return { customer: null, lookupBlocked: true };
      }
      if (json?.errors?.length) continue;
      const edges = json?.data?.customers?.edges || [];
      if (edges[0]?.node) return { customer: edges[0].node, lookupBlocked: false };
    } catch (err) {
      console.log("err=========>", err);
      if (isProtectedCustomerDataAccessError(err)) {
        return { customer: null, lookupBlocked: true };
      }
      throw err;
    }
  }
  return { customer: null, lookupBlocked: false };
}

function jsonNoStore(data, status = 200) {
  console.log("data=========>", data);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  };
  /** Storefront can trust this if the JSON body is stripped by a proxy but the create still completed. */
  if (
    data &&
    data.ok === true &&
    typeof data.subscriberCount === "number" &&
    status >= 200 &&
    status < 300
  ) {
    headers["X-Sce-Popup-Subscribe"] = "ok";
    headers["Access-Control-Expose-Headers"] = "X-Sce-Popup-Subscribe";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

/** Storefront + server: validate email for signup (non-empty, reasonable shape). */
function isValidPopupSignupEmail(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s || s.length > 254) return false;
  const at = s.lastIndexOf("@");
  if (at < 1 || at === s.length - 1) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (local.length > 64 || !domain.includes(".")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  const noStoreJson = (data, status) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      },
    });

  if (!shop) {
    return noStoreJson({ ok: false, error: "missing_shop" }, 400);
  }

  const requestedDesignId = (
    url.searchParams.get("popup_design_id") ||
    url.searchParams.get("id") ||
    ""
  ).trim();

  const rows = await prisma.popupDesign.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true, popupDesignId: true, configJson: true, templateJson: true },
  });

  let row = null;
  if (requestedDesignId) {
    for (const r of rows) {
      const resolvedId =
        String(r.popupDesignId || "").trim() ||
        resolvePopupDesignId(parsePopupDesignConfig(r.configJson), r.id);
      if (resolvedId === requestedDesignId) {
        row = r;
        break;
      }
    }
  } else if (rows.length === 1) {
    // Backward compatibility: single saved popup, theme block without query param
    row = rows[0];
  }

  if (!row) {
    return noStoreJson(
      {
        ok: false,
        error: requestedDesignId ? "popup_not_found" : "popup_design_id_required",
        matched: false,
      },
      requestedDesignId ? 404 : 400,
    );
  }

  const template = (() => {
    try {
      return JSON.parse(String(row.templateJson || "{}"));
    } catch {
      return {};
    }
  })();
  const payload = templateRenderPayload(template, row.configJson);
  const config = { ...payload.config, popupDesignId: payload.popupDesignId || row.popupDesignId };

  /** GET verify: same payload as POST `intent: verify_customer` (some proxies handle GET more reliably). */
  if (url.searchParams.get("intent") === "verify_customer") {
    const emailQ = String(url.searchParams.get("email") || "").trim();
    if (!emailQ) {
      return noStoreJson({ ok: false, error: "validation", message: "email_required" }, 400);
    }
    if (!isValidPopupSignupEmail(emailQ)) {
      return noStoreJson({ ok: false, error: "validation", message: "invalid_email" }, 400);
    }
    if (parsed.emailCaptureEnabled !== true) {
      return noStoreJson({ ok: false, error: "email_capture_disabled" }, 403);
    }
    if (parsed.shopifyCustomerCreateEnabled !== true) {
      return noStoreJson({ ok: false, error: "verify_disabled" }, 403);
    }
    try {
      const { admin } = await shopify.unauthenticated.admin(shop);
      console.log("admin=========>", admin, emailQ);
      const { customer: node, lookupBlocked } = await findCustomerByEmailWithMeta(admin, emailQ);
      console.log("node=========>", node, lookupBlocked);
      // if (lookupBlocked) {
      //   return noStoreJson(
      //     {
      //       ok: false,
      //       error: "protected_customer_data",
      //       message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
      //     },
      //     403,
      //   );
      // }
      return noStoreJson({
        ok: true,
        found: Boolean(node),
        customer: node,
      });
    } catch (e) {
      if (e instanceof SessionNotFoundError || e?.name === "SessionNotFoundError") {
        return noStoreJson(
          {
            ok: false,
            error: "session_missing",
            message: "Open the app in Shopify admin once so it can create customers for this store.",
          },
          503,
        );
      }
      // if (isProtectedCustomerDataAccessError(e)) {
      //   return noStoreJson(
      //     {
      //       ok: false,
      //       error: "protected_customer_data",
      //       message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
      //     },
      //     403,
      //   );
      // }
      throw e;
    }
  }

  const configFingerprint = createHash("sha256").update(row.configJson || "{}").digest("hex").slice(0, 16);
  const subscriberCount = await prisma.popupSignup.count({
    where: { shop, popupDesignId: config.popupDesignId },
  });
  const body = JSON.stringify({
    ok: true,
    id: row.id,
    version: `${row.id}:${row.updatedAt?.toISOString?.() || ""}:${configFingerprint}`,
    updatedAt: row.updatedAt?.toISOString?.() || null,
    config,
    subscriberCount,
    matched: true,
    template,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return jsonNoStore({ ok: false, error: "method_not_allowed" }, 405);
  }

  const { session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = (session?.shop || url.searchParams.get("shop") || "").trim();
  if (!shop) {
    return jsonNoStore({ ok: false, error: "missing_shop" }, 400);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ ok: false, error: "invalid_json" }, 400);
  }

  const popupDesignId = String(
    payload.popup_design_id || payload.popupDesignId || url.searchParams.get("popup_design_id") || "",
  ).trim();
  const emailRaw = String(payload.email || "").trim();
  const email = emailRaw.toLowerCase();
  const firstName = String(payload.first_name || payload.firstName || "").trim().slice(0, 200);

  if (!popupDesignId) {
    return jsonNoStore({ ok: false, error: "popup_design_id_required" }, 400);
  }
  if (!email) { 
    return jsonNoStore({ ok: false, error: "validation", message: "email_required" }, 400);
  }
  if (!isValidPopupSignupEmail(email)) {
    return jsonNoStore({ ok: false, error: "validation", message: "invalid_email" }, 400);
  }

  const rows = await prisma.popupDesign.findMany({
    where: { shop },
    select: { id: true, popupDesignId: true, configJson: true, templateJson: true },
  });

  let row = null;
  for (const r of rows) {
    const resolvedId =
      String(r.popupDesignId || "").trim() ||
      resolvePopupDesignId(parsePopupDesignConfig(r.configJson), r.id);
    if (resolvedId === popupDesignId) {
      row = r;
      break;
    }
  }

  if (!row) {
    return jsonNoStore({ ok: false, error: "popup_not_found" }, 404);
  }

  const parsedCfg = parsePopupDesignConfig(row.configJson);
  if (parsedCfg.emailCaptureEnabled !== true) {
    return jsonNoStore({ ok: false, error: "email_capture_disabled" }, 403);
  }

  const allowSignup = parsedCfg.subscriberSignupEnabled === true;
  const allowCustomer = parsedCfg.shopifyCustomerCreateEnabled === true;
  if (!allowSignup && !allowCustomer) {
    return jsonNoStore({ ok: false, error: "signup_disabled" }, 403);
  }

  const intent = String(payload.intent || "").trim();
  if (intent === "verify_customer") {
    if (!allowCustomer) {
      return jsonNoStore({ ok: false, error: "verify_disabled" }, 403);
    }
    try {
      const { admin } = await shopify.unauthenticated.admin(shop);
      const { customer: node, lookupBlocked } = await findCustomerByEmailWithMeta(admin, emailRaw.trim());
      // if (lookupBlocked) {
      //   return jsonNoStore(
      //     {
      //       ok: false,
      //       error: "protected_customer_data",
      //       message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
      //     },
      //     403,
      //   );
      // }
      return jsonNoStore({
        ok: true,
        found: Boolean(node),
        customer: node,
      });
    } catch (e) {
      if (e instanceof SessionNotFoundError || e?.name === "SessionNotFoundError") {
        return jsonNoStore(
          {
            ok: false,
            error: "session_missing",
            message: "Open the app in Shopify admin once so it can create customers for this store.",
          },
          503,
        );
      }
      // if (isProtectedCustomerDataAccessError(e)) {
      //   return jsonNoStore(
      //     {
      //       ok: false,
      //       error: "protected_customer_data",
      //       message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
      //     },
      //     403,
      //   );
      // }
      throw e;
    }
  }

  let customer = null;
  let alreadyCustomer = false;
  if (allowCustomer) {
    try {
      const { admin } = await shopify.unauthenticated.admin(shop);
      const input = {
        email: emailRaw.trim(),
        ...(firstName ? { firstName } : {}),
        tags: [POPUP_CUSTOMER_SOURCE_TAG],
      };
      if (parsedCfg.customerCreateMarketingOptIn !== false) {
        input.emailMarketingConsent = {
          marketingState: "SUBSCRIBED",
          marketingOptInLevel: "SINGLE_OPT_IN",
        };
      }
      const response = await admin.graphql(CUSTOMER_CREATE_MUTATION, { variables: { input } });
      const json = await response.json();
      const payloadCreate = json?.data?.customerCreate;
      /** PCD warnings can appear as top-level `errors` even when `customerCreate.customer.id` is present. */
      const createdCustomerId = payloadCreate?.customer?.id;
      console.log("json.errors=========>", createdCustomerId);
      if (json?.errors?.length) {
        // if (graphQlErrorsLookLikeProtectedCustomerData(json.errors)) {
        //   if (!createdCustomerId) {
        //     return jsonNoStore(
        //       {
        //         ok: false,
        //         error: "protected_customer_data",
        //         message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
        //       },
        //       403,
        //     );
        //   }
        // } else {
        //   const messages = json.errors.map((e) => e?.message).filter(Boolean);
        //   return jsonNoStore(
        //     { ok: false, error: "graphql", messages: messages.length ? messages : ["GraphQL error"] },
        //     502,
        //   );
        // }
      }
      const userErrors = payloadCreate?.userErrors || [];
      if (userErrors.length) {
        if (hasDuplicateEmailCustomerUserError(userErrors)) {
          alreadyCustomer = true;
          const { customer: found } = await findCustomerByEmailWithMeta(admin, emailRaw.trim());
          customer = found || { id: null, email: emailRaw.trim() };
        } else {
          return jsonNoStore({ ok: false, error: "shopify_user_errors", userErrors }, 400);
        }
      } else {
        customer = payloadCreate?.customer ?? null;
      }
    } catch (e) {
      if (e instanceof SessionNotFoundError || e?.name === "SessionNotFoundError") {
        return jsonNoStore(
          {
            ok: false,
            error: "session_missing",
            message: "Open the app in Shopify admin once so it can create customers for this store.",
          },
          503,
        );
      }
        // if (isProtectedCustomerDataAccessError(e)) {
        //   return jsonNoStore(
        //     {
        //       ok: false,
        //       error: "protected_customer_data",
        //       message: PROTECTED_CUSTOMER_DATA_PUBLIC_MESSAGE,
        //     },
        //     403,
        //   );
        // }
      throw e;
    }
  }

  let alreadySignedUp = false;
  if (allowSignup) {
    try {
      await prisma.popupSignup.create({
        data: {
          shop,
          popupDesignId,
          email,
          firstName: firstName || "",
        },
      });
    } catch (e) {
      if (e && e.code === "P2002") {
        alreadySignedUp = true;
      } else {
        throw e;
      }
    }
  }

  const subscriberCount = await prisma.popupSignup.count({
    where: { shop, popupDesignId },
  });

  return jsonNoStore({
    ok: true,
    subscriberCount,
    alreadySignedUp,
    customer,
    alreadyCustomer,
  });
};
