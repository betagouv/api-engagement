import { AsyncTaskBus } from "@/services/async-task/bus";
import { ScalewayQueueProvider } from "@/services/async-task/providers/scaleway";

export const asyncTaskBus = new AsyncTaskBus(new ScalewayQueueProvider());
