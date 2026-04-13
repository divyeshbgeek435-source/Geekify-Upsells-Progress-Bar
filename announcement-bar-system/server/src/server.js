import express from "express";
import cors from "cors";
import {
  createAnnouncement,
  getAnnouncementById,
  listAnnouncements,
  DEFAULT_ANNOUNCEMENT,
} from "./store.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/announcements", async (req, res) => {
  const { text, backgroundColor, textColor, buttonText, buttonLink } = req.body || {};
  if (!String(text || "").trim()) {
    return res.status(400).json({ ok: false, error: "text is required" });
  }

  const created = await createAnnouncement({
    text,
    backgroundColor,
    textColor,
    buttonText,
    buttonLink,
  });

  return res.status(201).json({ ok: true, announcement: created });
});

app.get("/announcement/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const found = id ? await getAnnouncementById(id) : null;

  if (!found) {
    return res.json({
      ok: true,
      announcement: DEFAULT_ANNOUNCEMENT,
      fallback: true,
    });
  }

  return res.json({ ok: true, announcement: found, fallback: false });
});

app.get("/announcements", async (_req, res) => {
  const rows = await listAnnouncements();
  res.json({ ok: true, announcements: rows });
});

app.listen(PORT, () => {
  console.log(`Announcement API listening on http://localhost:${PORT}`);
});
