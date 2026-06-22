// Injecté en MAIN world via chrome.scripting.executeScript
// Lit l'état du jstag sur la page courante et retourne un objet de diagnostic

(function () {
  const result = {
    detected: false,
    publisherId: null,
    scriptUrl: null,
    scriptSource: "unknown", // "official" | "self-hosted" | "unknown"
    version: null,
    cookie: null, // valeur du cookie apiengagement, ou null si absent
    cookieInQs: null, // valeur de ?apiengagement_id dans l'URL courante, ou null
  };

  // Cookie readable regardless of jstag presence
  const cookieMatch = document.cookie.match(/(?:^|;\s*)apiengagement=([^;]+)/);
  result.cookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  // Query string param (page d'arrivée depuis un lien tracké)
  const qsMatch = location.search.match(/[?&]apiengagement_id=([^&]+)/);
  result.cookieInQs = qsMatch ? decodeURIComponent(qsMatch[1]) : null;

  if (typeof window._apieng === "undefined") {
    return result;
  }

  result.detected = true;
  result.publisherId = window._apieng.accountId || null;

  // Find the jstag <script> tag
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const jstagScript = scripts.find((s) => s.src.includes("jstag") || s.src.includes("api-engagement"));

  if (jstagScript) {
    result.scriptUrl = jstagScript.src;
    if (jstagScript.src.includes("app.api-engagement.beta.gouv.fr")) {
      result.scriptSource = "official";
    } else {
      result.scriptSource = "self-hosted";
    }
  }

  // v1 is the only version in circulation
  result.version = "v1";

  return result;
})();
