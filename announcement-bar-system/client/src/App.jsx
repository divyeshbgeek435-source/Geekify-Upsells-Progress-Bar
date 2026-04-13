import { useMemo, useState } from "react";
import AdminForm from "./components/AdminForm.jsx";
import AnnouncementRenderer from "./components/AnnouncementRenderer.jsx";

function initialIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("announcementId") || "";
}

export default function App() {
  const [announcementId, setAnnouncementId] = useState(initialIdFromQuery);
  const blockExample = useMemo(
    () => `<AnnouncementRenderer announcementId="${announcementId || "YOUR_ID"}" />`,
    [announcementId],
  );

  return (
    <main style={{ margin: "20px auto", maxWidth: 900, fontFamily: "sans-serif", display: "grid", gap: 20 }}>
      <h1>Announcement Bar Full-Stack Demo</h1>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <AdminForm onCreated={setAnnouncementId} />
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h2>Block/Section Integration</h2>
        <p>Pass announcement ID from a block setting and render by ID:</p>
        <input
          placeholder="Paste announcement ID"
          value={announcementId}
          onChange={(e) => setAnnouncementId(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />
        <code>{blockExample}</code>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <AnnouncementRenderer announcementId={announcementId} />
      </section>
    </main>
  );
}
