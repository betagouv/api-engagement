import { createReadableStreamFromReadable } from "@react-router/node";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext, HandleErrorFunction } from "react-router";
import { isRouteErrorResponse, ServerRouter } from "react-router";
import { getRequestId, logServerError } from "~/services/sentry.server";
import { appendServerTiming } from "~/services/server-observability";

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (isRouteErrorResponse(error) && error.status < 500) return;
  // React Router encapsule certaines exceptions dans une ErrorResponse interne.
  const cause = isRouteErrorResponse(error) && "error" in error ? error.error : error;
  logServerError(request, "request_error", cause, { status: isRouteErrorResponse(error) ? error.status : 500 });
};

export default function handleRequest(request: Request, responseStatusCode: number, responseHeaders: Headers, routerContext: EntryContext) {
  const renderStartedAt = performance.now();

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onShellReady() {
        shellRendered = true;
        responseHeaders.set("Content-Type", "text/html");
        responseHeaders.set("x-request-id", getRequestId(request));
        appendServerTiming(responseHeaders, [{ name: "react-render", duration: performance.now() - renderStartedAt }]);

        const body = new PassThrough();
        const stream = createReadableStreamFromReadable(body);

        resolve(
          new Response(stream, {
            headers: responseHeaders,
            status: responseStatusCode,
          }),
        );

        pipe(body);
      },
      onShellError(error: unknown) {
        reject(error);
      },
      onError(error: unknown) {
        responseStatusCode = 500;
        // Après l'envoi des headers, le statut HTTP ne peut plus être modifié.
        // Le logger déduplique si handleError reçoit ensuite la même exception.
        logServerError(request, "ssr_stream_error", error, { status: shellRendered ? undefined : 500, headers_sent: shellRendered });
      },
    });
  });
}
