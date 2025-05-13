import PlausibleProvider from "next-plausible";
import localFont from "next/font/local";

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

const MyApp = ({ Component, pageProps }) => {
  return (
    <main className={font.className}>
      <PlausibleProvider
        manualPageviews
        domain={process.env.NODE_ENV === "production" ? "mission.api-engagement.beta.gouv.fr" : "localhost:3001"}
        enabled={process.env.NODE_ENV === "production"}
        trackLocalhost={false}
        trackOutboundLinks
      >
        <Component {...pageProps} />
      </PlausibleProvider>
    </main>
  );
};

export default MyApp;
