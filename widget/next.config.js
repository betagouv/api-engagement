const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");
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
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

module.exports = withSentryConfig(withPlausibleProxy()(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sentry",
  project: "widget",
  sentryUrl: process.env.SENTRY_HOST,
  environment: process.env.ENV,

  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: false,
    assets: ["**/*.js", "**/*.js.map"],
    ignore: ["**/node_modules/**"],
    deleteSourcemapsAfterUpload: true,
  },

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
});
