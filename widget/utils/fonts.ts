import localFont from "next/font/local";

export const font = localFont({
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

export const icomoon = localFont({
  src: [
    {
      path: "../fonts/icomoon.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-icomoon",
});
