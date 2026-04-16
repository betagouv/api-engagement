import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { Link } from "react-router";
import { HydratedRouter } from "react-router/dom";

// Initialise DSFR côté client (thème, icônes, accessibilité)
startReactDsfr({ defaultColorScheme: "system", Link });

//Only in TypeScript projects
declare module "@codegouvfr/react-dsfr/spa" {
  interface RegisterLink {
    Link: typeof Link;
  }
}
// StrictMode retiré : en React 19, le cycle démontage/remontage de Strict Mode
// coupe temporairement le framework context de React Router pendant les re-renders
// schedulés par DSFR (useRerenderOnChange), ce qui fait planter useFrameworkContext dans <Meta />.
startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
});
