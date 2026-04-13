import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const PRISMA_KEY = "__cartShopifyPrisma";

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
    typeof client.announcementBar?.findMany === "function"
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
