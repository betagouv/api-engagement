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
  org: "betagouv",
  project: "api-engagement-widget",
  sentryUrl: process.env.SENTRY_HOST,
  environment: process.env.ENV,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: false,
    assets: ["**/*.js", "**/*.js.map"],
    ignore: ["**/node_modules/**"],
    deleteSourcemapsAfterUpload: true,
  },
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
