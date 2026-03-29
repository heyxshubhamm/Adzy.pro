import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

const PROTECTED = ["/dashboard", "/orders", "/gigs/create", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { exp, role } = jwtDecode<{ exp: number; role: string }>(token);

    // Layer 2: Automated Identity Rotation (Middleware Loop)
    if (exp * 1000 < Date.now()) {
      const refreshUrl = new URL("/api/silent-refresh", req.url);
      refreshUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(refreshUrl);
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/gigs/create", "/orders/:path*"] };
