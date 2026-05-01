import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
// Bundle JS DSFR (core + header/navigation/modal/switcher) — auto-enhance des éléments `fr-*` au hydratate.
import "@gouvfr/dsfr/dist/dsfr.module.min.js";

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
