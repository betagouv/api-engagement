import { CRISP_BOT_SCENARIO_ID, CRISP_WEBSITE_ID } from "~/services/config";
import type { ConsentStatus } from "~/services/cookie-consent/config";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

// Charge le widget une seule fois et uniquement dans le navigateur.
function loadCrisp(): void {
  if (typeof window === "undefined" || !CRISP_WEBSITE_ID || document.getElementById("crisp-client")) return;
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  window.$crisp.push(["on", "chat:opened", () => window.$crisp?.push(["do", "bot:scenario:run", [CRISP_BOT_SCENARIO_ID]])]);
  const script = document.createElement("script");
  script.id = "crisp-client";
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  document.head.appendChild(script);
}

// Le gestionnaire de consentement effectue le rechargement après synchronisation de tous les services.
export function applyCrispConsent(status: ConsentStatus): boolean | void {
  if (status === "granted") {
    return loadCrisp();
  }

  return typeof document !== "undefined" && Boolean(document.getElementById("crisp-client"));
}
