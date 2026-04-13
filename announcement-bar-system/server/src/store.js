import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "announcements.json");

export const DEFAULT_ANNOUNCEMENT = {
  id: "default",
  text: "Welcome to our store",
  backgroundColor: "#111827",
  textColor: "#ffffff",
  buttonText: "",
  buttonLink: "",
  createdAt: new Date(0).toISOString(),
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readAll() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeAll(rows) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export async function createAnnouncement(input) {
  const rows = await readAll();
  const row = {
    id: randomUUID(),
    text: String(input.text || "").trim(),
    backgroundColor: String(input.backgroundColor || "#111827"),
    textColor: String(input.textColor || "#ffffff"),
    buttonText: String(input.buttonText || "").trim(),
    buttonLink: String(input.buttonLink || "").trim(),
    createdAt: new Date().toISOString(),
  };
  rows.unshift(row);
  await writeAll(rows);
  return row;
}

export async function listAnnouncements() {
  return readAll();
}

export async function getAnnouncementById(id) {
  const rows = await readAll();
  return rows.find((r) => r.id === id) || null;
}
