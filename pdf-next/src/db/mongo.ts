import mongoose from "mongoose";

import { DB_ENDPOINT } from "../services/config";

console.log("Connecting to MongoDB...");
if (!DB_ENDPOINT) throw new Error("No MongoDB endpoint provided!");

mongoose.connection.on("open", () => console.log("MongoDB connected"));

mongoose.connect(DB_ENDPOINT, { maxPoolSize: 5000 });
