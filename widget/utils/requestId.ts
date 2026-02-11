export const REQUEST_ID_HEADER = "x-request-id";

export const generateRequestId = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
