import { ENV } from "@/config";
import { AsyncTaskBus } from "@/services/async-task/bus";
import { LocalQueueProvider } from "@/services/async-task/providers/local";
import { ScalewayQueueProvider } from "@/services/async-task/providers/scaleway";

const provider = ENV === "development" ? new LocalQueueProvider(process.env.WORKER_URL ?? "http://localhost:4001") : new ScalewayQueueProvider();

export const asyncTaskBus = new AsyncTaskBus(provider);
