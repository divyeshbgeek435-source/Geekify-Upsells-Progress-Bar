export default function AnnouncementBar({ announcement, fallback }) {
  const {
    text = "",
    backgroundColor = "#111827",
    textColor = "#ffffff",
    buttonText = "",
    buttonLink = "",
  } = announcement || {};

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        color: textColor,
        background: backgroundColor,
      }}
    >
      <strong>{text || "No text"}</strong>
      {buttonText ? (
        <a
          href={buttonLink || "#"}
          style={{
            background: "#ffffff22",
            color: textColor,
            border: "1px solid #ffffff40",
            borderRadius: 6,
            padding: "6px 10px",
            textDecoration: "none",
          }}
        >
          {buttonText}
        </a>
      ) : null}
      {fallback ? <span style={{ fontSize: 12, opacity: 0.8 }}>(default)</span> : null}
    </div>
  );
}
