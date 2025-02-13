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

const MyApp = ({ Component, pageProps }) => {
  const domain = process.env.NODE_ENV === "production" ? "mission.api-engagement.beta.gouv.fr" : "localhost:3001";

  console.log("process.env.NODE_ENV", process.env.NODE_ENV);
  console.log("domain", domain);
  return (
    <main className={font.className}>
      <PlausibleProvider domain={domain} enabled={domain.indexOf("localhost") !== -1 || undefined} trackLocalhost={domain.indexOf("localhost") !== -1} trackOutboundLinks>
        <Component {...pageProps} />
      </PlausibleProvider>
    </main>
  );
};

export default MyApp;
