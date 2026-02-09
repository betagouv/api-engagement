import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const start = Date.now();
  const response = NextResponse.next();

  event.waitUntil(
    Promise.resolve().then(() => {
      const log: Record<string, unknown> = {
        method: request.method,
        path: request.nextUrl.pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        status: response.status,
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
