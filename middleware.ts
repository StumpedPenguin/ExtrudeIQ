import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  try {
    // Always start with a passthrough response
    let response = NextResponse.next({ request });
    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // Always return a response to prevent MIDDLEWARE_INVOCATION_FAILED
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // run middleware on all routes except Next internals/static
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
