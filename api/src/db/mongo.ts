import mongoose from "mongoose";

import { DB_ENDPOINT } from "../config";

console.log("[MongoDB] Connecting to MongoDB...");
if (!DB_ENDPOINT) {
  throw new Error("[MongoDB] No MongoDB endpoint provided!");
}

let reconnectTries = 0;

// Create a promise that resolves when MongoDB is connected
export const mongoConnected = new Promise<void>((resolve) => {
  if (mongoose.connection.readyState === 1) {
    console.log("[MongoDB] Already connected");
    resolve();
  } else {
    mongoose.connection.once("open", () => {
      console.log("[MongoDB] Connected");
      resolve();
    });
  }
});

mongoose.connection.on("disconnected", () => {
  console.log("[MongoDB] Disconnected");
  // Try to reconnect every 5 seconds until successful or 5 tries have been made
  if (reconnectTries < 5) {
    setTimeout(() => {
      if (!DB_ENDPOINT) {
        throw new Error("[MongoDB] No MongoDB endpoint provided!");
      }

      mongoose.connect(DB_ENDPOINT, { maxPoolSize: 5000, tls: true, tlsInsecure: true });
      reconnectTries++;
    }, 5000);
  } else {
    throw new Error("[MongoDB] Unable to reconnect to MongoDB");
  }
});

mongoose.connect(DB_ENDPOINT, { maxPoolSize: 5000, tls: DB_ENDPOINT.includes("scw") ? true : false, tlsInsecure: true });
