import { createReadableStreamFromReadable } from "@react-router/node";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { appendServerTiming, getOrCreateRequestId, REQUEST_ID_HEADER } from "~/services/server-observability";

export default function handleRequest(request: Request, responseStatusCode: number, responseHeaders: Headers, routerContext: EntryContext) {
  const renderStartedAt = performance.now();
  const requestId = getOrCreateRequestId(request);

  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onShellReady() {
        responseHeaders.set("Content-Type", "text/html");
        responseHeaders.set(REQUEST_ID_HEADER, requestId);
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
    });
  });
}
