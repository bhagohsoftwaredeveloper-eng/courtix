import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-routes";

/**
 * A cheap gate, not the security control.
 *
 * Middleware runs on the Edge runtime, where Prisma cannot reach MySQL — so
 * this only checks that a session cookie is present. Anyone can forge that
 * cookie; the gate in each protected layout — requireUser(),
 * requirePlatformRole() or requireOwner() — does the real check against the
 * database and rejects them there.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/owner/:path*", "/admin/:path*", "/account/:path*"],
};
