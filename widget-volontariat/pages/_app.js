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

const icomoon = localFont({
  src: "../fonts/icomoon.woff",
  weight: "normal",
  style: "normal",
  variable: "--font-icomoon",
});

const MyApp = ({ Component, pageProps }) => {
  return (
    <main className={`${font.className} ${icomoon.variable}`}>
      <Component {...pageProps} />
    </main>
  );
};

export default MyApp;
