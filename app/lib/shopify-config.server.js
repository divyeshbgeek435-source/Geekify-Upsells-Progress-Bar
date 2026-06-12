import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Same value as shopify.app.toml client_id. Used when SHOPIFY_API_KEY is missing in env.
 */
export function readClientIdFromToml() {
  try {
    const tomlPath = join(__dirname, "..", "..", "shopify.app.toml");
    const toml = readFileSync(tomlPath, "utf8");
    const match = toml.match(/^\s*client_id\s*=\s*"([^"]+)"/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

export function getShopifyAppClientId() {
  const fromEnv =
    process.env.SHOPIFY_API_KEY?.trim() ||
    process.env.SHOPIFY_APP_API_KEY?.trim() ||
    "";
  return fromEnv || readClientIdFromToml();
}

/** SHOPIFY_APP_URL, or Railway's auto-injected public URL when unset. */
export function resolveShopifyAppUrl() {
  const explicit = process.env.SHOPIFY_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railwayStatic = process.env.RAILWAY_STATIC_URL?.trim();
  if (railwayStatic) return railwayStatic.replace(/\/$/, "");

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) return `https://${railwayDomain}`;

  return "";
}
