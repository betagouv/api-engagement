// import { withSentryConfig } from "@sentry/nextjs";
// import { withPlausibleProxy } from "next-plausible";

const nextConfig = {
  reactStrictMode: false,
  // Only disable dev indicators when running tests
  devIndicators: process.env.NEXT_DEVTOOLS === "false" ? false : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// export default withSentryConfig(withPlausibleProxy()(nextConfig), {
export default nextConfig; // Temporarily export the raw config to debug ESM issue

// { // This was the start of the Sentry options object
//   // For all available options, see:
//   // https://github.com/getsentry/sentry-webpack-plugin#options
//   org: "sentry",
//   project: "api-engagement-production",
//   sentryUrl: process.env.SENTRY_HOST,
//   silent: !process.env.CI,
//   widenClientFileUpload: true,
//   reactComponentAnnotation: {
//     enabled: true,
//   },
//   tunnelRoute: "/monitoring",
//   hideSourceMaps: true,
//   disableLogger: true,
//   automaticVercelMonitors: true,
// } // This was the end of the Sentry options object
