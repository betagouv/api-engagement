export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type ServerTimingMetric = {
  name: string;
  duration: number;
};

export const getOrCreateRequestId = (request: Request): string => {
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)) return incomingRequestId;
  return crypto.randomUUID();
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
