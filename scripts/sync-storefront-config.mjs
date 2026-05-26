/**
 * Sync tier/widget JSON to the shop metafield (storefront embed fallback).
 * Usage: node scripts/sync-storefront-config.mjs geekify-app.myshopify.com
 */
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { syncStorefrontConfigToShopMetafield } from "../app/lib/storefront-config-sync.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

loadEnv();

const shop = process.argv[2];
if (!shop) {
  console.error("Usage: node scripts/sync-storefront-config.mjs <shop.myshopify.com>");
  process.exit(1);
}

const prisma = new PrismaClient();
const sessionStorage = new PrismaSessionStorage(prisma);

function readClientId() {
  const toml = readFileSync(join(root, "shopify.app.geekify-upsells-progress-bar.toml"), "utf8");
  const m = toml.match(/^\s*client_id\s*=\s*"([^"]+)"/m);
  return (
    process.env.SHOPIFY_API_KEY?.trim() ||
    process.env.SHOPIFY_APP_API_KEY?.trim() ||
    m?.[1]?.trim() ||
    ""
  );
}

const shopify = shopifyApi({
  apiKey: readClientId(),
  apiSecretKey: process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_SECRET_KEY || "dev",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(",") || [],
  hostName: new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname,
  isEmbeddedApp: true,
});

const sessionId = `offline_${shop}`;
const session = await sessionStorage.loadSession(sessionId);
if (!session?.accessToken) {
  console.error(
    `No offline session for ${shop}. Open the app in admin on that store while shopify app dev is running.`,
  );
  process.exit(1);
}

const admin = new shopify.clients.Graphql({ session });
const result = await syncStorefrontConfigToShopMetafield(admin, shop);
console.log(result);
await prisma.$disconnect();
process.exit(result.ok ? 0 : 1);
