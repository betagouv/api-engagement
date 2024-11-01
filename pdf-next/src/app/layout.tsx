import "./globals.css";

import localFont from "next/font/local";

const marianne = localFont({
  src: [
    {
      path: "./fonts/Marianne-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Marianne-Regular_Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/Marianne-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Marianne-Bold_Italic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-marianne",
});

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="fr" className={marianne.className}>
      <body className="w-[1360px] bg-[#F6F6F6]">{children}</body>
    </html>
  );
};

export default RootLayout;
