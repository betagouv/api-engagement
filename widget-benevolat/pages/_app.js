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
  return (
    <main className={font.className}>
      <PlausibleProvider domain="mission.api-engagement.beta.gouv.fr">
        <Component {...pageProps} />
      </PlausibleProvider>
    </main>
  );
};

export default MyApp;
