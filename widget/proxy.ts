import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { REQUEST_ID_HEADER } from "./utils/requestId";

const ALLOWED_PATHS = /^\/(api\/healthz|proxy\/api\/event|js\/script\..+|robots\.txt)?$/;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname;

  if (!ALLOWED_PATHS.test(path)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const start = Date.now();
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);

  event.waitUntil(
    Promise.resolve().then(() => {
      const log: Record<string, unknown> = {
        level: "info",
        method: request.method,
        path: request.nextUrl.pathname,
        route_type: "middleware",
        request_id: requestId,
        query: Object.fromEntries(request.nextUrl.searchParams),
        "response-time": Date.now() - start,
      };

      console.log(JSON.stringify(log));
    }),
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
