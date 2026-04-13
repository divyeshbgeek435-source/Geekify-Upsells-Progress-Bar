import { useState } from "react";
import { createAnnouncement } from "../api.js";

const initial = {
  text: "",
  backgroundColor: "#111827",
  textColor: "#ffffff",
  buttonText: "",
  buttonLink: "",
};

export default function AdminForm({ onCreated }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createAnnouncement(form);
      onCreated(created.id);
      setForm(initial);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
      <h2>Create Announcement</h2>
      <input
        required
        placeholder="Announcement text"
        value={form.text}
        onChange={(e) => patch("text", e.target.value)}
      />
      <label>
        Background
        <input
          type="color"
          value={form.backgroundColor}
          onChange={(e) => patch("backgroundColor", e.target.value)}
        />
      </label>
      <label>
        Text color
        <input type="color" value={form.textColor} onChange={(e) => patch("textColor", e.target.value)} />
      </label>
      <input
        placeholder="Button text (optional)"
        value={form.buttonText}
        onChange={(e) => patch("buttonText", e.target.value)}
      />
      <input
        placeholder="Button link (optional)"
        value={form.buttonLink}
        onChange={(e) => patch("buttonLink", e.target.value)}
      />
      <button disabled={saving} type="submit">
        {saving ? "Saving..." : "Save announcement"}
      </button>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </form>
  );
}
