import * as Sentry from "@sentry/react";
import { toast } from "react-toastify";
import { ENV } from "./config";

export const captureError = (error, message, toastOptions = {}) => {
  console.log("error", JSON.stringify(error, null, 2));

  if (error && error.status === 401) {
    console.log("Deconnexion");
  } else {
    toast.error(message, toastOptions);
    if (ENV !== "development") {
      // check if error is an Object
      if (typeof error === "object") {
        console.error(JSON.stringify(error, null, 2));
        Sentry.captureException(new Error(message));
      } else {
        Sentry.captureException(error);
      }
    } else console.error(error);
  }
};
