// Content script permanent — affiche un toast overlay quand un événement de tracking part

const TYPE_COLORS = {
  apply: "#1a7a4a",
  account: "#1a4a7a",
  impression: "#6b7280",
  "confirm-human": "#a05a00",
};

const TYPE_LABELS = {
  apply: "trackApplication",
  account: "trackAccount",
  impression: "Impression",
  "confirm-human": "Confirm human",
};

function formatParams(params) {
  const keys = ["publisher", "mission", "view", "clientEventId"];
  return keys
    .filter((k) => params[k])
    .map((k) => {
      const val = params[k];
      return `<span style="opacity:.7">${k}:</span> ${val.length > 20 ? val.slice(0, 20) + "…" : val}`;
    })
    .join("  ");
}

function showToast(event) {
  const color = TYPE_COLORS[event.type] || "#333";
  const label = TYPE_LABELS[event.type] || event.type;
  const time = new Date(event.timestamp).toLocaleTimeString("fr-FR");

  const toast = document.createElement("div");
  toast.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:16px",
      "right:16px",
      "z-index:2147483647",
      `background:${color}`,
      "color:#fff",
      "font-family:monospace",
      "font-size:12px",
      "line-height:1.5",
      "padding:10px 14px",
      "border-radius:6px",
      "box-shadow:0 4px 12px rgba(0,0,0,.3)",
      "max-width:360px",
      "word-break:break-word",
      "transition:opacity .4s ease",
      "opacity:1",
      "pointer-events:none",
    ].join(";")
  );

  const statusColor = event.status >= 400 ? "#f87171" : "#86efac";
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <strong>${label}</strong>
      <span style="font-size:10px;background:rgba(255,255,255,.2);padding:1px 6px;border-radius:10px">${event.status}</span>
      <span style="margin-left:auto;opacity:.6;font-size:10px">${time}</span>
    </div>
    <div style="font-size:11px;opacity:.85">${formatParams(event.params)}</div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ae_event" && message.event) {
    showToast(message.event);
  }
});
