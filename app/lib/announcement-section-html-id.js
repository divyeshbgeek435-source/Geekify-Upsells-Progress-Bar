/** Safe `id` attribute for the announcement bar root (one DOM section for the whole bar, including marquee). */
export function generateAnnouncementSectionHtmlId() {
  return `sce-announcement-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * @param {unknown} raw
 * @returns {string | null} normalized id, or null if invalid / empty after trim
 */
export function normalizeAnnouncementSectionHtmlId(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(s)) return null;
  return s;
}
