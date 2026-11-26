import "@gouvfr/dsfr/dist/dsfr.main.min.css";
import DsfrPrintCss from "@gouvfr/dsfr/dist/dsfr.print.min.css?url";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import MarianneBold from "@gouvfr/dsfr/dist/fonts/Marianne-Bold.woff2?url";
import MarianneMedium from "@gouvfr/dsfr/dist/fonts/Marianne-Medium.woff2?url";
import MarianneRegular from "@gouvfr/dsfr/dist/fonts/Marianne-Regular.woff2?url";
import { type ReactNode } from "react";
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useLocation, useNavigation, useRouteLoaderData } from "react-router";
import CookieConsentManager from "~/components/layout/cookie-consent-manager";
import Footer, { FooterContent } from "~/components/layout/footer";
import Header from "~/components/layout/header";
import InternalUserFlagIndicator from "~/components/layout/internal-user-flag-indicator";
import SkipLinks from "~/components/layout/skip-links";
import { canonicalHostMiddleware } from "~/middlewares/canonical-host";
import { PUBLISHER_ID } from "~/services/config";
import { getCookieConsentPreferences } from "~/services/cookie-consent";
import { BETA_BANNER_SOURCES, isBetaBannerDismissed } from "~/utils/beta-banner";
import { serializeForInlineScript } from "~/utils/string";
import type { Route } from "./+types/root";
import "./main.css";

// Tag de tracking API Engagement (jstag.js) — doit être chargé en tête du <head>, avant tout autre script.
const apiEngagementTag = PUBLISHER_ID
  ? `(function(i,s,o,g,r,a,m){i["ApiEngagementObject"]=r;(i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments);}),(i[r].l=1*new Date());(a=s.createElement(o)),(m=s.getElementsByTagName(o)[0]);a.async=1;a.src=g;m.parentNode.insertBefore(a,m);})(window,document,"script","https://app.api-engagement.beta.gouv.fr/jstag.js","apieng");apieng("config",${serializeForInlineScript(PUBLISHER_ID)});`
  : null;

export const middleware: Route.MiddlewareFunction[] = [canonicalHostMiddleware];

// Bandeaux pilotés par cookie (consentement, bêta) : lus côté serveur pour les rendre dès le HTML initial. Affichés
// seulement après l'hydratation, ils retardaient l'affichage principal (LCP) et décalaient la page (CLS).
// On ne renvoie que l'état calculé : l'en-tête Cookie brut exposerait tous les cookies dans la page.
export function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  return {
    consentPreferences: getCookieConsentPreferences(cookieHeader),
    dismissedBetaBanners: BETA_BANNER_SOURCES.filter((source) => isBetaBannerDismissed(source, cookieHeader)),
  };
}

// Polices Marianne utilisées dès le premier écran : sans préchargement, le navigateur ne les découvre qu'après
// avoir lu le CSS, affiche d'abord la police de secours puis décale tout le texte à leur arrivée (CLS mobile).
// dsfr.main.min.css est le bundle DSFR sans la variante legacy (navigateurs anciens) ni les règles d'impression :
// celles-ci sont chargées à part en media="print" pour ne pas bloquer l'affichage à l'écran.
export const links: Route.LinksFunction = () => [
  { rel: "preload", href: MarianneRegular, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: MarianneMedium, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: MarianneBold, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: DsfrPrintCss, media: "print" },
];

// RGAA 8.5 : sert de titre aux pages d'erreur (404 notamment, où seule la route racine matche
// et où aucun autre meta() ne fournit de <title>) et de secours pour toute route sans meta().
export function meta({ error }: Route.MetaArgs): Route.MetaDescriptors {
  if (!error) return [{ title: "TrouveTaMission.gouv.fr" }];
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  return [{ title: isNotFound ? "Page introuvable | TrouveTaMission.gouv.fr" : "Une erreur est survenue | TrouveTaMission.gouv.fr" }];
}

// Outils internes (/_cms/…) affichés dans l'admin Strapi : sans header, footer ni bandeau cookies.
const isCmsTool = (pathname: string) => pathname.startsWith("/_cms/");

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Absent quand la route racine elle-même échoue : le bandeau cookies retombe alors sur la lecture après montage.
  const rootData = useRouteLoaderData<typeof loader>("root");

  return (
    <html lang="fr" data-fr-scheme="system" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {apiEngagementTag && <script dangerouslySetInnerHTML={{ __html: apiEngagementTag }} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="manifest" href="/site.webmanifest" crossOrigin="use-credentials" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        {!isCmsTool(pathname) && <SkipLinks />}
        {children}
        {!isCmsTool(pathname) && <CookieConsentManager initialPreferences={rootData?.consentPreferences ?? null} />}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const navigation = useNavigation();
  const { pathname } = useLocation();

  if (isCmsTool(pathname)) return <Outlet />;

  return (
    <>
      {/* Barre de chargement pendant qu'une navigation attend les données de la page suivante. */}
      {navigation.state === "loading" && (
        <div role="status" className="bg-blue-france-sun fixed inset-x-0 top-0 z-2000 h-1 animate-pulse">
          <span className="fr-sr-only">Chargement de la page…</span>
        </div>
      )}
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
