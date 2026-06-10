import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const nodeRequire = createRequire(import.meta.url);

/** Load the Node Prisma engine via CJS `require` so Vite never resolves the browser stub. */
function loadPrismaModule() {
  const entry = nodeRequire.resolve("@prisma/client", { paths: [process.cwd()] });
  return nodeRequire(entry);
}

let prismaModuleCache;
function getPrismaModule() {
  if (!prismaModuleCache) prismaModuleCache = loadPrismaModule();
  return prismaModuleCache;
}

function getPrismaNamespace() {
  return getPrismaModule().Prisma;
}

const globalForPrisma = globalThis;
const REQUIRED_DELEGATES = [
  "session",
  "cartAccessLog",
  "announcementBar",
  "announcementBody",
  "announcementHeader",
  "popupDesign",
  "popupSignup",
  "discount",
  "shopPlanState",
];

/** Bump when ShopPlanState (or other) columns change so dev never keeps a stale DMMF instance. */
const PRISMA_CACHE_VERSION = "v6_storefrontLock";

/** Busts the dev singleton when `prisma generate` adds/removes fields (cached client would otherwise stay on an old DMMF). */
function prismaSchemaCacheSignature() {
  try {
    const Prisma = getPrismaNamespace();
    const sig = JSON.stringify({
      announcementBar: Prisma.AnnouncementBarScalarFieldEnum ?? null,
      announcementBody: Prisma.AnnouncementBodyScalarFieldEnum ?? null,
      announcementHeader: Prisma.AnnouncementHeaderScalarFieldEnum ?? null,
      popupDesign: Prisma.PopupDesignScalarFieldEnum ?? null,
      popupSignup: Prisma.PopupSignupScalarFieldEnum ?? null,
      session: Prisma.SessionScalarFieldEnum ?? null,
      cartAccessLog: Prisma.CartAccessLogScalarFieldEnum ?? null,
      discount: Prisma.DiscountScalarFieldEnum ?? null,
      shopPlanState: Prisma.ShopPlanStateScalarFieldEnum ?? null,
    });
    let h = 0;
    for (let i = 0; i < sig.length; i++) {
      h = (Math.imul(31, h) + sig.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
  } catch {
    return "0";
  }
}

const PRISMA_KEY = `__cartShopifyPrisma_${PRISMA_CACHE_VERSION}_${prismaSchemaCacheSignature()}`;

/**
 * A complete client must include delegates for every model this app uses.
 * If `prisma generate` was never run after adding a model, `new PrismaClient()`
 * still constructs but omits new delegates - we must not cache that instance.
 */
function shopPlanStateModelFieldNames(client) {
  const model = client?._runtimeDataModel?.models?.ShopPlanState;
  if (!model?.fields) return [];
  return model.fields.map((field) => field.name);
}

/** PrismaClient snapshots the DMMF at construction; reject singletons from before trial columns existed. */
function clientHasShopPlanTrialFields(client) {
  const names = shopPlanStateModelFieldNames(client);
  return (
    names.includes("premiumTrialStartedAt") &&
    names.includes("premiumTrialConsumedAt") &&
    names.includes("premiumTrialExpiredAt") &&
    names.includes("premiumSubscriptionActive")
  );
}

function clientIsComplete(client) {
  return (
    getMissingDelegates(client).length === 0 && clientHasShopPlanTrialFields(client)
  );
}

function purgeStalePrismaSingletons() {
  for (const key of Object.getOwnPropertyNames(globalForPrisma)) {
    if (key.startsWith("__cartShopifyPrisma_") && key !== PRISMA_KEY) {
      const stale = globalForPrisma[key];
      if (stale?.$disconnect) stale.$disconnect().catch(() => {});
      delete globalForPrisma[key];
    }
  }
}

function getMissingDelegates(client) {
  if (!client) return REQUIRED_DELEGATES.slice();
  return REQUIRED_DELEGATES.filter(
    (delegate) => typeof client?.[delegate]?.findMany !== "function",
  );
}

function makePrisma() {
  const { PrismaClient } = getPrismaModule();
  return new PrismaClient();
}

const DISCOUNT_KIND_TIER = "TIER_DISCOUNT";
const DISCOUNT_KIND_WIDGET = "WIDGET_SETTINGS";
const WIDGET_ROW_NAME = "__widget_settings__";

const DEFAULT_WIDGET_SETTINGS = {
  sequentialMsg0:
    "Unlock Tier 1 to apply your cart discount. Then unlock Tier 2 for free shipping.",
  sequentialMsg1: "Apply discount to unlock free shipping",
  sequentialMsg2: "Free shipping unlocked",
  sequentialHintZero: "Progress: 0% - unlock Tier 1 to start.",
  sequentialHintMid: "Progress: 50% - unlock Tier 2 for free shipping.",
  tier1Icon: "%",
  tier2Icon: "🚚",
  subtotalLabel: "Current subtotal",
  estimatedShippingLabel: "Estimated shipping",
  widgetBackgroundColor: "#ffffff",
  widgetTextColor: "#111827",
  widgetBorderColor: "#000000",
  widgetUseCustomColors: false,
  tier1LabelText: "Discount",
  tier2LabelText: "Free shipping",
  minAmountPrefixText: "Min.",
  showTierIcons: true,
  showTierLabels: true,
  showTierMinimums: true,
  widgetDynamicConfigJson: "{}",
  selectorTargets:
    ".product__info-container,.cart-drawer , .cart-drawer__content, .drawer__inner, form[action='/cart'], .cart__blocks",
  nameTargetSelectors:
    ".cart-drawer__content, .cart-drawer ,.drawer__inner, .drawer__header, form[action='/cart'], .cart__blocks",
  sequentialTitle: "Rewards progress",
};

function parseJsonObject(raw, fallback = {}) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function dateOrNull(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchWhere(where, row) {
  if (!where) return true;
  for (const [key, expected] of Object.entries(where)) {
    if (expected == null) continue;
    const actual = row[key];
    if (typeof expected === "object" && !Array.isArray(expected)) {
      if (Object.prototype.hasOwnProperty.call(expected, "in")) {
        if (!expected.in.includes(actual)) return false;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(expected, "lt")) {
        const left = dateOrNull(actual)?.getTime();
        const right = dateOrNull(expected.lt)?.getTime();
        if (left == null || right == null || left >= right) return false;
        continue;
      }
    }
    if (actual !== expected) return false;
  }
  return true;
}

function applyOrderBy(rows, orderBy) {
  if (!orderBy) return rows;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  const out = [...rows];
  out.sort((a, b) => {
    for (const clause of clauses) {
      const [field, dir] = Object.entries(clause || {})[0] || [];
      if (!field) continue;
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return String(dir).toLowerCase() === "desc" ? -cmp : cmp;
    }
    return 0;
  });
  return out;
}

function mapTierRows(discountRows) {
  return discountRows.flatMap((row) => {
    const payload = parseJsonObject(row.dataJson, {});
    const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
    return tiers.map((tier, idx) => ({
      id: String(tier.id || randomUUID()),
      shop: row.shop,
      discountName: row.name || "Default Discount",
      name: String(tier.name || `Tier ${idx + 1}`),
      minSubtotal: Number(tier.minSubtotal || 0),
      rewardType: String(tier.rewardType || "PERCENTAGE"),
      discountPercent:
        tier.discountPercent == null ? null : Number(tier.discountPercent),
      message: String(tier.message || ""),
      position: Number(tier.position ?? idx),
      active: tier.active !== false,
      usageCount: Number(tier.usageCount || 0),
      scheduleStartAt: dateOrNull(tier.scheduleStartAt),
      scheduleEndAt: dateOrNull(tier.scheduleEndAt),
      createdAt: dateOrNull(tier.createdAt) || row.createdAt,
      updatedAt: dateOrNull(tier.updatedAt) || row.updatedAt,
    }));
  });
}

function projectFields(row, select) {
  if (!select) return row;
  const out = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) out[key] = row[key];
  }
  return out;
}

function buildCompatDelegates(client) {
  const tierDiscount = {
    async findMany({ where, orderBy } = {}) {
      const rows = await client.discount.findMany({
        where: { ...(where || {}), kind: DISCOUNT_KIND_TIER },
      });
      const mapped = rows.map((row) => ({
        id: row.id,
        shop: row.shop,
        name: row.name,
        active: row.active,
        scheduleStartAt: row.scheduleStartAt,
        scheduleEndAt: row.scheduleEndAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
      return applyOrderBy(mapped, orderBy);
    },
    async findUnique({ where } = {}) {
      const key = where?.shop_name;
      if (!key?.shop || !key?.name) return null;
      return client.discount.findUnique({
        where: {
          shop_kind_name: {
            shop: key.shop,
            kind: DISCOUNT_KIND_TIER,
            name: key.name,
          },
        },
      });
    },
    async upsert({ where, create, update }) {
      const key = where?.shop_name;
      return client.discount.upsert({
        where: {
          shop_kind_name: {
            shop: key.shop,
            kind: DISCOUNT_KIND_TIER,
            name: key.name,
          },
        },
        create: {
          ...create,
          kind: DISCOUNT_KIND_TIER,
          dataJson: JSON.stringify({ tiers: [] }),
        },
        update,
      });
    },
    async delete({ where }) {
      const key = where?.shop_name;
      return client.discount.delete({
        where: {
          shop_kind_name: {
            shop: key.shop,
            kind: DISCOUNT_KIND_TIER,
            name: key.name,
          },
        },
      });
    },
    async updateMany({ where, data }) {
      const rows = await client.discount.findMany({
        where: { ...(where || {}), kind: DISCOUNT_KIND_TIER },
      });
      let count = 0;
      for (const row of rows) {
        if (!matchWhere(where, row)) continue;
        await client.discount.update({
          where: { id: row.id },
          data,
        });
        count += 1;
      }
      return { count };
    },
  };

  const thresholdTier = {
    async findMany({ where, orderBy, select } = {}) {
      const rows = await client.discount.findMany({
        where: { shop: where?.shop, kind: DISCOUNT_KIND_TIER },
      });
      const tiers = mapTierRows(rows).filter((row) => matchWhere(where, row));
      return applyOrderBy(tiers, orderBy).map((row) => projectFields(row, select));
    },
    async create({ data }) {
      const discountName = String(data.discountName || "Default Discount");
      const row = await client.discount.upsert({
        where: {
          shop_kind_name: {
            shop: data.shop,
            kind: DISCOUNT_KIND_TIER,
            name: discountName,
          },
        },
        create: {
          shop: data.shop,
          kind: DISCOUNT_KIND_TIER,
          name: discountName,
          active: true,
          dataJson: JSON.stringify({ tiers: [] }),
        },
        update: {},
      });
      const payload = parseJsonObject(row.dataJson, { tiers: [] });
      const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
      const newTier = {
        id: String(data.id || randomUUID()),
        name: data.name,
        minSubtotal: data.minSubtotal,
        rewardType: data.rewardType,
        discountPercent: data.discountPercent ?? null,
        message: data.message ?? "",
        position: data.position ?? tiers.length,
        active: data.active ?? true,
        usageCount: data.usageCount ?? 0,
        scheduleStartAt: data.scheduleStartAt ?? null,
        scheduleEndAt: data.scheduleEndAt ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tiers.push(newTier);
      await client.discount.update({
        where: { id: row.id },
        data: { dataJson: JSON.stringify({ ...payload, tiers }) },
      });
      return {
        ...newTier,
        shop: data.shop,
        discountName,
      };
    },
    async updateMany({ where, data }) {
      const rows = await client.discount.findMany({
        where: { shop: where?.shop, kind: DISCOUNT_KIND_TIER },
      });
      let count = 0;
      for (const row of rows) {
        const payload = parseJsonObject(row.dataJson, { tiers: [] });
        const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
        let touched = false;
        const nextTiers = tiers.map((tier) => {
          const mapped = {
            ...tier,
            shop: row.shop,
            discountName: row.name,
          };
          if (!matchWhere(where, mapped)) return tier;
          touched = true;
          count += 1;
          return {
            ...tier,
            ...data,
            updatedAt: new Date().toISOString(),
          };
        });
        if (touched) {
          await client.discount.update({
            where: { id: row.id },
            data: { dataJson: JSON.stringify({ ...payload, tiers: nextTiers }) },
          });
          if (data.discountName && data.discountName !== row.name) {
            await client.discount.update({
              where: { id: row.id },
              data: { name: data.discountName },
            });
          }
        }
      }
      return { count };
    },
    async deleteMany({ where }) {
      if (where?.discountName && where?.shop && !where?.id) {
        const deleted = await client.discount.deleteMany({
          where: {
            shop: where.shop,
            kind: DISCOUNT_KIND_TIER,
            name: where.discountName,
          },
        });
        return { count: deleted.count };
      }
      const rows = await client.discount.findMany({
        where: { shop: where?.shop, kind: DISCOUNT_KIND_TIER },
      });
      let count = 0;
      for (const row of rows) {
        const payload = parseJsonObject(row.dataJson, { tiers: [] });
        const tiers = Array.isArray(payload.tiers) ? payload.tiers : [];
        const nextTiers = tiers.filter((tier) => {
          const mapped = {
            ...tier,
            shop: row.shop,
            discountName: row.name,
          };
          const match = matchWhere(where, mapped);
          if (match) count += 1;
          return !match;
        });
        if (nextTiers.length !== tiers.length) {
          await client.discount.update({
            where: { id: row.id },
            data: { dataJson: JSON.stringify({ ...payload, tiers: nextTiers }) },
          });
        }
      }
      return { count };
    },
  };

  const tierWidgetSettings = {
    async findUnique({ where } = {}) {
      const shop = where?.shop;
      if (!shop) return null;
      const row = await client.discount.findUnique({
        where: {
          shop_kind_name: {
            shop,
            kind: DISCOUNT_KIND_WIDGET,
            name: WIDGET_ROW_NAME,
          },
        },
      });
      if (!row) return null;
      const payload = parseJsonObject(row.dataJson, {});
      return {
        id: row.id,
        shop: row.shop,
        ...DEFAULT_WIDGET_SETTINGS,
        ...payload,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },
    async upsert({ where, create, update }) {
      const shop = where?.shop;
      const current = await tierWidgetSettings.findUnique({ where: { shop } });
      const nextPayload = {
        ...DEFAULT_WIDGET_SETTINGS,
        ...(current || {}),
        ...(current ? update : create),
      };
      const row = await client.discount.upsert({
        where: {
          shop_kind_name: {
            shop,
            kind: DISCOUNT_KIND_WIDGET,
            name: WIDGET_ROW_NAME,
          },
        },
        create: {
          shop,
          kind: DISCOUNT_KIND_WIDGET,
          name: WIDGET_ROW_NAME,
          active: true,
          dataJson: JSON.stringify(nextPayload),
        },
        update: {
          dataJson: JSON.stringify(nextPayload),
        },
      });
      return {
        id: row.id,
        shop: row.shop,
        ...nextPayload,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },
  };

  return { thresholdTier, tierDiscount, tierWidgetSettings };
}

function getPrisma() {
  purgeStalePrismaSingletons();
  let client = globalForPrisma[PRISMA_KEY];
  if (!clientIsComplete(client)) {
    if (client) {
      client.$disconnect().catch(() => {});
    }
    client = makePrisma();
    if (!clientIsComplete(client)) {
      delete globalForPrisma[PRISMA_KEY];
      const missing = getMissingDelegates(client);
      const shopPlanFields = shopPlanStateModelFieldNames(client);
      const trialFieldsMissing = !clientHasShopPlanTrialFields(client);
      throw new Error(
        (missing.length
          ? `Prisma Client is missing required delegates: ${missing.join(", ")}. `
          : trialFieldsMissing
            ? `Prisma Client ShopPlanState is outdated (fields: ${shopPlanFields.join(", ") || "none"}). `
            : "") +
          "Run `npm exec prisma generate` in the project root and restart the dev server. " +
          "If you already did that, Vite may have loaded Prisma’s browser stub: keep `ssr.external: [\"@prisma/client\", \".prisma/client\"]` in vite.config.js.",
      );
    }
    globalForPrisma[PRISMA_KEY] = client;
  }
  return globalForPrisma[PRISMA_KEY];
}

/**
 * Resolve the current PrismaClient on each access so dev reload never keeps a
 * stale reference; `getPrisma()` always returns a validated singleton.
 */
const prisma = new Proxy(
  {},
  {
    get(_target, prop, _receiver) {
      const client = getPrisma();
      if (
        prop === "thresholdTier" ||
        prop === "tierDiscount" ||
        prop === "tierWidgetSettings"
      ) {
        const compat = buildCompatDelegates(client);
        return compat[prop];
      }
      const value = Reflect.get(client, prop, client);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
);

export default prisma;
