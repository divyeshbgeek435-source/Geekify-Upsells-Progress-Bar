const API_BASE = "http://localhost:4000";

export async function createAnnouncement(payload) {
  const res = await fetch(`${API_BASE}/announcements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to create announcement");
  }
  return data.announcement;
}

export async function fetchAnnouncementById(id) {
  const res = await fetch(`${API_BASE}/announcement/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error("Failed to load announcement");
  }
  return data;
}
