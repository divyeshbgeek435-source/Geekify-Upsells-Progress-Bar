import { spawnSync } from "node:child_process";

function normalizeDatabaseUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^postgres(ql)?:\/\//i.test(trimmed)) return trimmed;
  return `postgresql://${trimmed.replace(/^\/+/, "")}`;
}

const normalized = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!normalized) {
  console.error(
    "DATABASE_URL is not set. Add your Postgres connection string in Railway variables.\n" +
      "Example: postgresql://user:password@host:5432/database?sslmode=require",
  );
  process.exit(1);
}

process.env.DATABASE_URL = normalized;

for (const args of [["generate"], ["migrate", "deploy"]]) {
  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
