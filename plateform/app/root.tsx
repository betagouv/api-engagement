import "@codegouvfr/react-dsfr/main.css";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import Footer from "~/components/layout/footer";
import Header from "~/components/layout/header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
