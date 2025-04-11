import { useRouter } from "next/router";
import localFont from "next/font/local";
import PlausibleProvider from "next-plausible";

import "./global.css";

const font = localFont({
  src: [
    {
      path: "../fonts/Marianne-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Marianne-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Marianne-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

const icomoon = localFont({
  src: "../fonts/icomoon.woff",
  weight: "normal",
  style: "normal",
  variable: "--font-icomoon",
});

const slugify = (name) => {
  // remove all non-alphanumeric characters and all %C3%A9 and %C3%A8
  return name
    .replace(/%C3%A9/g, "-")
    .replace(/%C3%A8/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");
};

const isPreventionRoutieres = (query) => {
  if (query === "6449707ff9d59c624d4dc666") return true;
  const slug = query
    .replace(/%C3%A9/g, "-")
    .replace(/%C3%A8/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  return slug === "widget-pr-vention-routi-re";
};

const MyApp = ({ Component, pageProps }) => {
  const router = useRouter();

  const preventionRoutieres = isPreventionRoutieres(router.query.widgetName || router.query.widget || "");
  console.log("isPreventionRoutieres", router.query.widgetName, router.query.widget, preventionRoutieres);

  return (
    <main className={`${font.className} ${icomoon.variable}`}>
      <PlausibleProvider
        manualPageviews
        domain={process.env.NODE_ENV === "production" ? "sc.api-engagement.beta.gouv.fr" : "localhost:3001"}
        enabled={process.env.NODE_ENV === "production" && !preventionRoutieres}
        trackLocalhost={false}
        trackOutboundLinks
      >
        <Component {...pageProps} />
      </PlausibleProvider>
    </main>
  );
};

export default MyApp;
