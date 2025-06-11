const { withSentryConfig } = require("@sentry/nextjs");
{
}
const { withPlausibleProxy } = require("next-plausible");

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

module.exports = withSentryConfig(withPlausibleProxy()(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  org: "sentry",
  project: "api-engagement-production",
  sentryUrl: process.env.SENTRY_HOST,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
