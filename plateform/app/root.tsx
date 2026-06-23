import "@gouvfr/dsfr/dist/dsfr.min.css";
import appleTouchIcon from "@gouvfr/dsfr/dist/favicon/apple-touch-icon.png?url";
import faviconIco from "@gouvfr/dsfr/dist/favicon/favicon.ico?url";
import faviconSvg from "@gouvfr/dsfr/dist/favicon/favicon.svg?url";
import webmanifest from "@gouvfr/dsfr/dist/favicon/manifest.webmanifest?url";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import { type ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import Footer from "~/components/layout/footer";
import Header from "~/components/layout/header";
import { PUBLISHER_ID } from "~/services/config";
import { serializeForInlineScript } from "~/utils/string";
import "./main.css";

// Tag de tracking API Engagement (jstag.js) — doit être chargé en tête du <head>, avant tout autre script.
const apiEngagementTag = PUBLISHER_ID
  ? `(function(i,s,o,g,r,a,m){i["ApiEngagementObject"]=r;(i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments);}),(i[r].l=1*new Date());(a=s.createElement(o)),(m=s.getElementsByTagName(o)[0]);a.async=1;a.src=g;m.parentNode.insertBefore(a,m);})(window,document,"script","https://app.api-engagement.beta.gouv.fr/jstag.js","apieng");apieng("config",${serializeForInlineScript(PUBLISHER_ID)});`
  : null;

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
        {children}
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
    </>
  );
}
