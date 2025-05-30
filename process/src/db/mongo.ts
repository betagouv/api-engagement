import mongoose from "mongoose";

import { DB_ENDPOINT } from "../config";

console.log("Connecting to MongoDB...");
if (!DB_ENDPOINT) {
  throw new Error("No MongoDB endpoint provided!");
}

let reconnectTries = 0;

mongoose.connection.on("open", () => console.log("MongoDB connected"));
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
  // Try to reconnect every 5 seconds until successful or 5 tries have been made
  if (reconnectTries < 5) {
    setTimeout(() => {
      if (!DB_ENDPOINT) {
        throw new Error("No MongoDB endpoint provided!");
      }
      mongoose.connect(DB_ENDPOINT, { maxPoolSize: 5000 });
      reconnectTries++;
    }, 5000);
  } else {
    throw new Error("Unable to reconnect to MongoDB");
  }
});

mongoose.connect(DB_ENDPOINT, { maxPoolSize: 5000 });
