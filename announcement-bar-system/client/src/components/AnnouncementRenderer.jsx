import { useEffect, useState } from "react";
import { fetchAnnouncementById } from "../api.js";
import AnnouncementBar from "./AnnouncementBar.jsx";

export default function AnnouncementRenderer({ announcementId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!announcementId) {
      setLoading(false);
      setError("No announcement ID provided.");
      return;
    }
    setLoading(true);
    setError("");
    fetchAnnouncementById(announcementId)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  if (loading) {
    return <div style={{ padding: 12 }}>Loading announcement...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 12, color: "crimson", background: "#fff1f2" }}>
        Could not load announcement. {error}
      </div>
    );
  }

  if (!payload?.announcement) {
    return <div style={{ padding: 12 }}>No announcement available.</div>;
  }

  return <AnnouncementBar announcement={payload.announcement} fallback={payload.fallback} />;
}
