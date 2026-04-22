import "@gouvfr/dsfr/dist/dsfr.min.css";
import appleTouchIcon from "@gouvfr/dsfr/dist/favicon/apple-touch-icon.png?url";
import faviconIco from "@gouvfr/dsfr/dist/favicon/favicon.ico?url";
import faviconSvg from "@gouvfr/dsfr/dist/favicon/favicon.svg?url";
import webmanifest from "@gouvfr/dsfr/dist/favicon/manifest.webmanifest?url";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import Footer from "~/components/layout/footer";
import Header from "~/components/layout/header";
import "./main.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-fr-scheme="system" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link rel="icon" href={faviconSvg} type="image/svg+xml" />
        <link rel="shortcut icon" href={faviconIco} type="image/x-icon" />
        <link rel="manifest" href={webmanifest} crossOrigin="use-credentials" />
        <Meta />
        <Links />
      </head>
      <body className="tw:flex tw:flex-col tw:min-h-screen">
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
