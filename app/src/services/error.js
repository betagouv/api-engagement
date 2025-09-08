import * as Sentry from "@sentry/react";
import { toast } from "react-toastify";
import { ENV } from "./config";

export const captureError = (error, message, toastOptions = {}) => {
  console.log("[Sentry] Error", JSON.stringify(error, null, 2));

  if (error && error.status === 401) {
    console.log("[Sentry] Deconnexion");
    return;
  }
  toast.error(message, toastOptions);
  if (error && error.status && [404, 403].includes(error.status)) {
    if (ENV !== "development") {
      Sentry.captureMessage(message);
      return;
    }
    console.log("[Sentry] Message", message);
    return;
  }

  if (ENV !== "development") {
    // check if error is an Object
    if (typeof error === "object") {
      console.error(JSON.stringify(error, null, 2));
      Sentry.captureException(new Error(message));
      return;
    }
    Sentry.captureException(error);
    return;
  }
  console.error(error);
};
