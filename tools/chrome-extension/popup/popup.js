const TYPE_LABELS = {
  apply: "trackApplication",
  account: "trackAccount",
  impression: "Impression",
  "confirm-human": "Confirm human",
};

// fr-badge variant by event type
const TYPE_BADGE = {
  apply: "fr-badge--success",
  account: "fr-badge--info",
  impression: "",
  "confirm-human": "fr-badge--warning",
};

function statusBadgeClass(code) {
  if (code >= 400) return "fr-badge--error";
  if (code === 204) return "fr-badge--warning";
  return "fr-badge--success";
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR");
}

// ── F1 rendering ─────────────────────────────────────────────────────────────

function renderNotice(type, title) {
  return `
    <div class="fr-alert fr-alert--${type} fr-alert--sm">
      <p>${title}</p>
    </div>`;
}

function renderTagStatus(info) {
  const wrapper = document.getElementById("notice-wrapper");
  const details = document.getElementById("tag-details");

  if (!info || !info.detected) {
    wrapper.innerHTML = renderNotice("error", "Jstag non détecté sur cette page");
    renderCookie(info);
    return;
  }

  wrapper.innerHTML = renderNotice("success", "Jstag détecté");
  details.style.display = "block";

  document.getElementById("detail-publisher").textContent = info.publisherId || "Non configuré";

  const sourceEl = document.getElementById("detail-source");
  if (info.scriptSource === "official") {
    sourceEl.innerHTML = badge("success", "Officiel", true);
  } else if (info.scriptSource === "self-hosted") {
    sourceEl.innerHTML = badge("warning", "Auto-hébergé", true);
  } else {
    sourceEl.textContent = "—";
  }

  document.getElementById("detail-version").textContent = info.version || "—";

  renderCookie(info);
}

function renderCookie(info) {
  const el = document.getElementById("detail-cookie");
  if (!el) return;

  if (info && info.cookie) {
    const short = info.cookie.length > 26 ? info.cookie.slice(0, 26) + "…" : info.cookie;
    el.innerHTML = `<span class="mono" title="${info.cookie}">${short}</span>`;
  } else if (info && info.cookieInQs) {
    const short = info.cookieInQs.length > 26 ? info.cookieInQs.slice(0, 26) + "…" : info.cookieInQs;
    el.innerHTML = badge("warning", "Dans l'URL — cookie non encore posé", true) + ` <span class="mono fr-text--xs">${short}</span>`;
  } else {
    el.innerHTML = badge("error", "Absent", true);
  }
}

// ── F2 rendering ─────────────────────────────────────────────────────────────

function badge(variant, text, sm = false) {
  const smClass = sm ? " fr-badge--sm" : "";
  const variantClass = variant ? ` fr-badge--${variant}` : "";
  return `<p class="fr-badge${variantClass}${smClass}">${text}</p>`;
}

function renderEvents(events) {
  const list = document.getElementById("events-list");
  const empty = document.getElementById("empty-state");

  if (!events || events.length === 0) {
    if (empty) empty.style.display = "";
    // Remove any existing event items
    list.querySelectorAll(".ae-event").forEach((el) => el.remove());
    return;
  }

  if (empty) empty.style.display = "none";
  list.querySelectorAll(".ae-event").forEach((el) => el.remove());

  [...events].reverse().forEach((ev) => {
    const item = document.createElement("div");
    item.className = "ae-event";
    item.dataset.type = ev.type;

    const label = TYPE_LABELS[ev.type] || ev.type;
    const typeBadgeClass = TYPE_BADGE[ev.type] ?? "";
    const sc = statusBadgeClass(ev.status);

    const paramRows = Object.entries(ev.params)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => `<div class="ae-param-row"><span class="ae-param-key">${k}</span><span class="ae-param-val">${v}</span></div>`)
      .join("");

    item.innerHTML = `
      <div class="ae-event__header">
        ${badge(typeBadgeClass.replace("fr-badge--", ""), label, true)}
        ${badge(sc.replace("fr-badge--", ""), String(ev.status), true)}
        <span class="ae-event__time">${formatTime(ev.timestamp)}</span>
      </div>
      <div class="ae-event__params fr-text--xs">
        ${paramRows || '<span style="color:var(--text-mention-grey)">Aucun paramètre</span>'}
      </div>`;

    item.addEventListener("click", () => item.classList.toggle("expanded"));
    list.appendChild(item);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // F1 — Detect jstag
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/detect.js"],
      world: "MAIN",
    });
    renderTagStatus(results?.[0]?.result ?? null);
  } catch {
    renderTagStatus(null);
  }

  // F2 — Load events
  const key = `tab_${tab.id}`;
  const stored = await chrome.storage.session.get(key);
  renderEvents(stored[key] || []);

  document.getElementById("btn-clear").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "ae_clear", tabId: tab.id });
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
    renderEvents([]);
  });
}

init();
