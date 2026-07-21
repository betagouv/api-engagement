import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { isCookieConsentEnabled, prepareCookieConsent } from "~/services/cookie-consent";
import { initTracking } from "~/services/tracking";
// Bundle JS DSFR (core + header/navigation/modal/switcher) — auto-enhance des éléments `fr-*` au hydratate.
import "@gouvfr/dsfr/dist/dsfr.module.min.js";

// Le consentement mémorisé est synchronisé avant l'hydratation : les effets de routes peuvent
// ainsi capturer immédiatement dans le bon mode, sans file d'attente ni rattachement rétroactif.
if (isCookieConsentEnabled()) {
  prepareCookieConsent();
} else {
  initTracking();
}

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
