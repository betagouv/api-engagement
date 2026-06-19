const EVENT_HOST = "https://api.api-engagement.beta.gouv.fr";

const TYPE_COLORS = {
  apply: "#1a7a4a",
  account: "#1a4a7a",
  impression: "#555",
  "confirm-human": "#a05a00",
};

function parseEvent(details) {
  const url = new URL(details.url);
  const path = url.pathname; // e.g. /r/apply, /r/account, /r/impression/x/y, /r/x/confirm-human

  let type = "unknown";
  const segments = path.split("/").filter(Boolean); // ['r', 'apply'] or ['r', 'x', 'confirm-human']

  if (segments[0] !== "r") return null;

  if (segments[1] === "apply") {
    type = "apply";
  } else if (segments[1] === "account") {
    type = "account";
  } else if (segments[1] === "impression") {
    type = "impression";
  } else if (segments.length >= 3 && segments[2] === "confirm-human") {
    type = "confirm-human";
  } else {
    return null;
  }

  const params = {};
  for (const [k, v] of url.searchParams.entries()) {
    params[k] = v;
  }

  // For impression: missionId and publisherId are in path segments
  if (type === "impression" && segments.length >= 4) {
    params._missionId = segments[2];
    params._publisherId = segments[3];
  }

  if (type === "confirm-human") {
    params._statsId = segments[1];
  }

  return {
    type,
    timestamp: new Date().toISOString(),
    url: details.url,
    params,
    status: details.statusCode,
  };
}

function updateBadge(tabId, events) {
  const count = events.length;
  if (count === 0) return;
  chrome.action.setBadgeText({ text: String(count), tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#1a7a4a", tabId });
}

// In-memory source of truth — JS est single-threaded, les appends sont atomiques.
// Évite la race condition read/modify/write sur chrome.storage.session quand plusieurs
// requêtes /r/* se terminent simultanément (ex. burst d'impressions).
const tabEvents = new Map();

function getEvents(tabId) {
  if (!tabEvents.has(tabId)) tabEvents.set(tabId, []);
  return tabEvents.get(tabId);
}

function persistEvents(tabId) {
  chrome.storage.session.set({ [`tab_${tabId}`]: tabEvents.get(tabId) || [] });
}

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!details.tabId || details.tabId < 0) return;

    const event = parseEvent(details);
    if (!event) return;

    const events = getEvents(details.tabId);
    events.push(event);
    persistEvents(details.tabId);

    updateBadge(details.tabId, events);

    chrome.tabs.sendMessage(details.tabId, { type: "ae_event", event }).catch(() => {
      // Content script pas encore injecté sur cette page — ignoré
    });
  },
  { urls: [`${EVENT_HOST}/r/*`] }
);

// Reset events on page navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading") return;
  tabEvents.set(tabId, []);
  persistEvents(tabId);
  chrome.action.setBadgeText({ text: "", tabId });
});

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvents.delete(tabId);
  chrome.storage.session.remove(`tab_${tabId}`);
});

// Badge for active tab when switching tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const events = getEvents(tabId);
  if (events.length > 0) {
    chrome.action.setBadgeText({ text: String(events.length), tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#1a7a4a", tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
