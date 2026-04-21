import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis;

/** Busts the dev singleton when `prisma generate` adds/removes fields (cached client would otherwise stay on an old DMMF). */
function prismaSchemaCacheSignature() {
  try {
    const sig = JSON.stringify({
      announcementBar: Prisma.AnnouncementBarScalarFieldEnum ?? null,
      session: Prisma.SessionScalarFieldEnum ?? null,
      cartAccessLog: Prisma.CartAccessLogScalarFieldEnum ?? null,
      thresholdTier: Prisma.ThresholdTierScalarFieldEnum ?? null,
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

const PRISMA_KEY = `__cartShopifyPrisma_${prismaSchemaCacheSignature()}`;

/**
 * A complete client must include delegates for every model this app uses.
 * If `prisma generate` was never run after adding a model, `new PrismaClient()`
 * still constructs but omits new delegates — we must not cache that instance.
 */
function clientIsComplete(client) {
  return (
    client &&
    typeof client.session?.findMany === "function" &&
    typeof client.cartAccessLog?.findMany === "function" &&
    typeof client.announcementBar?.findMany === "function" &&
    typeof client.thresholdTier?.findMany === "function"
  );
}

function makePrisma() {
  return new PrismaClient();
}

function getPrisma() {
  let client = globalForPrisma[PRISMA_KEY];
  if (!clientIsComplete(client)) {
    if (client) {
      client.$disconnect().catch(() => {});
    }
    client = makePrisma();
    if (!clientIsComplete(client)) {
      delete globalForPrisma[PRISMA_KEY];
      throw new Error(
        "Prisma Client is missing required models (session, cartAccessLog, or announcementBar). " +
          "ThresholdTier delegate is also required for tiered discounts. " +
          "Run `npx prisma generate` in the project root and restart the dev server. " +
          "If you already did that, Vite may have loaded Prisma’s browser stub: keep `ssr.external: [\"@prisma/client\"]` in vite.config.js (see project vite.config.js).",
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
      const value = Reflect.get(client, prop, client);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  },
);

export default prisma;
