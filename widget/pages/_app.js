import PlausibleProvider from "next-plausible";
import { useRouter } from "next/router";
import { isPreventionRoutieres } from "../utils/utils";
import "./global.css";

import { font, icomoon } from "../utils/fonts";

const MyApp = ({ Component, pageProps }) => {
  const router = useRouter();

  const domain = pageProps.domain;
  const preventionRoutieres = isPreventionRoutieres(router.query.widgetName || router.query.widget || "");

  return (
    <div className={`${font.className} ${icomoon.variable}`}>
      <PlausibleProvider manualPageviews domain={domain} enabled={process.env.NODE_ENV === "production" && !preventionRoutieres} trackLocalhost={false} trackOutboundLinks>
        <Component {...pageProps} />
      </PlausibleProvider>
    </div>
  );
};

export default MyApp;
