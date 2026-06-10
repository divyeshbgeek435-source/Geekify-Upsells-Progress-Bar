import path from "node:path";
import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const prismaClientNodeEntry = path.join(
  projectRoot,
  "node_modules/.prisma/client/default.js",
);

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the Vite server.
// The CLI will eventually stop passing in HOST,
// so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost")
  .hostname;
let hmrConfig;

if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  // Prisma must load the Node client (`.prisma/client/default`), not `index-browser.js`,
  // or delegates like `announcementBar.findMany` are missing and db.server throws.
  resolve: {
    alias: {
      "@prisma/client": prismaClientNodeEntry,
    },
    conditions: ["node", "import", "module", "default"],
  },
  ssr: {
    external: ["@prisma/client", ".prisma/client"],
    resolve: {
      conditions: ["node", "import", "module", "default"],
      /** Prefer the Node engine for externals (avoids the browser `Prisma = {}` stub). */
      externalConditions: ["node"],
    },
  },
  server: {
    allowedHosts: [host],
    cors: {
      preflightContinue: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ["app", "node_modules"],
    },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react"],
  },
});
