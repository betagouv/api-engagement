export type ServerTimingMetric = {
  name: string;
  duration: number;
};

const formatDuration = (duration: number) => Math.max(0, duration).toFixed(1);

export const formatServerTiming = (metrics: ServerTimingMetric[]): string => {
  return metrics.map(({ name, duration }) => `${name};dur=${formatDuration(duration)}`).join(", ");
};

export const appendServerTiming = (headers: Headers, metrics: ServerTimingMetric[]) => {
  if (metrics.length === 0) return;
  const value = formatServerTiming(metrics);
  const existing = headers.get("Server-Timing");
  headers.set("Server-Timing", existing ? `${existing}, ${value}` : value);
};
