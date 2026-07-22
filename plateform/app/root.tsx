import "@gouvfr/dsfr/dist/dsfr.min.css";
import appleTouchIcon from "@gouvfr/dsfr/dist/favicon/apple-touch-icon.png?url";
import faviconIco from "@gouvfr/dsfr/dist/favicon/favicon.ico?url";
import faviconSvg from "@gouvfr/dsfr/dist/favicon/favicon.svg?url";
import webmanifest from "@gouvfr/dsfr/dist/favicon/manifest.webmanifest?url";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import { type ReactNode, useEffect } from "react";
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from "react-router";
import CookieConsentManager from "~/components/layout/cookie-consent-manager";
import Footer, { FooterContent } from "~/components/layout/footer";
import Header from "~/components/layout/header";
import InternalUserFlagIndicator from "~/components/layout/internal-user-flag-indicator";
import SkipLinks from "~/components/layout/skip-links";
import { PUBLISHER_ID } from "~/services/config";
import { initializeDsfr } from "~/services/dsfr";
import { serializeForInlineScript } from "~/utils/string";
import type { Route } from "./+types/root";
import "./main.css";

// Tag de tracking API Engagement (jstag.js) — doit être chargé en tête du <head>, avant tout autre script.
const apiEngagementTag = PUBLISHER_ID
  ? `(function(i,s,o,g,r,a,m){i["ApiEngagementObject"]=r;(i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments);}),(i[r].l=1*new Date());(a=s.createElement(o)),(m=s.getElementsByTagName(o)[0]);a.async=1;a.src=g;m.parentNode.insertBefore(a,m);})(window,document,"script","https://app.api-engagement.beta.gouv.fr/jstag.js","apieng");apieng("config",${serializeForInlineScript(PUBLISHER_ID)});`
  : null;

// Le DSFR enrichit le DOM (modales, navigation, etc.). Le charger dans un effet évite qu'il
// modifie le HTML SSR avant que React ait terminé son hydratation.
function DsfrClientInitializer() {
  useEffect(() => {
    void initializeDsfr();
  }, []);

  return null;
}

// RGAA 8.5 : sert de titre aux pages d'erreur (404 notamment, où seule la route racine matche
// et où aucun autre meta() ne fournit de <title>) et de secours pour toute route sans meta().
export function meta({ error }: Route.MetaArgs): Route.MetaDescriptors {
  if (!error) return [{ title: "Trouve ta mission" }];
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  return [{ title: isNotFound ? "Page introuvable — Trouve ta mission" : "Une erreur est survenue — Trouve ta mission" }];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" data-fr-scheme="system" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {apiEngagementTag && <script dangerouslySetInnerHTML={{ __html: apiEngagementTag }} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link rel="icon" href={faviconSvg} type="image/svg+xml" />
        <link rel="shortcut icon" href={faviconIco} type="image/x-icon" />
        <link rel="manifest" href={webmanifest} crossOrigin="use-credentials" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <DsfrClientInitializer />
        <SkipLinks />
        {children}
        <CookieConsentManager />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <InternalUserFlagIndicator />
    </>
  );
}

// Rendu à la place de l'Outlet quand une route échoue (avant rendu) ou pour une URL inconnue
// (404). On fournit ici les cibles des liens d'évitement (`#contenu`, `#footer`), absentes de
// l'UI d'erreur par défaut de React Router, pour que le SkipLinks du layout reste fonctionnel.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const title = isNotFound ? "Page introuvable" : "Une erreur est survenue";
  const description = isNotFound ? "La page que tu cherches n'existe pas ou a été déplacée." : "Une erreur inattendue s'est produite. Réessaie plus tard.";

  return (
    <>
      <Header />
      <main id="contenu" tabIndex={-1} className="fr-container flex-1 py-16">
        <h1>{title}</h1>
        <p className="fr-text--lead">{description}</p>
        <Link to="/" className="fr-btn">
          Retour à l'accueil
        </Link>
      </main>
      <FooterContent />
    </>
  );
}
