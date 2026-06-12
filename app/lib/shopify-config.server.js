import { readdirSync, readFileSync } from "node:fs";
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

function normalizeAppUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/$/, "");
}

function readApplicationUrlFromToml() {
  try {
    const root = join(__dirname, "..", "..");
    const files = readdirSync(root).filter(
      (name) => name.startsWith("shopify.app") && name.endsWith(".toml"),
    );
    for (const file of files) {
      const toml = readFileSync(join(root, file), "utf8");
      const match = toml.match(/^\s*application_url\s*=\s*"([^"]+)"/m);
      const url = match?.[1]?.trim() ?? "";
      if (url && !url.includes("example.com")) return url;
    }
  } catch {
    // ignore missing or unreadable config
  }
  return "";
}

/** SHOPIFY_APP_URL, or host-provided / shopify.app.toml fallbacks when unset. */
export function resolveShopifyAppUrl() {
  const candidates = [
    process.env.SHOPIFY_APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_EXTERNAL_HOSTNAME,
    process.env.RAILWAY_STATIC_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.HOST,
    readApplicationUrlFromToml(),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAppUrl(candidate);
    if (normalized) return normalized;
  }

  return "";
}
