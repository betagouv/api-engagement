export const registerLifecycleHooks = (captureLifecycleError) => {
  process.on("uncaughtExceptionMonitor", (error, origin) => {
    captureLifecycleError("uncaught_exception", error, { origin });
  });

  process.on("unhandledRejection", (reason) => {
    captureLifecycleError("unhandled_rejection", reason);
  });
};
