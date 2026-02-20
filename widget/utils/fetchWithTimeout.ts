import { SSR_API_TIMEOUT_MS } from "../config";

type FetchWithTimeoutOptions = {
  timeoutMs?: number;
  label?: string;
  requestId?: string;
};

export const fetchWithTimeout = async (
  url: string,
  options: FetchWithTimeoutOptions = {},
  init?: RequestInit,
) => {
  const timeoutMs = options.timeoutMs ?? SSR_API_TIMEOUT_MS;
  const label = options.label ?? "request";
  const requestId = options.requestId;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const duration = Date.now() - start;
    if (duration > timeoutMs * 0.8) {
      console.warn(`[widget][ssr] slow ${label}`, { url, status: response.status, duration, requestId });
    }
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    console.warn(`[widget][ssr] ${label} failed`, { url, duration, error: String(error), requestId });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
